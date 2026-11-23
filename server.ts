import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkRateLimit,
  executeParseLog,
  getGeminiClient,
  isAllowedOrigin,
  isProductionEnv,
} from './api/_parseLogCore';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_PROD = isProductionEnv();

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

function enforceSameOriginAndJson(req: Request, res: Response, next: NextFunction) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      error: 'İstek yalnızca application/json biçiminde kabul edilir.',
    });
  }

  const originOrReferer = req.get('origin') ?? req.get('referer');
  if (!isAllowedOrigin(originOrReferer, req.get('host'), req.protocol || 'http')) {
    return res.status(403).json({
      code: 'FORBIDDEN_ORIGIN',
      error: 'Bu kaynağa yalnızca uygulama içerisinden erişilebilir.',
    });
  }

  return next();
}

function parseLogRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(ip, 20, 60_000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({
      code: 'RATE_LIMITED',
      error: 'Çok fazla ayrıştırma isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin.',
    });
  }
  return next();
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, geminiConfigured: Boolean(getGeminiClient()) });
  });

  app.post('/api/parse-log', enforceSameOriginAndJson, parseLogRateLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const result = await executeParseLog(req.body);
    return res.status(result.status).json(result.body);
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
