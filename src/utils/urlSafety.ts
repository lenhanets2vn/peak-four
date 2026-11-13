/**
 * Accept only navigation targets that a no-code CMS should be allowed to emit.
 * Blocks script/data/vbscript protocols while preserving relative links, anchors,
 * HTTP(S), mailto and tel links. Media data URLs are handled separately.
 */
export function safeNavigationUrl(value?: string | null, allowRelative = true): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (allowRelative && (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('./') || raw.startsWith('../'))) return raw;
  try {
    const url = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://cms.local');
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return raw;
  } catch {}
  return '';
}

export function safeMediaUrl(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(raw)) return raw;
  if (/^blob:/i.test(raw)) return raw;
  return safeNavigationUrl(raw, true);
}
