/**
 * Single source of truth for Turkish-aware ASCII folding & regex utilities (DRY).
 * Every character mapping is strictly 1-to-1 so character indices in
 * `normalizeTurkishKeepLength` align 1-to-1 with the original string.
 */
export function normalizeTurkishKeepLength(input: string): string {
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

export function normalizeTurkishForMatch(input: string): string {
  return normalizeTurkishKeepLength(input).replace(/\s+/g, ' ').trim();
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
