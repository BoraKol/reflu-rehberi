import {
  checkRateLimit,
  executeParseLog,
  isAllowedOrigin,
} from './_parseLogCore';

interface VercelRequestLike {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

interface VercelResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponseLike;
  json(payload: unknown): void;
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const val = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(val) ? val[0] : val;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Yalnızca POST isteği desteklenir.' });
  }

  const contentType = getHeader(req.headers, 'content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return res.status(415).json({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      error: 'İstek yalnızca application/json biçiminde kabul edilir.',
    });
  }

  const originOrReferer =
    getHeader(req.headers, 'origin') ?? getHeader(req.headers, 'referer');
  const host = getHeader(req.headers, 'x-forwarded-host') ?? getHeader(req.headers, 'host');
  const proto = getHeader(req.headers, 'x-forwarded-proto') ?? 'https';

  if (!isAllowedOrigin(originOrReferer, host, proto)) {
    return res.status(403).json({
      code: 'FORBIDDEN_ORIGIN',
      error: 'Bu kaynağa yalnızca uygulama içerisinden erişilebilir.',
    });
  }

  const forwarded = getHeader(req.headers, 'x-forwarded-for');
  const clientIp =
    forwarded?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rate = checkRateLimit(clientIp, 20, 60_000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({
      code: 'RATE_LIMITED',
      error: 'Çok fazla ayrıştırma isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin.',
    });
  }

  const result = await executeParseLog(req.body);
  return res.status(result.status).json(result.body);
}
