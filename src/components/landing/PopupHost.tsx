import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { LandingPageConfig, LeadTracking, PopupConfig } from '../../types';
import { LeadForm } from './LeadForm';
import { getFormDefinition } from '../../utils/configDefaults';
import { safeMediaUrl, safeNavigationUrl } from '../../utils/urlSafety';

type PopupState = { popup: PopupConfig; parameters: Record<string, any>; context: Partial<LeadTracking> & { sectionId?: string; product?: string } };

const animationClass: Record<string,string> = {
  fade: 'cms-popup-fade', scale: 'cms-popup-scale', 'slide-up': 'cms-popup-slide-up', 'slide-down': 'cms-popup-slide-down'
};

export const PopupHost: React.FC<{ config: LandingPageConfig }> = ({ config }) => {
  const [state, setState] = useState<PopupState | null>(null);
  const popups = config.websiteSettings?.popups || [];
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const popup = popups.find((p) => p.id === detail.popupId && p.enabled && !p.deletedAt);
      if (!popup) return;
      setState({ popup, parameters: detail.parameters || {}, context: detail.context || {} });
      document.documentElement.style.overflow = 'hidden';
    };
    window.addEventListener('cms:open-popup', handler);
    return () => { window.removeEventListener('cms:open-popup', handler); document.documentElement.style.overflow = ''; };
  }, [popups]);
  useEffect(() => {
    if (!state) document.documentElement.style.overflow = '';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setState(null); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [state]);
  const form = useMemo(() => state && (state.popup.contentType || 'form') === 'form' ? getFormDefinition(config, state.popup.formId || 'main') : null, [config, state]);
  if (!state) return null;
  const active = state.popup;
  const contentType = active.contentType || 'form';
  const pos = active.position === 'top' ? 'items-start pt-8 sm:pt-12' : active.position === 'bottom' ? 'items-end pb-8 sm:pb-12' : 'items-center';
  const overlay = active.overlayColor || '#000000';
  const opacity = Math.max(0, Math.min(100, active.overlayOpacity ?? 55)) / 100;
  const close = () => setState(null);
  const imageUrl = safeMediaUrl(active.image);
  const documentUrl = safeNavigationUrl(active.documentUrl, true);
  return (
    <div className={`fixed inset-0 z-[90] flex justify-center ${pos} p-4 overflow-y-auto`} style={{ backgroundColor: `color-mix(in srgb, ${overlay} ${opacity*100}%, transparent)` }} onMouseDown={close} role="dialog" aria-modal="true" aria-label={active.name}>
      <div onMouseDown={(e) => e.stopPropagation()} className={`relative overflow-y-auto rounded-2xl shadow-2xl border border-neutral-200 p-5 sm:p-7 ${animationClass[active.animation || 'scale'] || ''}`} style={{ width: `min(${active.width || 560}px, 96vw)`, maxHeight: active.height ? `min(${active.height}px, 92vh)` : '92vh', background: active.background || '#fff' }}>
        {active.closeButton !== false && <button type="button" onClick={close} className="absolute right-3 top-3 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 z-10" aria-label="Đóng popup"><X className="w-4 h-4" /></button>}
        {imageUrl && <img src={imageUrl} alt={active.headline || active.name} className={`${contentType==='image'?'max-h-[75vh] object-contain':'h-40 object-cover'} w-full rounded-xl mb-4`} />}
        {active.headline && <h2 className="text-xl font-black mb-1 pr-10">{active.headline}</h2>}
        {active.description && <p className="text-sm text-neutral-600 mb-4 whitespace-pre-line">{active.description}</p>}
        {contentType === 'form' && form && (form.enabled ? <LeadForm instanceId={`popup-${active.id}`} fields={form.fields} settings={{...form.settings, formId: form.id}} initialValues={state.parameters} initialTracking={{ formId: form.id, section: state.context.sectionId || state.context.section, product: state.context.product || state.parameters.product_name || state.parameters.product, page: state.context.page }} onSuccess={close} /> : <p className="text-sm text-neutral-500">Form đang tạm ngưng.</p>)}
        {contentType === 'image' && !imageUrl && <p className="text-sm text-neutral-500">Popup ảnh chưa được cấu hình hình ảnh.</p>}
        {contentType === 'document' && (documentUrl ? <div className="space-y-3"><iframe title={active.documentLabel || active.headline || active.name} src={documentUrl} className="w-full rounded-xl border border-neutral-200 bg-white" style={{height:Math.max(280,Math.min(1400,active.documentHeight||720))}}/><a href={documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline"><ExternalLink className="w-4 h-4"/>{active.documentLabel || 'Mở tài liệu trong tab mới'}</a></div> : <p className="text-sm text-neutral-500">Popup tài liệu chưa có URL.</p>)}
      </div>
    </div>
  );
};
