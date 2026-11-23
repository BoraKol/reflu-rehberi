import { detectRedFlags } from '../engine/redFlagGuard';
import { matchFoodItem, parseTextOfflineFallback } from '../engine/triggerEngine';
import { clampSeverity } from '../lib/number';
import { isValidHHMM } from '../lib/time';
import type {
  LoggedFoodItem,
  LoggedSymptom,
  RedFlagDetectionResult,
  SymptomCode,
} from '../types/reflux';

export interface ParsedDraftResult {
  source: 'gemini' | 'manual';
  fallbackNotice?: string;
  foods: LoggedFoodItem[];
  timeHHMM: string | null;
  symptoms: LoggedSymptom[];
  notesSummary: string;
  redFlag: RedFlagDetectionResult;
}

const PARSE_ENDPOINT = '/api/parse-log';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_TEXT_LENGTH = 2000;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
/** Longest edge after client-side downscaling (saves bandwidth, memory and tokens). */
const MAX_IMAGE_EDGE_PX = 1280;

const FALLBACK_NOTICES = {
  notConfigured:
    'Yapay zeka ayrıştırıcı şu an bağlı değil; kaydınız çevrimdışı yerel sözlükle ayrıştırıldı. Aşağıdan düzenleyebilirsiniz.',
  unreachable: 'Ayrıştırma servisine ulaşılamadı; çevrimdışı yerel ayrıştırıcı kullanıldı.',
  network:
    'Ağ bağlantısı kurulamadı; metniniz çevrimdışı yerel eşleştirme ile ayrıştırıldı. Aşağıdaki etiketleri kontrol edebilirsiniz.',
} as const;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Görsel yüklenirken hata oluştu.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscales large photos to MAX_IMAGE_EDGE_PX as JPEG. Phone cameras produce
 * 4–12 MB images; sending them raw wastes memory, bandwidth and API quota.
 * Falls back to the original file whenever the browser lacks support.
 */
async function downscaleImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    );
    canvas.width = canvas.height = 0; // release backing store early
    return blob ?? file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error('Desteklenmeyen görsel formatı. JPEG, PNG veya WebP kullanın.');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Fotoğraf boyutu çok büyük.');
  }
  const blob = await downscaleImage(file);
  const result = await readAsDataUrl(blob);
  const commaIdx = result.indexOf(',');
  if (commaIdx === -1) throw new Error('Görsel okunamadı.');
  return {
    base64: result.slice(commaIdx + 1),
    mimeType: blob.type && ALLOWED_IMAGE_MIMES.has(blob.type) ? blob.type : file.type,
  };
}

/** DRY: single place that builds the deterministic offline draft. */
function buildOfflineDraft(
  text: string,
  redFlag: RedFlagDetectionResult,
  fallbackNotice?: string
): ParsedDraftResult {
  const offline = parseTextOfflineFallback(text);
  return {
    source: 'manual',
    fallbackNotice,
    foods: offline.foods.map(matchFoodItem),
    timeHHMM: offline.timeHHMM,
    symptoms: offline.symptoms,
    notesSummary: offline.notesSummary,
    redFlag,
  };
}

interface ParseApiResponse {
  foods?: unknown;
  timeHHMM?: unknown;
  symptoms?: unknown;
  notesSummary?: unknown;
  code?: string;
  error?: string;
}

function mapApiResponse(data: ParseApiResponse, redFlag: RedFlagDetectionResult): ParsedDraftResult {
  const rawFoods = Array.isArray(data.foods) ? data.foods : [];
  const rawSymptoms = Array.isArray(data.symptoms) ? data.symptoms : [];
  return {
    source: 'gemini',
    foods: rawFoods.map((f) => matchFoodItem(String(f))),
    timeHHMM: isValidHHMM(data.timeHHMM) ? data.timeHHMM : null,
    symptoms: rawSymptoms.map((s: { code: SymptomCode; severity: unknown }) => ({
      code: s.code,
      severity: clampSeverity(s.severity),
    })),
    notesSummary: typeof data.notesSummary === 'string' ? data.notesSummary : '',
    redFlag,
  };
}

/**
 * Natural-language & meal photo parser client.
 * Delegates to server-side `/api/parse-log` (pure JSON extractor), runs the
 * deterministic Red Flag Guardrail first, matches foods strictly against
 * FOOD_DATABASE and transparently falls back to the offline Turkish parser.
 */
export async function parseNaturalLanguageEntry(params: {
  text: string;
  imageFile?: File | null;
  forceOffline?: boolean;
  signal?: AbortSignal;
}): Promise<ParsedDraftResult> {
  const trimmedText = params.text.trim().slice(0, MAX_TEXT_LENGTH);
  // Step 1: deterministic Red Flag Guardrail ALWAYS runs first on raw text
  const redFlag = detectRedFlags(trimmedText);

  if (params.forceOffline || (!params.imageFile && trimmedText.length === 0)) {
    return buildOfflineDraft(trimmedText, redFlag);
  }

  const imagePayload = params.imageFile
    ? await fileToBase64(params.imageFile).then(({ base64, mimeType }) => ({
        imageBase64: base64,
        imageMimeType: mimeType,
      }))
    : {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  params.signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(PARSE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ text: trimmedText, ...imagePayload }),
      signal: controller.signal,
    });

    const data: ParseApiResponse = await response.json().catch(() => ({}));
    if (!response.ok) {
      const notice =
        data.code === 'GEMINI_NOT_CONFIGURED'
          ? FALLBACK_NOTICES.notConfigured
          : typeof data.error === 'string'
            ? `${data.error.slice(0, 200)} Çevrimdışı yerel ayrıştırıcı kullanıldı.`
            : FALLBACK_NOTICES.unreachable;
      return buildOfflineDraft(trimmedText, redFlag, notice);
    }
    return mapApiResponse(data, redFlag);
  } catch {
    return buildOfflineDraft(trimmedText, redFlag, FALLBACK_NOTICES.network);
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener('abort', onExternalAbort);
  }
}
