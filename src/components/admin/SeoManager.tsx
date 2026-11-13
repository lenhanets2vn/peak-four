import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  Save,
  CheckCircle2,
  ExternalLink,
  Share2,
  Eye,
  Smartphone,
  Monitor,
  AlertTriangle,
  RefreshCw,
  Copy,
  Layers,
  FileCode,
  Tag,
  Check,
  Type,
} from 'lucide-react';
import { LandingPageConfig, LandingPageSummary, SeoSettings } from '../../types';
import { getPages, getPageSeo, savePageSeo, publishPage, authFetch } from '../../services/api';
import { normalizeLandingConfig } from '../../utils/configDefaults';
import { ImageUrlField, inputCls, labelCls } from './SettingsEditors';
import { FontSelector } from '../common/FontSelector';
import { applyFavicon } from '../../utils/siteFavicon';

const cardCls = 'bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs';

export const SeoManager: React.FC<{
  currentConfig: LandingPageConfig;
  onPersistedSeoChange?: (seo: SeoSettings) => void;
  initialPageId?: string;
}> = ({ currentConfig, onPersistedSeoChange, initialPageId }) => {
  const [pages, setPages] = useState<LandingPageSummary[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>(initialPageId || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Active SEO form state
  const [seo, setSeo] = useState<SeoSettings>({
    pageTitle: currentConfig.websiteSettings?.seo?.pageTitle || currentConfig.brandName || '',
    faviconUrl: currentConfig.websiteSettings?.seo?.faviconUrl || '',
    slug: currentConfig.websiteSettings?.seo?.slug || '',
    seoTitle: currentConfig.websiteSettings?.seo?.seoTitle || '',
    metaDescription: currentConfig.websiteSettings?.seo?.metaDescription || '',
    keywords: currentConfig.websiteSettings?.seo?.keywords || '',
    ogTitle: currentConfig.websiteSettings?.seo?.ogTitle || '',
    ogDescription: currentConfig.websiteSettings?.seo?.ogDescription || '',
    ogImage: currentConfig.websiteSettings?.seo?.ogImage || currentConfig.heroImage || '',
    ogType: currentConfig.websiteSettings?.seo?.ogType || 'website',
    ogSiteName: currentConfig.websiteSettings?.seo?.ogSiteName || 'Tên thương hiệu',
    canonical: currentConfig.websiteSettings?.seo?.canonical || '',
    robots: currentConfig.websiteSettings?.seo?.robots || 'index,follow',
    twitterCard: currentConfig.websiteSettings?.seo?.twitterCard || 'summary_large_image',
    twitterTitle: currentConfig.websiteSettings?.seo?.twitterTitle || '',
    twitterDescription: currentConfig.websiteSettings?.seo?.twitterDescription || '',
    twitterImage: currentConfig.websiteSettings?.seo?.twitterImage || '',
    structuredDataJson: currentConfig.websiteSettings?.seo?.structuredDataJson || '',
    fontFamily: currentConfig.websiteSettings?.seo?.fontFamily || '',
    headingFontFamily: currentConfig.websiteSettings?.seo?.headingFontFamily || '',
  });

  const [aiSuggestions, setAiSuggestions] = useState<{
    recommendations?: string[];
  } | null>(null);

  const [previewTab, setPreviewTab] = useState<'google' | 'facebook' | 'twitter'>('google');
  const [googleDevice, setGoogleDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Load pages list
  const loadPages = async () => {
    try {
      const pList = await getPages();
      setPages(pList);
      const home = pList.find((p) => p.id === 'page_home') || pList.find((p) => p.slug === '/') || pList[0];
      const requested = initialPageId && pList.some((p) => p.id === initialPageId) ? initialPageId : undefined;
      const currentIsValid = selectedPageId && selectedPageId !== 'home' && pList.some((p) => p.id === selectedPageId);
      if (!currentIsValid) setSelectedPageId(requested || home?.id || '');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (!pages.length) return;
    const home = pages.find((p) => p.id === 'page_home') || pages.find((p) => p.slug === '/') || pages[0];
    const next = initialPageId && pages.some((p) => p.id === initialPageId) ? initialPageId : home?.id;
    if (next && next !== selectedPageId) setSelectedPageId(next);
  }, [initialPageId]);

  // Load SEO for selected page
  const loadSelectedPageSeo = async (pageId: string) => {
    if (!pageId) return;
    setLoading(true);
    setNotice(null);
    try {
      const data = await getPageSeo(pageId);
      if (data && data.seo) {
        setSeo({
          pageTitle: data.seo.pageTitle || data.pageName || '',
          faviconUrl: data.seo.faviconUrl || '',
          slug: data.seo.slug || data.slug || '',
          seoTitle: data.seo.seoTitle || '',
          metaDescription: data.seo.metaDescription || '',
          keywords: data.seo.keywords || '',
          ogTitle: data.seo.ogTitle || data.seo.seoTitle || '',
          ogDescription: data.seo.ogDescription || data.seo.metaDescription || '',
          ogImage: data.seo.ogImage || '',
          ogType: data.seo.ogType || 'website',
          ogSiteName: data.seo.ogSiteName || 'Tên thương hiệu',
          canonical: data.seo.canonical || '',
          robots: data.seo.robots || 'index,follow',
          twitterCard: data.seo.twitterCard || 'summary_large_image',
          twitterTitle: data.seo.twitterTitle || '',
          twitterDescription: data.seo.twitterDescription || '',
          twitterImage: data.seo.twitterImage || '',
          structuredDataJson: data.seo.structuredDataJson || '',
          fontFamily: data.seo.fontFamily || currentConfig.websiteSettings?.seo?.fontFamily || '',
          headingFontFamily: data.seo.headingFontFamily || currentConfig.websiteSettings?.seo?.headingFontFamily || '',
        });
      }
    } catch {
      // If error or single-page mode, fallback to currentConfig
      const s = currentConfig.websiteSettings?.seo;
      if (s) setSeo(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPageId) {
      loadSelectedPageSeo(selectedPageId);
    }
  }, [selectedPageId]);

  const selectedPageRecord = pages.find((p) => p.id === selectedPageId);

  // v1.0.49: the current CMS tab follows the source-controlled favicon endpoint.
  // The SEO favicon field remains only as a backward-compatible fallback.
  useEffect(() => {
    applyFavicon('/favicon.ico', `static:${selectedPageId || 'home'}`);
  }, [selectedPageId]);

  // Save SEO
  const handleSaveSeo = async () => {
    setSaving(true);
    setNotice(null);
    try {
      if (seo.structuredDataJson?.trim()) {
        try { JSON.parse(seo.structuredDataJson); }
        catch { throw new Error('Structured Data JSON-LD không hợp lệ. Hãy sửa JSON trước khi lưu SEO.'); }
      }
      let savedSeoResult: Awaited<ReturnType<typeof savePageSeo>> | null = null;
      if (selectedPageId) {
        savedSeoResult = await savePageSeo(selectedPageId, seo);
        // Keep the editor input in sync with the canonical slug returned by the API.
        if (savedSeoResult?.slug !== undefined) setSeo((prev) => ({ ...prev, slug: savedSeoResult!.slug }));
        if (savedSeoResult?.persistence?.cloud === 'queued') setNotice({ type: 'info', text: 'SEO đã lưu ngay trên server; Firestore đang đồng bộ nền.' });
      }
      // Keep the active page preview in sync without falsely marking unrelated CMS
      // fields as saved/dirty. The dashboard patches only the SEO slice into its
      // saved baseline.
      const editingActivePage = initialPageId ? selectedPageId === initialPageId : (selectedPageRecord?.id === 'page_home' || selectedPageRecord?.slug === '/');
      if (onPersistedSeoChange && editingActivePage) {
        onPersistedSeoChange({
          ...(currentConfig.websiteSettings?.seo || {}),
          ...(savedSeoResult?.seo || seo),
        });
      }
      setNotice((prev) => prev?.type === 'info' ? prev : { type: 'success', text: 'Đã lưu cấu hình SEO & OpenGraph thành công!' });
      loadPages();
      return true;
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Lỗi khi lưu SEO.' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Publish page with new SEO
  const handlePublish = async () => {
    if (!selectedPageId) return;
    setSaving(true);
    try {
      const saved=await handleSaveSeo();
      if (!saved) return;
      await publishPage(selectedPageId);
      setNotice({ type: 'success', text: 'Đã lưu và xuất bản (Publish) trang với SEO mới lên Live!' });
      loadPages();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Lỗi khi xuất bản trang.' });
    } finally {
      setSaving(false);
    }
  };

  // Call Gemini to optimize SEO
  const handleOptimizeWithAi = async () => {
    setOptimizing(true);
    setNotice({ type: 'info', text: 'Gemini AI đang phân tích nội dung và tối ưu SEO...' });
    try {
      const res = await authFetch('/api/gemini/optimize-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle: seo.pageTitle || selectedPageRecord?.name || currentConfig.brandName,
          slug: seo.slug || selectedPageRecord?.slug || '/',
          brandName: currentConfig.brandName || 'Trang web',
          headline: currentConfig.headline || currentConfig.heroTitle || currentConfig.brandName,
          benefits: (currentConfig.sections || [])
            .map((s) => s.title)
            .filter(Boolean)
            .slice(0, 4)
            .join(', '),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tối ưu SEO bằng Gemini.');

      setSeo((prev) => ({
        ...prev,
        seoTitle: data.seoTitle || prev.seoTitle,
        metaDescription: data.metaDescription || prev.metaDescription,
        keywords: data.keywords || prev.keywords,
        ogTitle: data.ogTitle || data.seoTitle || prev.ogTitle,
        ogDescription: data.ogDescription || data.metaDescription || prev.ogDescription,
      }));

      setAiSuggestions({ recommendations: data.recommendations });
      setNotice({
        type: 'success',
        text: '✨ Gemini AI đã tạo bộ thẻ Meta Title, Description và OpenGraph tối ưu!',
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Lỗi khi gọi Gemini SEO.' });
    } finally {
      setOptimizing(false);
    }
  };

  // Title length analysis
  const titleLength = (seo.seoTitle || '').length;
  const titleHealth =
    titleLength === 0
      ? { color: 'text-neutral-400', label: 'Chưa nhập', bg: 'bg-neutral-100' }
      : titleLength < 30
      ? { color: 'text-amber-600', label: 'Hơi ngắn', bg: 'bg-amber-100' }
      : titleLength <= 60
      ? { color: 'text-emerald-700', label: 'Tối ưu cho Google (30-60)', bg: 'bg-emerald-100' }
      : { color: 'text-rose-700', label: 'Quá 60 ký tự (có thể bị cắt)', bg: 'bg-rose-100' };

  // Description length analysis
  const descLength = (seo.metaDescription || '').length;
  const descHealth =
    descLength === 0
      ? { color: 'text-neutral-400', label: 'Chưa nhập', bg: 'bg-neutral-100' }
      : descLength < 70
      ? { color: 'text-amber-600', label: 'Hơi ngắn (< 70)', bg: 'bg-amber-100' }
      : descLength <= 160
      ? { color: 'text-emerald-700', label: 'Độ dài vàng (120-160)', bg: 'bg-emerald-100' }
      : { color: 'text-rose-700', label: 'Quá 160 ký tự (sẽ có dấu ...)', bg: 'bg-rose-100' };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pageUrl = `${currentOrigin}${seo.slug?.startsWith('/') ? seo.slug : `/${seo.slug || ''}`}`;

  return (
    <div className="space-y-6">
      {/* Top Header & Page Selector Bar */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                Quản lý SEO & OpenGraph Từng Trang
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Search Visibility
                </span>
              </h2>
              <p className="text-xs text-neutral-500">
                Tối ưu hóa tiêu đề Meta, mô tả tìm kiếm Google SERP và thẻ chia sẻ mạng xã hội
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Picker */}
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-neutral-700">Trang:</span>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="bg-transparent font-bold text-xs text-neutral-900 outline-none cursor-pointer max-w-[200px] truncate"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug || '/'}) {p.published ? '• Live' : '• Nháp'}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={optimizing}
              onClick={handleOptimizeWithAi}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${optimizing ? 'animate-spin' : ''}`} />
              <span>{optimizing ? 'Đang phân tích...' : 'Tối ưu bằng Gemini AI'}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSeo}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <Save className="w-3.5 h-3.5 text-neutral-600" />
              <span>{saving ? 'Đang lưu...' : 'Lưu SEO'}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handlePublish}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xuất bản Live</span>
            </button>

            {selectedPageRecord && (
              <a
                href={selectedPageRecord.slug || '/'}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
                title="Mở trang xem trước"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notice && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* AI Suggestions Box (if generated) */}
      {aiSuggestions?.recommendations && aiSuggestions.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-100 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Khuyến nghị Tối ưu SEO từ Gemini AI:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-indigo-950 list-disc list-inside">
            {aiSuggestions.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Editor Left, Live Previews Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Google SERP Meta Tags */}
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Thẻ Tìm kiếm Google (Meta Tags)</span>
              </h3>
              <span className="text-[11px] font-bold text-neutral-400">On-Page Signals</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <ImageUrlField label="Biểu tượng tab web / Favicon (PNG/WebP/ICO, nên dùng ảnh vuông)" value={seo.faviconUrl||''} accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon" onChange={v=>setSeo({...seo,faviconUrl:v})}/>
                <p className="text-xs text-neutral-500">Trang Home là favicon mặc định toàn website. Category Page hoặc trang Tính Phí có thể đặt favicon riêng; để trống sẽ tự dùng favicon của Home.</p>
              </div>
              {/* Page Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tên trang (Internal Name)</label>
                  <input
                    className={inputCls}
                    value={seo.pageTitle || ''}
                    onChange={(e) => setSeo({ ...seo, pageTitle: e.target.value })}
                    placeholder="VD: Giới thiệu sản phẩm và dịch vụ"
                  />
                </div>
                <div>
                  <label className={labelCls}>Đường dẫn tĩnh (URL Slug)</label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-2 border border-r-0 border-neutral-300 rounded-l-xl bg-neutral-100 text-[11px] text-neutral-500 font-mono">
                      /
                    </span>
                    <input
                      className={`${inputCls} rounded-l-none font-mono`}
                      value={(seo.slug || '').replace(/^\//, '')}
                      onChange={(e) =>
                        setSeo({
                          ...seo,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                        })
                      }
                      placeholder={selectedPageId === 'page_home' ? 'Để trống để dùng /' : 'bao-hiem-suc-khoe'}
                    />
                  </div>
                  {selectedPageId === 'page_home' && (
                    <p className="mt-1 text-[11px] text-neutral-500">Trang chủ: xóa toàn bộ ô này để sử dụng tên miền gốc (/). Lưu SEO, sau đó Xuất bản Live.</p>
                  )}
                </div>
              </div>

              {/* Meta Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>
                    Thẻ Tiêu đề SEO (Meta Title / &lt;title&gt;)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSeo({
                          ...seo,
                          seoTitle: `${seo.pageTitle || 'Trang web'} | ${currentConfig.brandName || 'Trang web'}`,
                        })
                      }
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Lấy theo tên trang
                    </button>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${titleHealth.bg} ${titleHealth.color}`}
                    >
                      {titleLength}/60 ký tự • {titleHealth.label}
                    </span>
                  </div>
                </div>
                <input
                  className={inputCls}
                  value={seo.seoTitle || ''}
                  onChange={(e) => setSeo({ ...seo, seoTitle: e.target.value })}
                  placeholder="VD: Sản phẩm mới – Thông tin và đặc điểm nổi bật"
                />
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      titleLength > 60
                        ? 'bg-rose-500'
                        : titleLength >= 35
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, (titleLength / 60) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>
                    Thẻ Mô tả (Meta Description / &lt;meta name="description"&gt;)
                  </label>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${descHealth.bg} ${descHealth.color}`}
                  >
                    {descLength}/160 ký tự • {descHealth.label}
                  </span>
                </div>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={seo.metaDescription || ''}
                  onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                  placeholder="VD: Tìm hiểu thông tin chi tiết về sản phẩm và dịch vụ trên website."
                />
                <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      descLength > 160
                        ? 'bg-rose-500'
                        : descLength >= 120
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, (descLength / 160) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Focus Keywords */}
              <div>
                <label className={labelCls}>Từ khóa chính (Meta Keywords)</label>
                <input
                  className={inputCls}
                  value={seo.keywords || ''}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  placeholder="dịch vụ, tên sản phẩm, lĩnh vực hoạt động"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Phân cách các từ khóa bằng dấu phẩy (,)</p>
              </div>

              {/* Canonical URL & Robots Directives */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Thẻ Canonical URL (Chuẩn hóa trùng lặp)</label>
                  <input
                    className={`${inputCls} font-mono`}
                    value={seo.canonical || ''}
                    onChange={(e) => setSeo({ ...seo, canonical: e.target.value })}
                    placeholder={pageUrl}
                  />
                </div>
                <div>
                  <label className={labelCls}>Chỉ thị thu thập (Robots Directives)</label>
                  <select
                    className={inputCls}
                    value={seo.robots || 'index,follow'}
                    onChange={(e) => setSeo({ ...seo, robots: e.target.value as any })}
                  >
                    <option value="index,follow">index, follow (Cho phép Google lập chỉ mục)</option>
                    <option value="noindex,follow">noindex, follow (Chỉ chạy Ads, không hiển thị tìm kiếm)</option>
                    <option value="noindex,nofollow">noindex, nofollow (Ẩn hoàn toàn khỏi Google)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Font Chữ SEO & Thương Hiệu Trang (Typography Core Web Vitals) */}
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-600" />
                <span>Font Chữ & Trải Nghiệm Đọc Trang</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Core Web Vitals & UX
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Font không tự làm tăng thứ hạng SEO. Chọn font ổn định, dễ đọc và tải hợp lý giúp UX/Core Web Vitals tốt hơn; đây là tín hiệu kỹ thuật gián tiếp, không phải “mẹo SEO”.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FontSelector
                value={seo.fontFamily || ''}
                onChange={(font) => setSeo({ ...seo, fontFamily: font })}
                label="Font chữ toàn trang"
                previewText="Tên thương hiệu – Giới thiệu nội dung"
              />
              <FontSelector
                value={seo.headingFontFamily || ''}
                onChange={(font) => setSeo({ ...seo, headingFontFamily: font })}
                label="Font chữ tiêu đề H1/H2"
                previewText="Sản phẩm và dịch vụ nổi bật"
              />
            </div>
          </div>

          {/* Card 2: OpenGraph & Social Sharing Meta Tags */}
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Thẻ Mạng Xã Hội OpenGraph & Zalo / Facebook</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSeo({
                    ...seo,
                    ogTitle: seo.seoTitle || seo.pageTitle,
                    ogDescription: seo.metaDescription,
                  })
                }
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                Đồng bộ từ Meta Title & Desc
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>og:title (Tiêu đề hiển thị khi chia sẻ Link)</label>
                <input
                  className={inputCls}
                  value={seo.ogTitle || ''}
                  onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
                  placeholder={seo.seoTitle || 'Tiêu đề bài chia sẻ Facebook, Zalo'}
                />
              </div>

              <div>
                <label className={labelCls}>og:description (Đoạn trích mô tả chia sẻ)</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={seo.ogDescription || ''}
                  onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })}
                  placeholder={seo.metaDescription || 'Mô tả ngắn hiển thị dưới ảnh bìa khi share link'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>og:type (Loại nội dung)</label>
                  <select
                    className={inputCls}
                    value={seo.ogType || 'website'}
                    onChange={(e) => setSeo({ ...seo, ogType: e.target.value as any })}
                  >
                    <option value="website">website (Trang chủ / Landing Page)</option>
                    <option value="article">article (Bài viết chuyên sâu)</option>
                    <option value="product">product (Sản phẩm hoặc dịch vụ)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>og:site_name (Tên thương hiệu nguồn)</label>
                  <input
                    className={inputCls}
                    value={seo.ogSiteName || ''}
                    onChange={(e) => setSeo({ ...seo, ogSiteName: e.target.value })}
                    placeholder="Tên thương hiệu"
                  />
                </div>
              </div>

              {/* OG Image */}
              <div>
                <ImageUrlField
                  label="og:image (Ảnh thumbnail đại diện - Tỷ lệ chuẩn 1.91:1, khuyên dùng 1200 x 630px)"
                  value={seo.ogImage}
                  onChange={(img) => setSeo({ ...seo, ogImage: img, twitterImage: img })}
                />
              </div>

              {/* Twitter Card Setting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                <div>
                  <label className={labelCls}>twitter:card (Kiểu hiển thị trên X/Twitter)</label>
                  <select
                    className={inputCls}
                    value={seo.twitterCard || 'summary_large_image'}
                    onChange={(e) => setSeo({ ...seo, twitterCard: e.target.value as any })}
                  >
                    <option value="summary_large_image">summary_large_image (Ảnh lớn nổi bật)</option>
                    <option value="summary">summary (Ảnh vuông thu nhỏ bên cạnh)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>twitter:title (Tùy chọn ghi đè)</label>
                  <input
                    className={inputCls}
                    value={seo.twitterTitle || ''}
                    onChange={(e) => setSeo({ ...seo, twitterTitle: e.target.value })}
                    placeholder={seo.ogTitle || 'Mặc định theo og:title'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Schema.org Structured Data (JSON-LD) */}
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Dữ liệu có cấu trúc Schema.org (JSON-LD)</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const sample = {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: currentConfig.brandName || seo.pageTitle || '',
                    image: seo.ogImage || undefined,
                    '@id': pageUrl,
                    url: pageUrl,
                    telephone: currentConfig.hotline || '',
                  };
                  setSeo({ ...seo, structuredDataJson: JSON.stringify(sample, null, 2) });
                }}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                Tạo mẫu Schema thương hiệu của bạn
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mb-2">
              Giúp trang web hiển thị Rich Snippets (sao đánh giá, địa chỉ, hotline) trên kết quả tìm kiếm Google.
            </p>
            <textarea
              className={`${inputCls} font-mono text-[11px]`}
              rows={4}
              value={seo.structuredDataJson || ''}
              onChange={(e) => setSeo({ ...seo, structuredDataJson: e.target.value })}
              placeholder='{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "Tên sản phẩm hoặc dịch vụ"\n}'
            />
          </div>
        </div>

        {/* Right Column: Interactive Live SERP Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-5 sticky top-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Xem trước Hiển thị (Live Preview)</span>
              </h3>
              <div className="flex rounded-xl bg-neutral-100 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('google')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    previewTab === 'google' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
                  }`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('facebook')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    previewTab === 'facebook' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
                  }`}
                >
                  Facebook / Zalo
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('twitter')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    previewTab === 'twitter' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
                  }`}
                >
                  X (Twitter)
                </button>
              </div>
            </div>

            {/* TAB 1: GOOGLE SERP PREVIEW */}
            {previewTab === 'google' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pb-2 border-b border-neutral-100">
                  <span>Mô phỏng kết quả tìm kiếm Google</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGoogleDevice('mobile')}
                      className={`p-1 rounded-lg ${
                        googleDevice === 'mobile' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400'
                      }`}
                      title="Chế độ Mobile"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleDevice('desktop')}
                      className={`p-1 rounded-lg ${
                        googleDevice === 'desktop' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400'
                      }`}
                      title="Chế độ Desktop"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Google Snippet Card */}
                <div
                  className={`p-4 rounded-xl border border-neutral-200 bg-white transition-all ${
                    googleDevice === 'mobile' ? 'max-w-[360px] mx-auto' : 'w-full'
                  }`}
                >
                  {/* URL breadcrumb line */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      <Globe className="w-3 h-3 mx-auto my-auto" aria-hidden="true" />
                    </div>
                    <div className="leading-none text-[11px] text-neutral-700 truncate">
                      <span className="font-semibold">{currentConfig.brandName || 'Trang web'}</span>
                      <span className="text-neutral-400 font-normal">
                        {' '}
                        › {seo.slug?.replace(/^\//, '') || 'trang-chu'}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-blue-800 hover:underline cursor-pointer font-medium text-sm sm:text-base leading-snug line-clamp-2">
                    {seo.seoTitle || seo.pageTitle || 'Thông tin sản phẩm và dịch vụ'}
                  </h4>

                  {/* Description */}
                  <p className="text-neutral-600 text-xs mt-1 leading-relaxed line-clamp-3">
                    {seo.metaDescription ||
                      'Khám phá những nội dung và thông tin cập nhật mới nhất trên website.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FACEBOOK / ZALO OPENGRAPH PREVIEW */}
            {previewTab === 'facebook' && (
              <div className="space-y-3">
                <div className="text-[11px] text-neutral-500 pb-2 border-b border-neutral-100">
                  <span>Mô phỏng Card liên kết khi gửi qua Zalo / Facebook Chat / Feed</span>
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 shadow-xs">
                  {/* OG Image */}
                  <div className="w-full h-44 bg-neutral-200 relative overflow-hidden flex items-center justify-center">
                    {seo.ogImage ? (
                      <img
                        src={seo.ogImage}
                        alt="OpenGraph Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-neutral-400">
                        <Share2 className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-[11px]">Chưa có ảnh OpenGraph (Khuyên dùng 1200x630px)</span>
                      </div>
                    )}
                  </div>

                  {/* OG Content */}
                  <div className="p-3.5 bg-white space-y-1">
                    <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                      {seo.ogSiteName || 'WEBSITE'}
                    </div>
                    <div className="font-bold text-xs text-neutral-900 leading-snug line-clamp-2">
                      {seo.ogTitle || seo.seoTitle || seo.pageTitle || 'Trang web'}
                    </div>
                    <div className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                      {seo.ogDescription || seo.metaDescription || 'Giới thiệu sản phẩm và dịch vụ của chúng tôi.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TWITTER / X CARD PREVIEW */}
            {previewTab === 'twitter' && (
              <div className="space-y-3">
                <div className="text-[11px] text-neutral-500 pb-2 border-b border-neutral-100">
                  <span>Mô phỏng X / Twitter Large Image Card</span>
                </div>

                <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="w-full h-40 bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                    {seo.twitterImage || seo.ogImage ? (
                      <img
                        src={seo.twitterImage || seo.ogImage}
                        alt="Twitter Card"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-neutral-400 text-xs">Ảnh Twitter Card (1200x628)</div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-[10px] text-neutral-400 font-mono">ten-mien-cua-ban.vn</div>
                    <div className="font-bold text-xs text-neutral-900 truncate">
                      {seo.twitterTitle || seo.ogTitle || seo.seoTitle || seo.pageTitle}
                    </div>
                    <div className="text-[11px] text-neutral-500 line-clamp-2">
                      {seo.twitterDescription || seo.ogDescription || seo.metaDescription}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick SEO Health Checklist */}
          <div className={cardCls}>
            <h4 className="font-black text-xs text-neutral-900 uppercase mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>SEO Health Audit (Kiểm tra nhanh)</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50">
                <span>Thẻ Meta Title:</span>
                <span className={`font-bold ${titleHealth.color}`}>{titleHealth.label}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50">
                <span>Thẻ Meta Description:</span>
                <span className={`font-bold ${descHealth.color}`}>{descHealth.label}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50">
                <span>Ảnh chia sẻ OpenGraph:</span>
                <span className={`font-bold ${seo.ogImage ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {seo.ogImage ? '✓ Đã thiết lập' : '⚠ Chưa có ảnh'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50">
                <span>Chỉ thị Robots:</span>
                <span className="font-bold text-neutral-700 font-mono text-[11px]">{seo.robots}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50">
                <span>Schema JSON-LD:</span>
                <span
                  className={`font-bold ${seo.structuredDataJson ? 'text-emerald-700' : 'text-neutral-400'}`}
                >
                  {seo.structuredDataJson ? '✓ Hoạt động' : 'Tùy chọn'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
