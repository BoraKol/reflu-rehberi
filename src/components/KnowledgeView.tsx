import { memo, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { KNOWLEDGE_CARDS } from '../data/knowledgeCards';
import type { KnowledgeCard } from '../types/reflux';
import { PageHeader } from './ui/PageHeader';

const CATEGORIES: ReadonlyArray<'Tümü' | KnowledgeCard['category']> = [
  'Tümü',
  'Sessiz Reflü',
  'Beslenme Mekaniği',
  'Uyku & Duruş',
  'Doktora Ne Zaman?',
];

export const KnowledgeView = memo(function KnowledgeView() {
  const [selectedCategory, setSelectedCategory] = useState<
    'Tümü' | KnowledgeCard['category']
  >('Tümü');

  const visibleCards = useMemo(() => {
    if (selectedCategory === 'Tümü') return KNOWLEDGE_CARDS;
    return KNOWLEDGE_CARDS.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Genel Bilgilendirme Notları · Tıbbi tavsiye yerine geçmez"
        title="Bilgi Kartları"
      />

      <div
        role="tablist"
        aria-label="Bilgi kartı kategorileri"
        className="flex flex-wrap items-center gap-1.5"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            className={`min-h-9 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1D6FD6] text-white'
                : 'bg-white border border-[#DCE7F3] text-[#455D75] hover:text-[#0F233A] hover:bg-[#F7FBFF]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {visibleCards.map((card) => (
          <article
            key={card.id}
            className={`rounded-2xl border p-4 sm:p-6 space-y-4 sm:space-y-5 ${
              card.isRedFlagCard
                ? 'bg-white border-[#991B1B]'
                : 'bg-white border-[#DCE7F3]'
            }`}
          >
            <div className="space-y-1.5 pb-4 border-b border-[#E6EFF8]">
              <div className="flex items-center gap-2 text-xs">
                {card.isRedFlagCard ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#991B1B] text-white font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    Kırmızı Bayraklar · Güvenlik Rehberi
                  </span>
                ) : (
                  <span className="font-medium text-[#155CC0]">{card.category}</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-[#0F233A]">{card.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-[#455D75]">Kısa Özet</h3>
                <p className="text-sm text-[#0F233A] leading-relaxed">
                  {card.shortSummary}
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-[#155CC0]">
                  Günlük Hayatta Ne İşe Yarar?
                </h3>
                <p className="text-sm text-[#334155] leading-relaxed">
                  {card.dailyApplication}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});
