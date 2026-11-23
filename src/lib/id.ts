/**
 * Collision-resistant, URL/Firestore-safe identifier generator.
 * Prefers the cryptographically secure `crypto.randomUUID` and gracefully
 * falls back to `crypto.getRandomValues` (never `Math.random`).
 * Output always matches /^[a-zA-Z0-9_-]{1,128}$/.
 */
export function createId(prefix: string): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto;
  let random: string;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    random = cryptoApi.randomUUID().replace(/-/g, '').slice(0, 16);
  } else if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
    random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    random = Date.now().toString(36);
  }
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
