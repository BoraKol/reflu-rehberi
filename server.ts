import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_SYMPTOM_CODES = [
  'HEARTBURN',
  'REGURGITATION',
  'UPPER_ABDOMINAL_PAIN',
  'NAUSEA',
  'NIGHT_SLEEP_DISRUPTION',
  'HOARSENESS',
  'THROAT_CLEARING',
  'EXCESS_THROAT_MUCUS',
  'POST_MEAL_COUGH',
  'PERSISTENT_COUGH',
  'GLOBUS_LUMP',
  'THROAT_IRRITATION',
] as const;

const ALLOWED_SYMPTOM_SET = new Set<string>(ALLOWED_SYMPTOM_CODES);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_BASE64_LENGTH = 5_500_000;
const MAX_TEXT_LENGTH = 2000;
const GEMINI_TIMEOUT_MS = 25_000;

/**
 * Explicit allowlist of origins permitted to call `/api/parse-log`.
 * Combines `APP_URL` and comma-separated `ALLOWED_ORIGINS` when configured.
 */
const CONFIGURED_ALLOWED_ORIGINS: ReadonlySet<string> = (() => {
  const origins = new Set<string>();
  const rawList = [
    process.env.APP_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  ];
  for (const raw of rawList) {
    const trimmed = raw?.trim();
    if (!trimmed || trimmed === 'MY_APP_URL') continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      // Ignore malformed env values
    }
  }
  return origins;
})();

function isAllowedOrigin(originHeader: string | undefined, req: Request): boolean {
  if (!originHeader) return !IS_PROD;
  try {
    const origin = new URL(originHeader).origin;
    if (CONFIGURED_ALLOWED_ORIGINS.has(origin)) return true;

    const host = req.get('host');
    if (host) {
      const proto = req.protocol || 'http';
      if (origin === `${proto}://${host}` || origin === `https://${host}`) {
        return true;
      }
    }
    if (!IS_PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Guards `/api/parse-log` against cross-origin quota abuse & simple CSRF POSTs.
 */
function enforceSameOriginAndJson(req: Request, res: Response, next: NextFunction) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      error: 'İstek yalnızca application/json biçiminde kabul edilir.',
    });
  }

  const originOrReferer = req.get('origin') ?? req.get('referer');
  if (!isAllowedOrigin(originOrReferer, req)) {
    return res.status(403).json({
      code: 'FORBIDDEN_ORIGIN',
      error: 'Bu kaynağa yalnızca uygulama içerisinden erişilebilir.',
    });
  }

  return next();
}

const PARSER_SYSTEM_INSTRUCTION =
  'You are a structured data extraction parser ONLY. Never provide medical advice, diagnoses, treatment suggestions, or food safety judgments. Only extract mentioned foods, times, and map user-described symptoms strictly to the allowed enum values. Do not invent foods, symptoms, or pH numbers that are not explicitly mentioned or clearly visible in the meal image. Always return Turkish food names in clean lowercase/title form.';

const PARSER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    foods: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'List of foods or beverages mentioned in the text or visibly present in the meal photo, in Turkish.',
    },
    timeHHMM: {
      type: Type.STRING,
      nullable: true,
      description:
        '24-hour HH:MM time if explicitly mentioned (e.g. "21:30", "08:00"), otherwise null.',
    },
    isMealPhoto: {
      type: Type.BOOLEAN,
      description:
        'True if an image was provided and food items were extracted from it.',
    },
    symptoms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: {
            type: Type.STRING,
            enum: [...ALLOWED_SYMPTOM_CODES],
            description:
              'Allowed symptom code strictly matching user-described symptom.',
          },
          severity: {
            type: Type.INTEGER,
            description:
              'Estimated severity from 1 (hafif) to 5 (şiddetli). Default 3 if unspecified.',
          },
        },
        required: ['code', 'severity'],
      },
      description:
        'Explicitly mentioned reflux or throat symptoms mapped strictly to allowed enum values.',
    },
    notesSummary: {
      type: Type.STRING,
      description:
        'Short factual echo of context (e.g. "Yemek sonrası uzanma") without any advice or judgment.',
    },
  },
  required: ['foods', 'symptoms', 'notesSummary'],
};

/** Singleton Gemini client (avoids per-request SDK allocations). */
const geminiClient: GoogleGenAI | null = (() => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
})();

/**
 * Verifies the actual magic bytes of a base64-encoded image header so a client
 * cannot spoof the declared MIME type with arbitrary/malicious payloads.
 */
