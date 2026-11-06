import { ComponentAction } from '../types';
import { safeNavigationUrl } from './urlSafety';

export interface ActionContext {
  sectionId?: string;
  product?: string;
  page?: string;
  formId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  smoothScroll?: boolean;
  analyticsType?: 'click' | 'cta_click' | 'form_start' | 'form_submit';
  [key: string]: any;
}

export type CmsSectionHistoryMode = 'push' | 'replace' | 'none';

export function normalizeCmsSectionTarget(value: string) {
  const raw = String(value || '').trim().replace(/^#/, '');
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/**
 * Return a section id when `value` points to an anchor on the current page.
 * This lets legacy targets such as `#lead-form-section`, `/#lead-form-section`
 * or an absolute current-page URL scroll in-place without changing the URL.
 */
export function samePageCmsSectionTarget(value: string) {
  if (typeof window === 'undefined') return '';
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('#')) return normalizeCmsSectionTarget(raw);
  try {
    const url = new URL(raw, window.location.href);
    if (!url.hash) return '';
    const current = new URL(window.location.href);
    const samePage = url.origin === current.origin && url.pathname === current.pathname && url.search === current.search;
    return samePage ? normalizeCmsSectionTarget(url.hash) : '';
  } catch {
    return '';
  }
}

/**
 * Scroll to a CMS section without changing the browser URL by default.
 *
 * `push` / `replace` remain available for explicit deep-link flows, while all
 * normal CMS CTA clicks use `none` so clicking a CTA does not add `/#...` to
 * the address bar or create a browser-history entry.
 */
export function scrollToCmsSection(
  id: string,
  options: { smooth?: boolean; historyMode?: CmsSectionHistoryMode } = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const normalized = normalizeCmsSectionTarget(id);
  if (!normalized || normalized === 'admin') return false;

  const el = document.getElementById(normalized) || document.getElementById(`section-${normalized}`);
  if (!el) return false;

  const hashTarget = el.id || normalized;
  const historyMode = options.historyMode ?? 'none';
  if (historyMode !== 'none') {
    const url = new URL(window.location.href);
    url.hash = hashTarget;
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      if (historyMode === 'replace') window.history.replaceState(null, '', nextUrl);
      else window.history.pushState(null, '', nextUrl);
    }
  }

  el.scrollIntoView({ behavior: options.smooth === false ? 'auto' : 'smooth', block: 'start' });
  return true;
}

export function trackCmsEvent(action?: ComponentAction | string, context: ActionContext = {}) {
  if (typeof window === 'undefined') return;
  const eventName = typeof action === 'string' ? action : action?.eventName;
  if (!eventName) return;
  const params = typeof action === 'string' ? {} : (action?.parameters || []).reduce<Record<string, string>>((a, p) => {
    if (p.key) a[p.key] = p.value;
    return a;
  }, {});
  const url = new URL(window.location.href);
  const payload = {
    event: eventName,
    page: context.page || window.location.pathname,
    section: context.sectionId || context.section || '',
    product: context.product || '',
    formId: context.formId || '',
    utm_source: context.utmSource || url.searchParams.get('utm_source') || '',
    utm_medium: context.utmMedium || url.searchParams.get('utm_medium') || '',
    utm_campaign: context.utmCampaign || url.searchParams.get('utm_campaign') || '',
    ...params,
  };
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent('cms:analytics', { detail: { type: context.analyticsType || 'cta_click', eventName, sectionId: payload.section, product: payload.product, target: payload.formId || payload.page, utmSource: payload.utm_source, utmMedium: payload.utm_medium, utmCampaign: payload.utm_campaign } }));
}

export function runCmsAction(action?: ComponentAction, context: ActionContext = {}) {
  if (!action || action.type === 'none') return;
  trackCmsEvent(action, context);
  const target = (action.target || '').trim();
  const parameters = (action.parameters || []).reduce<Record<string, string>>((a, p) => {
    if (p.key) a[p.key] = p.value;
    return a;
  }, {});
  const scroll = (id: string) => scrollToCmsSection(id, { smooth: context.smoothScroll !== false, historyMode: 'none' });

  switch (action.type) {
    case 'scroll': scroll(target); break;
    case 'popup':
      window.dispatchEvent(new CustomEvent('cms:open-popup', { detail: { popupId: target, parameters, context } }));
      break;
    case 'form':
      window.dispatchEvent(new CustomEvent('cms:open-form', { detail: { formId: target || 'main', parameters, context } }));
      if (!target || target === 'main') scroll('lead-form-section');
      break;
    case 'phone': if (target) window.location.href = `tel:${target.replace(/[^0-9+]/g, '')}`; break;
    case 'zalo': if (target) { const url=safeNavigationUrl(target.startsWith('http') ? target : `https://zalo.me/${target.replace(/\D/g, '')}`,false); if(url) window.open(url, action.openInNewTab === false ? '_self' : '_blank','noopener,noreferrer'); } break;
    case 'messenger': if (target) { const raw=target.startsWith('http') ? target : `https://m.me/${target.replace(/^@/, '')}`; const url=safeNavigationUrl(raw,false); if(url) window.open(url, action.openInNewTab === false ? '_self' : '_blank','noopener,noreferrer'); } break;
    case 'email': if (target) window.location.href = `mailto:${target.replace(/^mailto:/i, '')}`; break;
    case 'maps': if (target) { const raw=target.startsWith('http') ? target : `https://maps.google.com/?q=${encodeURIComponent(target)}`; const url=safeNavigationUrl(raw,false); if(url) window.open(url, action.openInNewTab === false ? '_self' : '_blank','noopener,noreferrer'); } break;
    case 'download':
      if (target) {
        const url=safeNavigationUrl(target,true); if(!url) break; const a = document.createElement('a'); a.href = url; a.download = '';
        if (action.openInNewTab) a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove();
      }
      break;
    case 'url':
    case 'internal':
      if (target) {
        // Same-page anchors behave like CMS section actions but deliberately
        // keep the current browser URL unchanged. This also supports legacy
        // values such as `/#lead-form-section`.
        const sectionTarget = samePageCmsSectionTarget(target);
        if (sectionTarget) { scroll(sectionTarget); break; }
        const url=safeNavigationUrl(target,true);
        if(url) window.open(url, action.openInNewTab ? '_blank' : '_self','noopener,noreferrer');
      }
      break;
  }
}
