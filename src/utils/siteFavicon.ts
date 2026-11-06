import { safeMediaUrl } from './urlSafety';
import type { LandingPageConfig } from '../types';

function withCacheBust(url:string, version?:string|number) {
  const raw=String(url||'').trim();
  if (!raw || /^(?:data:|blob:)/i.test(raw) || !version) return raw;
  const joiner=raw.includes('?')?'&':'?';
  return `${raw}${joiner}cms_favicon_v=${encodeURIComponent(String(version))}`;
}

export function resolveSiteFavicon(_config?:LandingPageConfig|null, _explicitUrl?:string) {
  // v1.0.49: browser always requests the stable favicon endpoint.
  // The server serves public/favicon.ico first and only falls back to CMS/Firestore
  // favicon settings when no static favicon file exists.
  return '/favicon.ico';
}

export function applyFavicon(url?:string, version?:string|number) {
  if (typeof document === 'undefined') return;
  const raw=String(url||'').trim();
  const icon = /^data:image\/(?:x-icon|vnd\.microsoft\.icon);base64,/i.test(raw) ? raw : safeMediaUrl(raw);
  document.head.querySelectorAll('link[data-cms-favicon="true"]').forEach(node=>node.remove());
  if (!icon) return;
  const href=withCacheBust(icon,version);
  const primary=document.createElement('link');
  primary.rel='icon';
  primary.dataset.cmsFavicon='true';
  primary.href=href;
  document.head.appendChild(primary);
  const shortcut=document.createElement('link');
  shortcut.rel='shortcut icon';
  shortcut.dataset.cmsFavicon='true';
  shortcut.href=href;
  document.head.appendChild(shortcut);
}

export function applySiteFavicon(config?:LandingPageConfig|null, explicitUrl?:string) {
  applyFavicon(resolveSiteFavicon(config,explicitUrl), config?.lastPublishedAt || config?.version || 'static');
}