function hasValidImageMagicBytes(base64: string, mimeType: string): boolean {
  try {
    const header = Buffer.from(base64.slice(0, 24), 'base64');
    if (header.length < 12) return false;
    if (mimeType === 'image/jpeg') {
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      );
    }
    if (mimeType === 'image/webp') {
      return (
        header.toString('ascii', 0, 4) === 'RIFF' &&
        header.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Bounded in-memory sliding-window rate limiter for `/api/parse-log`.
 * Protects Gemini API quota against abuse while capping map size in memory.
 */
function createRateLimiter(maxRequests: number, windowMs: number) {
  const MAX_TRACKED_KEYS = 2000;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const prune = (now: number) => {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k);
    }
    if (buckets.size > MAX_TRACKED_KEYS) {
      buckets.clear();
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (buckets.size > MAX_TRACKED_KEYS / 2) prune(now);

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(ip);

    if (!current || now >= current.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        code: 'RATE_LIMITED',
        error: 'Çok fazla ayrıştırma isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin.',
      });
    }

    current.count += 1;
    return next();
  };
}

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  // Allow Google OAuth popup window.closed communication
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function sanitizeParsedOutput(parsed: Record<string, unknown>) {
  const safeFoods: string[] = Array.isArray(parsed.foods)
    ? parsed.foods
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 80))
        .slice(0, 15)
    : [];

  const safeSymptoms = Array.isArray(parsed.symptoms)
    ? parsed.symptoms
        .filter(
          (s): s is { code: string; severity: number } =>
            typeof s === 'object' &&
            s !== null &&
            typeof (s as { code?: unknown }).code === 'string' &&
            ALLOWED_SYMPTOM_SET.has((s as { code: string }).code)
        )
        .map((s) => ({
          code: s.code,
          severity: Math.min(5, Math.max(1, Math.round(Number(s.severity) || 3))),
        }))
        .slice(0, 10)
    : [];

  const safeTime =
    typeof parsed.timeHHMM === 'string' && HHMM_REGEX.test(parsed.timeHHMM)
      ? parsed.timeHHMM
      : null;

  return {
    source: 'gemini' as const,
    foods: safeFoods,
    timeHHMM: safeTime,
    symptoms: safeSymptoms,
    notesSummary: typeof parsed.notesSummary === 'string' ? parsed.notesSummary.slice(0, 200) : '',
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: '6mb' }));

  const parseLogLimiter = createRateLimiter(20, 60_000);

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, geminiConfigured: Boolean(geminiClient) });
  });

  app.post('/api/parse-log', enforceSameOriginAndJson, parseLogLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { text, imageBase64, imageMimeType } = req.body ?? {};
      const cleanText =
        typeof text === 'string' ? text.trim().slice(0, MAX_TEXT_LENGTH) : '';
      const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;

      if (!cleanText && !hasImage) {
        return res
          .status(400)
          .json({ error: 'Lütfen bir metin yazın veya öğün fotoğrafı ekleyin.' });
      }

      if (hasImage) {
        if (typeof imageMimeType !== 'string' || !ALLOWED_IMAGE_MIMES.has(imageMimeType)) {
          return res.status(400).json({
            error: 'Desteklenmeyen görsel formatı. JPEG, PNG veya WebP kullanın.',
          });
        }
        if (imageBase64.length > MAX_BASE64_LENGTH) {
          return res.status(400).json({
            error: 'Fotoğraf boyutu çok büyük. Lütfen 4 MB altında bir görsel seçin.',
          });
        }
        if (!hasValidImageMagicBytes(imageBase64, imageMimeType)) {
          return res.status(400).json({
            error: 'Görsel içeriği seçilen dosya biçimiyle eşleşmiyor.',
          });
        }
      }

      if (!geminiClient) {
        return res.status(503).json({
          code: 'GEMINI_NOT_CONFIGURED',
          error:
            'Yapay zeka ayrıştırıcı anahtarı yapılandırılmamış; çevrimdışı yerel ayrıştırıcı kullanılabilir.',
        });
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];
      if (hasImage) {
        parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
      }
      parts.push({
        text: cleanText
          ? `Kullanıcı kaydı: "${cleanText}"\nSadece geçen besinleri, saati ve izin verilen listedeki belirtileri çıkar.`
          : 'Fotoğrafta açıkça görünen besin ve içecekleri Türkçe olarak listele. Hiçbir tıbbi yorum veya öneri yapma.',
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), GEMINI_TIMEOUT_MS)
      );

      const response = await Promise.race([
        geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts },
          config: {
            systemInstruction: PARSER_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PARSER_RESPONSE_SCHEMA,
          },
        }),
        timeoutPromise,
      ]);

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      return res.json(sanitizeParsedOutput(parsed));
    } catch (err) {
      if (!IS_PROD) {
        console.error('[parse-log] error:', err instanceof Error ? err.message : err);
      }
      const isTimeout = err instanceof Error && err.message === 'timeout';
      return res.status(isTimeout ? 504 : 502).json({
        code: isTimeout ? 'GEMINI_TIMEOUT' : 'GEMINI_UPSTREAM_ERROR',
        error: isTimeout
          ? 'Ayrıştırma servisi zaman aşımına uğradı.'
          : 'Ayrıştırma servisi şu an yanıt vermedi.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflüRehber sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer();
