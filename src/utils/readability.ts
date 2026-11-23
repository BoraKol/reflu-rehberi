export const READABILITY_ATTR = 'data-readability';
export const READABILITY_HIGH = 'high';

export interface ReadabilityTarget {
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}

export interface ReadabilityAnnouncement {
  title: string;
  description: string;
}

/**
 * Applies or removes the high-readability attribute on the document root.
 * Purely in-memory / DOM state — never writes to localStorage or sessionStorage.
 */
export function applyReadabilityMode(
  target: ReadabilityTarget | null | undefined,
  enabled: boolean
): void {
  if (!target) return;
  if (enabled) {
    target.setAttribute(READABILITY_ATTR, READABILITY_HIGH);
  } else {
    target.removeAttribute(READABILITY_ATTR);
  }
}

export function getReadabilityAnnouncement(
  enabled: boolean
): ReadabilityAnnouncement {
  if (enabled) {
    return {
      title: 'Okunabilirlik Modu açıldı',
      description:
        'Yüksek kontrastlı metin ve geniş satır aralıkları etkinleştirildi.',
    };
  }
  return {
    title: 'Okunabilirlik Modu kapatıldı',
    description: 'Standart görünüm düzenine dönüldü.',
  };
}
