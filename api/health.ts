import { getGeminiClient } from './_parseLogCore.js';

interface VercelRequestLike {
  method?: string;
}

interface VercelResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponseLike;
  json(payload: unknown): void;
}

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(getGeminiClient()),
  });
}
