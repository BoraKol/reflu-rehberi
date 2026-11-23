import { GoogleGenAI, Type } from '@google/genai';

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

let cachedClient: GoogleGenAI | null | undefined;

export function getGeminiClient(): GoogleGenAI | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    cachedClient = null;
    return null;
  }
  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'reflurehber-parser' } },
  });
  return cachedClient;
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

/**
 * Verifies actual magic bytes of a base64-encoded image header so a client
 * cannot spoof the declared MIME type with arbitrary payloads.
 */
export function hasValidImageMagicBytes(base64: string, mimeType: string): boolean {
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

function getConfiguredAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const rawList = [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
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
}

export function isAllowedOrigin(
  originHeader: string | undefined,
  hostHeader: string | undefined,
  protocol = 'https'
): boolean {
  const isProd = isProductionEnv();
  if (!originHeader) return !isProd;

  try {
    const origin = new URL(originHeader).origin;
    if (getConfiguredAllowedOrigins().has(origin)) return true;

    if (hostHeader) {
      if (origin === `${protocol}://${hostHeader}` || origin === `https://${hostHeader}`) {
        return true;
      }
    }
    if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Bounded sliding-window in-memory rate limiter (shared across Express & Vercel warm instances). */
const MAX_TRACKED_KEYS = 2000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  if (rateBuckets.size > MAX_TRACKED_KEYS / 2) {
    for (const [k, v] of rateBuckets) {
      if (now >= v.resetAt) rateBuckets.delete(k);
    }
    if (rateBuckets.size > MAX_TRACKED_KEYS) rateBuckets.clear();
  }

  const current = rateBuckets.get(ip);
  if (!current || now >= current.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
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
    notesSummary:
      typeof parsed.notesSummary === 'string' ? parsed.notesSummary.slice(0, 200) : '',
  };
}

export interface ParseLogResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Pure request processor shared by local Express (`server.ts`) and
 * Vercel Serverless Function (`api/parse-log.ts`).
 */
export async function executeParseLog(rawBody: unknown): Promise<ParseLogResult> {
  try {
    const body =
      typeof rawBody === 'string'
        ? (JSON.parse(rawBody) as Record<string, unknown>)
        : ((rawBody ?? {}) as Record<string, unknown>);

    const { text, imageBase64, imageMimeType } = body;
    const cleanText =
      typeof text === 'string' ? text.trim().slice(0, MAX_TEXT_LENGTH) : '';
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;

    if (!cleanText && !hasImage) {
      return {
        status: 400,
        body: { error: 'Lütfen bir metin yazın veya öğün fotoğrafı ekleyin.' },
      };
    }

    if (hasImage) {
      if (typeof imageMimeType !== 'string' || !ALLOWED_IMAGE_MIMES.has(imageMimeType)) {
        return {
          status: 400,
          body: {
            error: 'Desteklenmeyen görsel formatı. JPEG, PNG veya WebP kullanın.',
          },
        };
      }
      if (imageBase64.length > MAX_BASE64_LENGTH) {
        return {
          status: 400,
          body: {
            error: 'Fotoğraf boyutu çok büyük. Lütfen 4 MB altında bir görsel seçin.',
          },
        };
      }
      if (!hasValidImageMagicBytes(imageBase64, imageMimeType)) {
        return {
          status: 400,
          body: { error: 'Görsel içeriği seçilen dosya biçimiyle eşleşmiyor.' },
        };
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: {
          code: 'GEMINI_NOT_CONFIGURED',
          error:
            'Yapay zeka ayrıştırıcı anahtarı yapılandırılmamış; çevrimdışı yerel ayrıştırıcı kullanılabilir.',
        },
      };
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
      [];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType as string,
          data: imageBase64 as string,
        },
      });
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
      ai.models.generateContent({
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
    return { status: 200, body: sanitizeParsedOutput(parsed) };
  } catch (err) {
    if (!isProductionEnv()) {
      console.error('[parse-log] error:', err instanceof Error ? err.message : err);
    }
    const isTimeout = err instanceof Error && err.message === 'timeout';
    return {
      status: isTimeout ? 504 : 502,
      body: {
        code: isTimeout ? 'GEMINI_TIMEOUT' : 'GEMINI_UPSTREAM_ERROR',
        error: isTimeout
          ? 'Ayrıştırma servisi zaman aşımına uğradı.'
          : 'Ayrıştırma servisi şu an yanıt vermedi.',
      },
    };
  }
}
