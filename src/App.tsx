import React, { useEffect, useRef, useState } from 'react';
import { LandingPageConfig, AdminUser } from './types';
import { normalizeLandingConfig } from './utils/configDefaults';
import { fetchPublishedConfig, fetchAdminConfig, getAdminSession, getPreviewConfig, getStoredAdminToken, setStoredAdminToken, logoutAdmin } from './services/api';
import { LandingPage } from './components/landing/LandingPage';
import { DynamicSection } from './components/landing/DynamicSection';
import { CmsConfigProvider } from './context/CmsConfigContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { applySiteFavicon } from './utils/siteFavicon';
import { normalizeCmsSectionTarget, scrollToCmsSection } from './utils/actionRuntime';

export default function App() {
  const [view, setView] = useState<'landing' | 'admin-login' | 'admin-cms'>('landing');
  const [config, setConfig] = useState<LandingPageConfig | null>(null);
  const [adminConfig, setAdminConfig] = useState<LandingPageConfig | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [pageId, setPageId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null);
  const adminRequestId = useRef(0);
  const [isPreview, setIsPreview] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [publicErrorCode, setPublicErrorCode] = useState<string | null>(null);
  const [publicPersistence, setPublicPersistence] = useState<any>(null);

  const loadPublic = async () => {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview_token');
    const maxAttempts = preview ? 1 : 12;
    let lastError: any = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const next = preview ? await getPreviewConfig(preview) : await fetchPublishedConfig(location.pathname);
        setConfig(normalizeLandingConfig(next));
        setIsPreview(!!preview);
        setPublicError(null);
        setPublicErrorCode(null);
        setPublicPersistence(null);
        return;
      } catch (error: any) {
        lastError = error;
        const retryable = !preview && (error?.code === 'CLOUD_PERSISTENCE_UNAVAILABLE' || /Cloud Firestore|khôi phục bản Publish/i.test(String(error?.message || '')));
        if (!retryable || attempt === maxAttempts - 1) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(500 + attempt * 250, 1500)));
      }
    }
    console.warn(lastError);
    setIsPreview(!!preview);
    setPublicError(lastError?.message || 'Không thể tải Landing Page.');
    setPublicErrorCode(lastError?.code || null);
    setPublicPersistence(lastError?.persistence || null);
  };

  const loadAdmin = async (id?: string) => {
    const requestId = ++adminRequestId.current;
    setAdminLoading(true);
    setAdminLoadError(null);
    setAdminConfig(null);
    try {
      const next = await fetchAdminConfig(id);
      if (!next) throw new Error('Máy chủ không trả về cấu hình CMS.');
      if (requestId === adminRequestId.current) setAdminConfig(normalizeLandingConfig(next));
    } catch (e: any) {
      console.warn('loadAdmin error:', e);
      if (requestId === adminRequestId.current) setAdminLoadError(e?.message || 'Không thể tải cấu hình CMS.');
      throw e;
    } finally {
      if (requestId === adminRequestId.current) setAdminLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Entering #admin must not wait for a potentially unpublished or unavailable
      // public Landing Page. Load its appearance opportunistically; auth and CMS
      // status use separate, authenticated requests.
      const adminRequested = location.hash === '#admin' || new URLSearchParams(location.search).get('view') === 'admin';
      if (adminRequested) {
        void fetchPublishedConfig(location.pathname)
          .then(next => setConfig(normalizeLandingConfig(next)))
          .catch(() => {});
      } else {
        await loadPublic();
      }
      const token = getStoredAdminToken();
      if (token) {
        try {
          const session = await getAdminSession();
          setUser(session.user);
        } catch {
          setStoredAdminToken(null);
        }
      }
      if (adminRequested) setView(getStoredAdminToken() ? 'admin-cms' : 'admin-login');
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (view === 'admin-cms' && user) void loadAdmin(pageId).catch(() => {});
  }, [view, user, pageId]);

  useEffect(() => {
    const expired = () => {
      setUser(null);
      setAdminConfig(null);
      setStoredAdminToken(null);
      if (location.hash === '#admin' || view === 'admin-cms') setView('admin-login');
    };
    window.addEventListener('cms-auth-expired', expired as EventListener);
    return () => window.removeEventListener('cms-auth-expired', expired as EventListener);
  }, [view]);

  // Restore section anchors after dynamic page content has rendered and keep
  // browser Back/Forward navigation aligned with section URLs.
  useEffect(() => {
    if (view !== 'landing' || !config) return;
    let retryTimer: number | undefined;
    const syncHashToSection = () => {
      const target = normalizeCmsSectionTarget(window.location.hash);
      if (!target || target === 'admin') return;
      let attempts = 0;
      const tryScroll = () => {
        if (scrollToCmsSection(target, { historyMode: 'none' })) return;
        attempts += 1;
        if (attempts < 12) retryTimer = window.setTimeout(tryScroll, 100);
      };
      tryScroll();
    };
    syncHashToSection();
    window.addEventListener('hashchange', syncHashToSection);
    window.addEventListener('popstate', syncHashToSection);
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener('hashchange', syncHashToSection);
      window.removeEventListener('popstate', syncHashToSection);
    };
  }, [view, config]);

  // Keep the browser tab icon in sync in every SPA view, including #admin.
  // Admin may be editing a draft page, while public config remains the fallback.
  useEffect(() => {
    const active = view === 'admin-cms' ? (adminConfig || config) : config;
    if (active) applySiteFavicon(active);
  }, [view, adminConfig, config]);

  const goAdmin = () => setView(user ? 'admin-cms' : 'admin-login');
  const loginSuccess = async (authUser?: AdminUser) => {
    if (authUser) setUser(authUser);
    setView('admin-cms');
    window.location.hash = 'admin';
  };
  const logout = async () => {
    try { await logoutAdmin(); } catch {}
    setUser(null);
    setAdminConfig(null);
    setView('landing');
    history.replaceState(null, '', location.pathname);
    void loadPublic();
  };
  const viewLanding = () => {
    setView('landing');
    history.replaceState(null, '', location.pathname);
    loadPublic();
  };

  if (loading) return <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3"/><p className="text-xs text-neutral-400">Đang tải...</p></div>;
  if (view === 'admin-login') return <AdminLogin settings={config?.adminLoginSettings} brandName={config?.brandName} onSuccess={loginSuccess} onBackToLanding={() => setView('landing')}/>;
  if (view === 'admin-cms' && user) {
    if (adminLoadError && !adminLoading) {
      const cloudUnavailable = /Cloud|Firestore|persistence|khôi phục/i.test(adminLoadError);
      return <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 text-neutral-800">
        <div role="alert" className="w-full max-w-lg rounded-2xl bg-white border border-neutral-200 p-7 shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Không tải được cấu hình CMS</h1>
          <p className="mt-3 text-sm text-neutral-700 break-words">{adminLoadError}</p>
          <p className="mt-3 text-sm text-neutral-500">{cloudUnavailable
            ? 'Cloud Firestore chưa sẵn sàng. Hãy kiểm tra trạng thái kết nối và cấu hình Cloud trên Render. Không xóa hoặc khởi tạo lại database đang có dữ liệu.'
            : 'Máy chủ chưa trả về cấu hình quản trị. Kiểm tra kết nối hoặc phiên đăng nhập rồi thử lại.'}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadAdmin(pageId).catch(() => {})} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Thử lại</button>
            <a href="/api/cloud/status" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700">Trạng thái Cloud</a>
            <button type="button" onClick={() => { void logoutAdmin().catch(() => {}).finally(() => { setUser(null); setAdminConfig(null); setStoredAdminToken(null); setView('admin-login'); }); }} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700">Đăng xuất</button>
          </div>
        </div>
      </div>;
    }
    if (adminLoading || !adminConfig) {
      return <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center text-neutral-700" role="status"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3"/><p className="text-sm font-semibold">Đang tải cấu hình CMS...</p></div>;
    }
    return (
      <ErrorBoundary
        fallbackTitle="Đã xảy ra sự cố trong trang Quản trị"
        onReset={() => loadAdmin(pageId)}
      >
        <AdminDashboard
          initialConfig={adminConfig}
          user={user}
          currentPageId={pageId}
          onPageChange={setPageId}
          onLogout={logout}
          onViewLandingPage={viewLanding}
        />
      </ErrorBoundary>
    );
  }

  const embedSectionId = new URLSearchParams(location.search).get('embed_section');
  if (embedSectionId && !publicError && config) {
    const embedded = (config.sections || []).find(s => s.id === embedSectionId || s.anchorId === embedSectionId);
    if (!embedded) return <div className="min-h-screen bg-white flex items-center justify-center p-6 text-sm text-neutral-500">Không tìm thấy khối nội dung cần nhúng.</div>;
    return <CmsConfigProvider config={config}><div className="min-h-screen bg-transparent"><DynamicSection section={embedded} /></div></CmsConfigProvider>;
  }

  if (publicError) return <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
    <div className="max-w-lg w-full bg-white border border-neutral-200 rounded-3xl shadow-sm p-8 text-center">
      <div className="text-5xl font-black text-neutral-200 mb-4">{publicErrorCode === 'CLOUD_PERSISTENCE_UNAVAILABLE' ? '503' : '404'}</div>
      <h1 className="text-xl font-black text-neutral-900">{publicErrorCode === 'CLOUD_PERSISTENCE_UNAVAILABLE' ? 'Cloud Firestore chưa sẵn sàng' : 'Landing Page không khả dụng'}</h1>
      <p className="mt-2 text-sm text-neutral-500">{publicError}</p>
      {publicPersistence?.error && <div className="mt-4 text-left rounded-2xl bg-neutral-50 border border-neutral-200 p-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">Chi tiết kết nối</div>
        <div className="text-xs text-neutral-700 break-words">{publicPersistence.error}</div>
        {publicPersistence.projectId && <div className="mt-2 text-[11px] text-neutral-400">Project: {publicPersistence.projectId}</div>}
      </div>}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button type="button" onClick={() => { setLoading(true); loadPublic().finally(() => setLoading(false)); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">Tải lại</button>
        <button type="button" onClick={goAdmin} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">Đăng nhập</button>
      </div>
    </div>
  </div>;

  if (!config) return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin"/></div>;

  return (
    <ErrorBoundary
      fallbackTitle="Đã xảy ra sự cố hiển thị Landing Page"
      onReset={() => loadPublic()}
    >
      <LandingPage config={config} onAdminClick={goAdmin} isPreview={isPreview}/>
      {isPreview && <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] bg-amber-400 text-black px-4 py-2 rounded-full text-xs font-black shadow-lg">PREVIEW BẢN NHÁP – KHÔNG PHẢI LIVE</div>}
    </ErrorBoundary>
  );
}
