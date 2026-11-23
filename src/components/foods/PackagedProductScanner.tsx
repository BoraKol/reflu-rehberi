import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Barcode,
  CheckCircle2,
  Loader2,
  PackageSearch,
} from 'lucide-react';
import { MECHANISM_LABELS } from '../../data/foodDatabase';
import { HIGH_FAT_THRESHOLD_G_PER_100G } from '../../engine/triggerEngine';
import { escapeRegex } from '../../lib/turkish';
import { searchPackagedProducts } from '../../services/openFoodFacts';
import type {
  IngredientTriggerMatch,
  OpenFoodFactsProduct,
} from '../../types/reflux';
import { useToast } from '../ToastProvider';

const SAMPLE_QUERIES = [
  'domates çorbası',
  'soğuk çay',
  'bitter çikolata',
  'kraker',
] as const;

function renderHighlightedIngredients(
  rawText: string,
  triggers: IngredientTriggerMatch[]
): ReactNode {
  const terms = triggers
    .filter((t) => t.triggerId !== 'high-fat-100g' && t.matchedTerm.trim().length > 0)
    .map((t) => t.matchedTerm.trim());

  if (terms.length === 0) return rawText;

  const escaped = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = rawText.split(regex);
  const lowerTermSet = new Set(terms.map((t) => t.toLocaleLowerCase('tr-TR')));

  return parts.map((part, idx) =>
    lowerTermSet.has(part.toLocaleLowerCase('tr-TR')) ? (
      <mark
        key={idx}
        className="bg-[#FEF2F2] text-[#B91C1C] font-semibold px-1 py-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export const PackagedProductScanner = memo(function PackagedProductScanner() {
  const { notify } = useToast();
  const [offQuery, setOffQuery] = useState('');
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);
  const [offResults, setOffResults] = useState<OpenFoodFactsProduct[]>([]);
  const [offSearchedOnce, setOffSearchedOnce] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSearch = useCallback(
    async (queryOverride?: string) => {
      const q = (queryOverride ?? offQuery).trim();
      if (!q) return;
      if (queryOverride !== undefined) setOffQuery(queryOverride);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setOffLoading(true);
      setOffError(null);
      setOffSearchedOnce(true);

      const res = await searchPackagedProducts(q, controller.signal);
      if (controller.signal.aborted) return;

      setOffResults(res.products);
      setOffError(res.error ?? null);
      setOffLoading(false);

      if (res.error) {
        notify({
          title: 'Ürün kontrolü başarısız',
          description: res.error,
          variant: 'error',
        });
      } else if (res.products.length === 0) {
        notify({
          title: 'Ürün bulunamadı',
          description: 'Farklı bir ürün adı veya barkod numarası deneyebilirsiniz.',
          variant: 'info',
        });
      } else {
        const flaggedCount = res.products.filter((p) => p.triggers.length > 0).length;
        notify(
          flaggedCount > 0
            ? {
                title: `${res.products.length} ürün incelendi`,
                description: `${flaggedCount} üründe olası reflü tetikleyicisi işaretlendi.`,
                variant: 'warning',
              }
            : {
                title: `${res.products.length} ürün incelendi`,
                description: 'İçindekiler etiketleri listelendi.',
                variant: 'success',
              }
        );
      }
    },
    [offQuery, notify]
  );

  return (
    <div className="space-y-5">
      <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#0F233A]">
            Paketli Ürün İçindekiler Kontrolü
          </h2>
          <p className="text-sm text-[#455D75] leading-relaxed">
            Ürün adını veya barkod numarasını yazın. Ürünün içindekiler listesi ve yağ oranı kontrol edilerek sitrik asit (E330), domates salçası, kafein, kakao, nane, acı biber, sirke, soğan/sarımsak tozu, karbondioksit ve yüksek yağ (&gt;{HIGH_FAT_THRESHOLD_G_PER_100G} g/100 g) gibi yaygın tetikleyiciler doğrudan etiket metninde işaretlenir.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Barcode
              className="w-4 h-4 text-[#688099] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              maxLength={120}
              value={offQuery}
              onChange={(e) => setOffQuery(e.target.value)}
              placeholder="Ürün adı (örn: domates çorbası, soğuk çay) veya barkod (örn: 8690504015505)..."
              aria-label="Paketli ürün adı veya barkod numarası"
              className="w-full min-h-11 pl-10 pr-4 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6]"
            />
          </div>
          <button
            type="submit"
            disabled={offLoading || !offQuery.trim()}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {offLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            İçindekileri Tara
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#688099]">Hızlı deneme:</span>
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => void handleSearch(sample)}
              className="min-h-8 px-2.5 py-1 rounded-md bg-[#F0F6FC] text-[#155CC0] hover:bg-[#DCEBFE] cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </section>

      {offError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p>{offError}</p>
        </div>
      )}

      {!offLoading && offSearchedOnce && !offError && offResults.length === 0 && (
        <div className="bg-white border border-[#DCE7F3] rounded-2xl p-6 sm:p-8 text-center text-sm text-[#455D75]">
          Bu arama için kayıtlı ürün bulunamadı. Farklı bir ürün adı veya barkod numarası deneyebilirsiniz.
        </div>
      )}

      {offResults.length > 0 && (
        <div className="space-y-4">
          {offResults.map((product) => (
            <article
              key={`${product.code}-${product.productName}`}
              className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E6EFF8]">
                <div className="flex items-start gap-3.5 min-w-0">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-contain bg-[#F7FBFF] border border-[#DCE7F3] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#F0F6FC] flex items-center justify-center shrink-0 text-[#688099]">
                      <PackageSearch className="w-5 h-5" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#0F233A] break-words">
                      {product.productName}
                    </h3>
                    <p className="text-xs text-[#688099] break-words">
                      {product.brands}
                      {product.code ? ` · Barkod: ${product.code}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                  {product.fat100g !== null && (
                    <span
                      className={`px-2.5 py-1 rounded-md font-mono font-medium ${
                        product.highFatFlag
                          ? 'bg-[#FEF2F2] text-[#B91C1C]'
                          : 'bg-[#F0F6FC] text-[#455D75]'
                      }`}
                    >
                      Yağ: {product.fat100g.toFixed(1)} g / 100 g
                    </span>
                  )}
                  {product.ingredientsMissing ? (
                    <span className="px-2.5 py-1 rounded-md bg-[#F0F6FC] text-[#455D75] font-medium">
                      İçindekiler eksik
                    </span>
                  ) : product.triggers.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#047857] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Etikette yaygın tetikleyici eşleşmedi
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-[#FEF2F2] text-[#B91C1C] font-medium">
                      {product.triggers.length} olası tetikleyici tespit edildi
                    </span>
                  )}
                </div>
              </div>

              {product.ingredientsMissing ? (
                <p className="text-sm text-[#455D75] bg-[#F7FBFF] p-3.5 rounded-xl">
                  Bu ürünün resmi içindekiler bilgisi bulunamadı. Eksik etiket verisi için tahmini risk skoru üretilmez.
                </p>
              ) : (
                <>
                  {product.triggers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#0F233A]">
                        Etikette Birebir Tespit Edilen Bileşenler:
                      </p>
                      <ul className="space-y-2">
                        {product.triggers.map((tr) => (
                          <li
                            key={tr.triggerId}
                            className="p-3 rounded-xl bg-[#FEF2F2]/60 border border-[#FECACA] text-xs space-y-1"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-[#991B1B]">{tr.label}</span>
                              <span className="text-[#B91C1C] font-medium">
                                {MECHANISM_LABELS[tr.mechanism].label}
                              </span>
                            </div>
                            <p className="text-[#455D75]">{tr.reason}</p>
                            <p className="font-mono text-[11px] text-[#0F233A] bg-white/80 px-2.5 py-1 rounded break-words">
                              Etiket kesiti: &ldquo;{tr.snippet}&rdquo;
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#688099]">İçindekiler Metni:</p>
                    <p className="text-xs text-[#334155] leading-relaxed bg-[#F7FBFF] p-3.5 rounded-xl border border-[#E2EEF9] break-words">
                      {renderHighlightedIngredients(product.ingredientsText!, product.triggers)}
                    </p>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
});
