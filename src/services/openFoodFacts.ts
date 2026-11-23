import { scanIngredientsForTriggers } from '../engine/triggerEngine';
import type { OpenFoodFactsProduct } from '../types/reflux';

interface RawOffProduct {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  ingredients_text_tr?: string;
  ingredients_text?: string;
  image_small_url?: string;
  image_front_small_url?: string;
  nutriments?: {
    fat_100g?: number | string;
  };
}

export interface SearchProductsResult {
  products: OpenFoodFactsProduct[];
  mode: 'barcode' | 'search';
  error?: string;
}

const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry {
  result: SearchProductsResult;
  expiresAt: number;
}

/** Bounded in-memory LRU/TTL cache so repeated lookups avoid redundant network calls. */
const searchCache = new Map<string, CacheEntry>();

function readCache(key: string): SearchProductsResult | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  // Refresh LRU recency
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.result;
}

function writeCache(key: string, result: SearchProductsResult): void {
  if (result.error) return;
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey !== undefined) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * SECURITY: only allow HTTPS image URLs from trusted OpenFoodFacts domains
 * (prevents javascript:, data:, or tracking-pixel injection from third-party fields).
 */
function sanitizeOffImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.endsWith('openfoodfacts.org')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function mapRawOffProduct(raw: RawOffProduct): OpenFoodFactsProduct {
  const productName = (raw.product_name_tr || raw.product_name || 'İsimsiz Ürün').trim();
  const brands = (raw.brands || 'Marka bilgisi yok').trim();
  const ingredientsText =
    (raw.ingredients_text_tr && raw.ingredients_text_tr.trim()) ||
    (raw.ingredients_text && raw.ingredients_text.trim()) ||
    null;

  const fatRaw = raw.nutriments?.fat_100g;
  const fat100g =
    fatRaw !== undefined &&
    fatRaw !== null &&
    fatRaw !== '' &&
    Number.isFinite(Number(fatRaw))
      ? Number(fatRaw)
      : null;

  const { triggers, highFatFlag } = scanIngredientsForTriggers(ingredientsText, fat100g);

  return {
    code: String(raw.code || ''),
    productName,
    brands,
    ingredientsText,
    fat100g,
    imageUrl: sanitizeOffImageUrl(raw.image_front_small_url || raw.image_small_url),
    triggers,
    highFatFlag,
    ingredientsMissing: !ingredientsText,
  };
}

export function isLikelyBarcode(query: string): boolean {
  return /^\d{8,14}$/.test(query.trim());
}

export async function searchPackagedProducts(
  query: string,
  externalSignal?: AbortSignal
): Promise<SearchProductsResult> {
  const cleaned = query.trim().slice(0, 120);
  if (!cleaned) {
    return { products: [], mode: 'search' };
  }

  const barcodeMode = isLikelyBarcode(cleaned);
  const mode: 'barcode' | 'search' = barcodeMode ? 'barcode' : 'search';
  const cacheKey = `${mode}:${cleaned.toLowerCase()}`;

  const cached = readCache(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    if (barcodeMode) {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        return {
          products: [],
          mode,
          error: 'Open Food Facts servisine şu an ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.',
        };
      }
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        return {
          products: [],
          mode,
          error: `"${cleaned}" barkoduyla eşleşen resmi bir ürün kaydı bulunamadı.`,
        };
      }
      const result: SearchProductsResult = {
        products: [mapRawOffProduct({ ...data.product, code: cleaned })],
        mode,
      };
      writeCache(cacheKey, result);
      return result;
    }

    const url = `https://tr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      cleaned
    )}&search_simple=1&action=process&json=1&page_size=8`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return {
        products: [],
        mode,
        error: 'Open Food Facts arama servisine şu an ulaşılamıyor. Lütfen tekrar deneyin.',
      };
    }
    const data = await res.json();
    const rawProducts: RawOffProduct[] = Array.isArray(data.products) ? data.products : [];
    const mapped = rawProducts
      .filter((p) => Boolean(p.product_name_tr || p.product_name))
      .map(mapRawOffProduct);

    const result: SearchProductsResult = { products: mapped, mode };
    writeCache(cacheKey, result);
    return result;
  } catch (err) {
    if (externalSignal?.aborted) {
      return { products: [], mode };
    }
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      products: [],
      mode,
      error:
        isAbort && timedOut
          ? 'Open Food Facts yanıt süresi aşıldı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
          : 'Open Food Facts veritabanına bağlanırken ağ hatası oluştu. Ürün içeriği tahmin edilmedi.',
    };
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
