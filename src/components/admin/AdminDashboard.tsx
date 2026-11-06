import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Clock,
  Eye,
  FileSpreadsheet,
  Globe,
  History,
  LayoutList,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Palette,
  Save,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  UserCog,
  Users,
  ChevronRight,
  Compass,
  ArrowRight,
  X,
  FileText,
  HelpCircle,
  Brain,
  MessageSquare,
  Sliders,
  Activity,
} from 'lucide-react';
import { AdminUser, LandingPageConfig, LeadSubmission } from '../../types';
import { normalizeLandingConfig } from '../../utils/configDefaults';
import { safeMediaUrl } from '../../utils/urlSafety';
import { getUiMapping } from '../../utils/uiLibrary';
import '../../styles/cmsWorkspace2026.css';
import '../../styles/tailadminCms.css';
import '../../styles/cmsTailAdminActual.css';
import { createPreviewToken, fetchAdminLeads, publishConfig, saveAdminConfig } from '../../services/api';
import { signOutFirebase } from '../../services/firebaseAuth';
import { subscribeToRealtimeLeads } from '../../services/firebaseRealtime';
import { CloudStatusHeaderBadge } from './CloudStatusHeaderBadge';
import { LeadManagement } from './LeadManagement';
import { GoogleSheetsPanel } from './GoogleSheetsPanel';
import { FormBuilder } from './FormBuilder';
import { UnifiedFormManager } from './UnifiedFormManager';
import { ContentEditor } from './ContentEditor';
import { CountdownConfig } from './CountdownConfig';
import { FooterBuilder } from './FooterBuilder';
import { LandingPage } from '../landing/LandingPage';
import { WebsiteSettingsPanel } from './WebsiteSettings';
import { RevisionHistory } from './RevisionHistory';
import { PageManager } from './PageManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AdminAccountManager } from './AdminAccountManager';
import { SeoManager } from './SeoManager';
import { AdminLoginSettingsEditor } from './AdminLoginSettingsEditor';
import { KnowledgeManager } from './KnowledgeManager';
import { ChatHistoryManager } from './ChatHistoryManager';

interface Props { initialConfig:LandingPageConfig; user:AdminUser; currentPageId?:string; onPageChange:(id:string)=>void; onLogout:()=>void; onViewLandingPage:()=>void; }
type Tab='analytics'|'pages'|'seo'|'leads'|'sheets'|'forms'|'content'|'footer'|'countdown'|'settings'|'login-design'|'revisions'|'accounts'|'ai-settings'|'ai-knowledge'|'chat-history'|'ai-health';

const canonicalizeConfigValue=(value:any):any=>{
  if(Array.isArray(value))return value.map(canonicalizeConfigValue);
  if(value&&typeof value==='object'){
    const out:Record<string,any>={};
    for(const key of Object.keys(value).sort()){
      const next=value[key];
      if(next!==undefined)out[key]=canonicalizeConfigValue(next);
    }
    return out;
  }
  return value;
};

const fingerprintConfig=(value:LandingPageConfig)=>JSON.stringify(canonicalizeConfigValue(normalizeLandingConfig(value)));

export const AdminDashboard:React.FC<Props>=({initialConfig,user,currentPageId,onPageChange,onLogout,onViewLandingPage})=>{
  const [currentUser, setCurrentUser] = useState<AdminUser>(user);
  const [config,setConfig]=useState<LandingPageConfig>(()=>normalizeLandingConfig(initialConfig));
  const safeConfig = useMemo(() => normalizeLandingConfig(config || initialConfig), [config, initialConfig]);
  // Same logo configuration as the public Landing header (no duplicated CMS asset).
  const cmsBrandLogo = safeMediaUrl(safeConfig.websiteSettings?.header?.logoUrl || safeConfig.headerLogoUrl || safeConfig.brandLogoUrl);
  const [tab,setTab]=useState<Tab>('analytics');
  const [leads,setLeads]=useState<LeadSubmission[]>([]);
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [notice,setNotice]=useState<{text:string;type:'success'|'error'|'info'}|null>(null);
  const [leadsLoadError,setLeadsLoadError]=useState<string|null>(null);
  const [preview,setPreview]=useState(false);
  const [device,setDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const editRevision=useRef(0);
  const mounted=useRef(true);
  const noticeTimer=useRef<number | undefined>(undefined);
  const savedConfigRef=useRef<LandingPageConfig>(normalizeLandingConfig(initialConfig));
  const savedConfigFingerprint=useRef(fingerprintConfig(savedConfigRef.current));
  const currentConfigFingerprint=useRef(savedConfigFingerprint.current);


  const showNotice=(next:{text:string;type:'success'|'error'|'info'}|null, duration=4000)=>{
    window.clearTimeout(noticeTimer.current);
    setNotice(next);
    if(next){
      noticeTimer.current=window.setTimeout(()=>{
        if(mounted.current) setNotice(null);
      },duration);
    }
  };

  // RBAC Fine-grained Permissions
  const isSuper = currentUser.role === 'superadmin';
  const perms = currentUser.permissions;

  const isTabAllowed = (tabId: string): boolean => {
    if (isSuper) return true;
    if (perms?.allowedTabs && perms.allowedTabs.length > 0) {
      return perms.allowedTabs.includes(tabId);
    }
    if (tabId === 'accounts') return false;
    if (currentUser.role === 'viewer') return false;
    return true;
  };

  const canEditTab = (tabId: string): boolean => {
    if (isSuper) return true;
    if (currentUser.role === 'viewer') return false;
    if (perms?.canEditTabs && perms.canEditTabs.length > 0) {
      return perms.canEditTabs.includes(tabId);
    }
    return true;
  };

  const canEdit = isSuper || (currentUser.role !== 'viewer' && canEditTab('content'));
  const canAnalytics = isTabAllowed('analytics');
  const canAccounts = isSuper;
  const canAdvanced = isSuper || (currentUser.role === 'marketing_admin' && canEditTab('countdown'));
  const canPublish = isSuper || (perms?.canPublish ?? (currentUser.role === 'marketing_admin'));
  const canLeads = isTabAllowed('leads');
  const canDeleteLeads = isSuper || (perms?.canDeleteLeads ?? (currentUser.role === 'marketing_admin'));
  const canSheets = isTabAllowed('sheets') && (isSuper || currentUser.role === 'marketing_admin' || canEditTab('sheets'));
  const canForms = isTabAllowed('forms') && (isSuper || currentUser.role === 'marketing_admin' || canEditTab('forms'));
  const canGlobal = isTabAllowed('settings') && (isSuper || currentUser.role === 'marketing_admin' || canEditTab('settings'));
  const canChatHistory = isTabAllowed('chat-history');
  const canViewAI = isSuper || (perms?.canViewAI ?? (isTabAllowed('ai-knowledge') || isTabAllowed('ai-settings')));
  const canEditAI = isSuper || (perms?.canEditAI ?? (canEditTab('ai-knowledge') || canEditTab('ai-settings')));

  useEffect(()=>{
    editRevision.current+=1;
    const normalized=normalizeLandingConfig(initialConfig);
    savedConfigRef.current=normalized;
    savedConfigFingerprint.current=fingerprintConfig(normalized);
    currentConfigFingerprint.current=savedConfigFingerprint.current;
    setConfig(normalized);
    setDirty(false);
  },[initialConfig,currentPageId]);

  const leadDataTab = tab === 'leads' || tab === 'sheets';

  const loadLeads=async()=>{
    if(!canLeads || !leadDataTab)return;
    try{
      const data = await fetchAdminLeads();
      if (mounted.current && Array.isArray(data)) {
        setLeads(data);
        setLeadsLoadError(null);
      }
    }catch(e:any){
      // Leads are secondary to the CMS workspace. A transient Render gateway
      // error must never paint a global red banner over unrelated pages.
      if (mounted.current) {
        console.warn('[Leads] Không thể tải danh sách khách hàng:', e);
        setLeadsLoadError(e?.message || 'Không thể tải danh sách khách hàng');
      }
    }
  };

  useEffect(()=>{
    if (!canLeads || !leadDataTab) return;

    // Initial authoritative API read, then one bounded Firestore listener while
    // the Leads/Sheets page is actually open. Leaving the tab unsubscribes it.
    void loadLeads();
    const unsubscribe = subscribeToRealtimeLeads(
      (nextLeads) => {
        if (mounted.current && Array.isArray(nextLeads)) {
          setLeads(nextLeads);
          setLeadsLoadError(null);
        }
      },
      (error) => {
        // Firebase may be unlinked for a local/admin account. The API read above
        // remains the fallback; do not surface a noisy global error banner.
        console.debug('[Leads realtime] listener unavailable:', error?.message || error);
      },
    );
    return () => unsubscribe();
  },[canLeads, leadDataTab]);


  const save=async(silent=false,throwOnError=false)=>{
    if(!canEdit)return;
    if(!dirty){
      if(!silent)showNotice({text:'Không có thay đổi mới cần lưu.',type:'info'},2200);
      return;
    }
    const revision=editRevision.current;
    const snapshot=safeConfig;
    setSaving(true);
    try{
      // Explicit Save only: one API write, which commits the changed page
      // directly to Firestore. No listener, confirmation round-trip, or reload.
      const r=await saveAdminConfig(snapshot,currentUser.email,currentPageId);
      if(mounted.current&&editRevision.current===revision){
        const persisted=normalizeLandingConfig(r?.config || snapshot);
        savedConfigRef.current=persisted;
        savedConfigFingerprint.current=fingerprintConfig(persisted);
        currentConfigFingerprint.current=savedConfigFingerprint.current;
        setConfig(persisted);
        setDirty(false);
        if(!silent)showNotice({text:r?.persistence?.cloud==='queued'?'Đã lưu bản nháp ngay trên server. Firestore đang đồng bộ nền; muốn áp dụng ngoài website hãy bấm Publish.':'Đã lưu bản nháp thành công.',type:'success'});
      }
    }catch(e:any){
      if(mounted.current)showNotice({text:`Lưu thất bại: ${e.message}`,type:'error'},6000);
      if(throwOnError)throw e;
    }finally{
      if(mounted.current)setSaving(false);
    }
  };

  const change=(next:LandingPageConfig)=>{
    if(!canEdit||!next)return;
    const normalized=normalizeLandingConfig(next);
    const nextFingerprint=fingerprintConfig(normalized);
    // Mounting/switching CMS tabs may re-emit the current value from a child editor.
    // A semantic no-op must never mark the whole CMS as dirty or trigger needless Redis/Firestore writes.
    if(nextFingerprint===currentConfigFingerprint.current)return;
    ++editRevision.current;
    currentConfigFingerprint.current=nextFingerprint;
    setConfig(normalized);
    setDirty(nextFingerprint!==savedConfigFingerprint.current);
    // Editing is local only. Nothing is written to Firestore until Save Draft
    // or Publish is explicitly pressed.
  };

  const applyPersistedSeo=(savedSeo: NonNullable<LandingPageConfig['websiteSettings']>['seo'])=>{
    if(!savedSeo)return;
    ++editRevision.current;
    const savedBase=normalizeLandingConfig(savedConfigRef.current);
    const nextSaved=normalizeLandingConfig({
      ...savedBase,
      websiteSettings:{
        ...savedBase.websiteSettings!,
        seo:{...savedBase.websiteSettings!.seo,...savedSeo},
      },
    });
    savedConfigRef.current=nextSaved;
    savedConfigFingerprint.current=fingerprintConfig(nextSaved);

    setConfig(current=>{
      const currentBase=normalizeLandingConfig(current);
      const nextCurrent=normalizeLandingConfig({
        ...currentBase,
        websiteSettings:{
          ...currentBase.websiteSettings!,
          seo:{...currentBase.websiteSettings!.seo,...savedSeo},
        },
      });
      const nextFingerprint=fingerprintConfig(nextCurrent);
      currentConfigFingerprint.current=nextFingerprint;
      setDirty(nextFingerprint!==savedConfigFingerprint.current);
      return nextCurrent;
    });
  };

  useEffect(()=>{
    mounted.current=true;
    return()=>{
      mounted.current=false;
       window.clearTimeout(noticeTimer.current);
    };
  },[]);

  const publish=async()=>{
    if(!canPublish)return;
    const revision=++editRevision.current;
    const snapshot=safeConfig;
    setPublishing(true);
    try{
      const r=await publishConfig(snapshot,currentUser.email,undefined,currentPageId);
      if(mounted.current&&editRevision.current===revision){
        const publishedConfig = normalizeLandingConfig(r?.config || snapshot);
        savedConfigRef.current=publishedConfig;
        savedConfigFingerprint.current=fingerprintConfig(publishedConfig);
        currentConfigFingerprint.current=savedConfigFingerprint.current;
        setConfig(publishedConfig);
        setDirty(false);
        showNotice({text:r?.persistence?.cloud==='queued'?'Đã Publish lên website. Firestore đang đồng bộ nền.':'Đã Publish thành công.',type:'success'});
      }
    }catch(e:any){
      if(mounted.current)showNotice({text:e.message,type:'error'},6000);
    }finally{
      if(mounted.current)setPublishing(false);
    }
  };

  const previewNewTab=async()=>{
    try{
      if(dirty)await save(true,true);
      const r=await createPreviewToken(currentPageId);
      window.open(r.url,'_blank','noopener,noreferrer');
    }catch(e:any){
      if(mounted.current)showNotice({text:e.message,type:'error'},6000);
    }
  };

  const logout=async()=>{
    try{await signOutFirebase();}catch{}
    onLogout();
  };

  const allFields=useMemo(()=>{
    const fields = safeConfig.formFields || [];
    const map=new Map(fields.map(f=>[f.name,f]));
    for(const form of safeConfig.websiteSettings?.forms||[]) {
      for(const f of form?.fields || []) {
        if(!map.has(f.name))map.set(f.name,f);
      }
    }
    return [...map.values()];
  },[safeConfig]);

  // Keyboard shortcut for Quick Jump (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickJump(v => !v);
      } else if (e.key === 'Escape') {
        setShowQuickJump(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 5 CORE LOGICAL CMS CATEGORIES
  const categories = useMemo(() => [
    {
      id: 'overview',
      label: 'Tổng quan & Báo cáo',
      shortLabel: 'Báo cáo',
      icon: BarChart3,
      description: 'Chỉ số chuyển đổi, lưu lượng truy cập và lịch sử bản nháp',
      items: [
        { id: 'analytics' as Tab, label: 'Báo cáo Hiệu quả & Chuyển đổi', shortLabel: 'Hiệu quả (Analytics)', icon: BarChart3, description: 'Phân tích lượt truy cập, tỷ lệ chuyển đổi, chi phí quảng cáo', allowed: isTabAllowed('analytics') },
        { id: 'revisions' as Tab, label: 'Lịch sử Phiên bản (Revisions)', shortLabel: 'Lịch sử Revisions', icon: History, description: 'Xem lại các lần xuất bản và khôi phục bản nháp', allowed: isTabAllowed('revisions') }
      ]
    },
    {
      id: 'pages',
      label: 'Quản lý Trang',
      shortLabel: 'Trang',
      icon: LayoutList,
      description: 'Quản lý danh sách các Landing Pages, nhân bản và đường dẫn slug',
      items: [
        { id: 'pages' as Tab, label: 'Danh Sách Landing Pages', shortLabel: 'Danh Sách Pages', icon: LayoutList, description: 'Tạo trang mới, đổi đường dẫn slug, duplicate cấu hình', allowed: isTabAllowed('pages') }
      ]
    },
    {
      id: 'builder',
      label: 'Nội dung & Giao diện',
      shortLabel: 'Nội dung',
      icon: Sparkles,
      description: 'Khối nội dung, Hero banner, biểu mẫu tư vấn, đếm ngược và chân trang',
      items: [
        { id: 'content' as Tab, label: 'Khối Nội Dung & Hero Banner', shortLabel: 'Khối Nội Dung & Hero', icon: Sparkles, description: 'Chỉnh sửa Hero, các section sản phẩm, quyền lợi, bảng giá', allowed: isTabAllowed('content') },
        { id: 'forms' as Tab, label: 'Biểu Mẫu Tư Vấn (Form Center)', shortLabel: 'Biểu Mẫu Form', icon: Type, description: 'Trường nhập liệu, tiêu đề, nút bấm & thông báo đăng ký', allowed: isTabAllowed('forms') },
        { id: 'countdown' as Tab, label: 'Đồng Hồ Đếm Ngược Khuyến Mãi', shortLabel: 'Đồng Hồ Countdown', icon: Clock, description: 'Cấu hình đếm ngược kích thích chuyển đổi ưu đãi', allowed: isTabAllowed('countdown') },
        { id: 'footer' as Tab, label: 'Chân Trang & Thông Tin Hotline', shortLabel: 'Chân Trang (Footer)', icon: Palette, description: 'Thông tin chân trang, bản quyền, số hotline & Zalo tư vấn', allowed: isTabAllowed('footer') }
      ]
    },
    {
      id: 'crm',
      label: 'Khách hàng & Dữ liệu',
      shortLabel: 'Khách hàng',
      icon: Users,
      description: 'Quản lý leads khách hàng đăng ký và đồng bộ Google Sheets',
      items: [
        { id: 'leads' as Tab, label: 'Danh Sách Khách Hàng (Leads)', shortLabel: 'Khách Hàng (Leads)', icon: Users, description: 'Quản lý thông tin khách hàng, bộ lọc, tìm kiếm và xuất file CSV', allowed: isTabAllowed('leads'), badge: leads.length > 0 ? leads.length : undefined },
        { id: 'sheets' as Tab, label: 'Đồng Bộ Google Sheets', shortLabel: 'Google Sheets', icon: FileSpreadsheet, description: 'Kết nối tự động và đẩy leads sang bảng tính Google Sheets', allowed: isTabAllowed('sheets') }
      ]
    },
    {
      id: 'ai',
      label: 'AI Tri thức & Chatbot',
      shortLabel: 'AI Knowledge',
      icon: Brain,
      description: 'Huấn luyện AI với tài liệu nội bộ, quản lý tri thức sản phẩm & lịch sử chat can thiệp trực tiếp',
      items: [
        {
          id: 'ai-settings' as Tab,
          label: 'Cấu Hình & Thiết Lập AI',
          shortLabel: 'Thiết Lập & Cấu Hình AI',
          icon: Sliders,
          description: 'Xem tham số mô hình Gemini, nhiệt độ sáng tạo, kịch bản xưng hô & cấu hình chatbot',
          allowed: canViewAI && (isTabAllowed('ai-settings') || isTabAllowed('ai-knowledge')),
        },
        {
          id: 'ai-knowledge' as Tab,
          label: 'Quản Lý Tri Thức & Huấn Luyện AI',
          shortLabel: 'Tri Thức AI & Tài Liệu',
          icon: Brain,
          description: 'Upload tài liệu nội bộ (PDF/Word/Excel) bóc tách tri thức sản phẩm cho AI Chatbot',
          allowed: canViewAI && isTabAllowed('ai-knowledge'),
        },
        {
          id: 'chat-history' as Tab,
          label: 'Lịch Sử Chat & Can Thiệp AI',
          shortLabel: 'Lịch Sử Chat & Can Thiệp',
          icon: MessageSquare,
          description: 'Xem lịch sử khách chat với AI, nhân viên can thiệp chat tiếp tục, timeout 15s',
          allowed: isTabAllowed('chat-history'),
        },
        {
          id: 'ai-health' as Tab,
          label: 'Sức Khỏe API & Cache Redis',
          shortLabel: 'Sức Khỏe API & Cache',
          icon: Activity,
          description: 'Theo dõi lịch sử lỗi 503/404, cảnh báo Quota Exceeded và hiệu quả Cache Redis',
          allowed: canViewAI,
        },
      ],
    },
    {
      id: 'system',
      label: 'Cài đặt & Hệ thống',
      shortLabel: 'Cài đặt',
      icon: Settings2,
      description: 'Bộ công cụ SEO chuyên nghiệp, cài đặt website toàn cục và quản trị',
      items: [
        { id: 'seo' as Tab, label: 'SEO & OpenGraph Mạng Xã Hội', shortLabel: 'SEO & Mạng Xã Hội', icon: Search, description: 'Google Search preview, thẻ Facebook/Zalo, chấm điểm SEO tự động', allowed: isTabAllowed('seo') },
        { id: 'settings' as Tab, label: 'Cài Đặt Website & Style Toàn Cục', shortLabel: 'Cài Đặt Website', icon: Settings2, description: 'Bảng màu, kiểu chữ font, header, popups tư vấn và style presets', allowed: isTabAllowed('settings') },
        { id: 'login-design' as Tab, label: 'Giao Diện Đăng Nhập CMS', shortLabel: 'Giao Diện Login', icon: Lock, description: 'Tùy biến hình nền, logo và màu sắc màn hình đăng nhập quản trị', allowed: isTabAllowed('login-design') },
        { id: 'accounts' as Tab, label: 'Quản Lý Tài Khoản Quản Trị', shortLabel: 'Tài Khoản Admin', icon: UserCog, description: 'Phân quyền tài khoản superadmin, marketing và content editor', allowed: isSuper }
      ]
    }
  ], [currentUser, perms, isSuper, leads.length]);

  // Current category based on active tab
  const activeCategory = useMemo(() => {
    return categories.find(cat => cat.items.some(item => item.id === tab)) || categories[0];
  }, [categories, tab]);

  // Switch category: switch to the first allowed tab in that category
  const handleSelectCategory = (catId: string) => {
    setSidebarOpen(false);
    setSidebarCollapsed(false);
    const targetCat = categories.find(c => c.id === catId);
    if (!targetCat) return;
    if (targetCat.items.some(it => it.id === tab)) return; // already in this category
    const firstAllowed = targetCat.items.find(it => it.allowed);
    if (firstAllowed) {
      setTab(firstAllowed.id);
    }
  };

  // Quick Jump filtered items
  const quickJumpFiltered = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    const list: Array<{ catLabel: string; item: (typeof categories)[0]['items'][0] }> = [];
    categories.forEach(cat => {
      cat.items.filter(it => it.allowed).forEach(item => {
        if (!q || item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)) {
          list.push({ catLabel: cat.label, item });
        }
      });
    });
    return list;
  }, [categories, quickSearch]);

  return (
    <div data-ui-density={getUiMapping(safeConfig.websiteSettings,'cmsDensity')} data-ui-controls={getUiMapping(safeConfig.websiteSettings,'cmsControls')} data-ui-layout="cms-tailadmin-rework" className={`cms-admin-ui cms-admin-modern cms-v2-root cms-tailadmin cms-tailadmin-real min-h-screen flex flex-col font-sans ${sidebarCollapsed ? 'cms-v2-collapsed' : ''} ${sidebarOpen ? 'cms-v2-mobile-open' : ''}`}>
      {/* 1. TOP HEADER BAR */}
      <header className="cms-ui-admin-header cms-v2-header sticky top-0 z-40 px-4 py-2.5">
        <div className="cms-v2-topbar-inner flex items-center justify-between gap-3">
          <button type="button" className="cms-v2-menu-toggle" onClick={() => { if (window.matchMedia('(max-width: 1023px)').matches) setSidebarOpen(v => !v); else setSidebarCollapsed(v => !v); }} aria-label="Thu gọn hoặc mở menu quản trị" aria-expanded={sidebarOpen} title="Thu gọn / mở rộng thanh điều hướng">
            <LayoutList className="w-4 h-4" />
          </button>
          <div className="cms-actual-header-title min-w-0">
            <div className="cms-actual-top-crumb">Workspace <ChevronRight className="w-3 h-3" /> {activeCategory.shortLabel}</div>
            <strong className="truncate">{activeCategory.items.find(item => item.id === tab)?.shortLabel || activeCategory.label}</strong>
            {dirty && <span className="cms-actual-unsaved" role="status">Chưa lưu</span>}
          </div>

          {/* Single action toolbar. Responsive wrapping keeps primary actions accessible. */}
          <div className="cms-topbar-actions" role="toolbar" aria-label="Tác vụ CMS">
            <div className="cms-topbar-cloud"><CloudStatusHeaderBadge
              user={currentUser}
              onUserUpdate={setCurrentUser}
              onOpenFirebaseSettings={() => setTab('settings')}
              leads={leads}
              onLeadsSynced={loadLeads}
            /></div>

            {/* Quick Jump Trigger */}
            <button
              type="button"
              onClick={() => {
                setQuickSearch('');
                setShowQuickJump(true);
              }}
              className="cms-topbar-search inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition-colors border border-neutral-700 cursor-pointer"
              title="Tìm kiếm mục cài đặt (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px]">Tìm nhanh</span>
              <kbd className="text-[9px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400 font-mono">Ctrl K</kbd>
            </button>

            {/* Live Preview Device Modal */}
            <button
              onClick={() => setPreview(true)}
              className="cms-topbar-action cms-topbar-preview p-2 sm:px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex gap-1.5 items-center transition-colors border border-neutral-700 cursor-pointer"
              type="button"
              aria-label="Xem trước giao diện khách hàng"
              title="Xem trước giao diện khách hàng"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Xem Trước</span>
            </button>

            {/* Save Draft */}
            {canEdit && (
              <button
                onClick={() => save(false)}
                disabled={saving || !dirty}
                className="cms-topbar-action cms-topbar-save p-2 sm:px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex gap-1.5 items-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-neutral-700 cursor-pointer"
                type="button"
                aria-label="Lưu Nháp"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">Lưu Nháp</span>
              </button>
            )}

            {/* Publish */}
            {canPublish && (
              <button
                onClick={publish}
                disabled={publishing}
                className="cms-topbar-action cms-topbar-publish p-2 sm:px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex gap-1.5 items-center disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                type="button"
                aria-label="Xuất Bản Live"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden sm:inline">Xuất Bản Live</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`text-xs font-bold text-center px-4 py-2 transition-all shadow-xs ${
            notice.type === 'error'
              ? 'bg-red-600 text-white'
              : notice.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="cms-v2-shell">
      {sidebarOpen && <button type="button" className="cms-v2-scrim" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu" />}
      {/* 2. CATEGORY NAVIGATION BAR (LEVEL 1) */}
      <nav className="cms-ui-primary-nav cms-v2-sidebar" aria-label="Điều hướng CMS">
        <div className="cms-v2-sidebar-inner">
          <div className="cms-actual-brand">
            <button type="button" className="cms-actual-brand-link" onClick={onViewLandingPage} title="Mở website Bảo Việt">
              {cmsBrandLogo ? <img src={cmsBrandLogo} alt="Bảo Việt" className="cms-actual-brand-logo" /> : <Globe aria-label="Logo chưa được cấu hình" className="cms-actual-brand-mark" />}
            </button>

          </div>
          <div className="cms-actual-menu-caption">MAIN MENU</div>
          <div className="cms-v2-sidebar-scroll cms-actual-nav-list">
            {categories.filter(cat => cat.items.some(item => item.allowed)).map(cat => {
              const Icon = cat.icon;
              const expanded = activeCategory.id === cat.id;
              return (
                <div className={`cms-actual-nav-group ${expanded ? 'is-open' : ''}`} key={cat.id}>
                  <button type="button" className={`cms-actual-nav-parent ${expanded ? 'is-active' : ''}`}
                    onClick={() => handleSelectCategory(cat.id)} title={cat.label}
                    aria-expanded={expanded} aria-controls={`cms-group-${cat.id}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="cms-actual-nav-name">{cat.shortLabel}</span>
                    {cat.id === 'crm' && leads.length > 0 && <span className="cms-actual-nav-badge">{leads.length}</span>}
                    <ChevronRight className="cms-actual-chevron w-4 h-4" />
                  </button>
                  <div className="cms-actual-nav-children" id={`cms-group-${cat.id}`} hidden={!expanded}>
                    {cat.items.filter(item => item.allowed).map(item => (
                      <button type="button" key={item.id} className={`cms-actual-nav-child ${tab === item.id ? 'is-selected' : ''}`}
                        onClick={() => { setTab(item.id); setSidebarOpen(false); }} title={item.description} aria-current={tab === item.id ? 'page' : undefined}>
                        <span className="cms-actual-nav-dot" aria-hidden="true" /><span>{item.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>
          <div className="cms-v2-sidebar-bottom">
            <span className="cms-v2-avatar">{(currentUser.email || 'AD').slice(0, 2).toUpperCase()}</span>
            <span className="cms-v2-sidebar-identity"><strong>{currentUser.email || 'Quản trị viên'}</strong><small>{currentUser.role}</small></span>
            <button onClick={logout} type="button" title="Đăng xuất khỏi CMS" aria-label="Đăng xuất khỏi CMS" className="cms-sidebar-logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>
      <div className="cms-v2-content">

      {/* All CMS navigation is in the sidebar: no second tab row. */}

      {/* 4. MAIN WORKSPACE */}
      <main className="cms-ui-admin-workspace cms-v2-workspace cms-actual-workspace flex-1 w-full p-4 sm:p-6 lg:p-8">
        {/* TailAdmin-style page context; navigation and edit callbacks are unchanged. */}
        <section className="cms-tail-context cms-actual-page-context" aria-label="Vị trí trong CMS">
          <div>
            <div className="cms-tail-breadcrumb">
              <span>Workspace</span><ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{activeCategory.shortLabel}</span><ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              <strong>{activeCategory.items.find(item => item.id === tab)?.shortLabel || activeCategory.shortLabel}</strong>
            </div>
            <h1 className="cms-tail-heading">{activeCategory.items.find(item => item.id === tab)?.shortLabel || activeCategory.label}</h1>
            <p className="cms-tail-description">{activeCategory.items.find(item => item.id === tab)?.description || activeCategory.description}</p>
          </div>
          <span className="cms-tail-status" data-dirty={dirty} role="status">
            <span className="cms-tail-status-dot" aria-hidden="true" />
            {dirty ? 'Bản nháp chưa lưu' : 'Không có chỉnh sửa đang chờ lưu'}
          </span>
        </section>
        {leadDataTab && leadsLoadError && (
          <div className="max-w-7xl mx-auto mb-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-center justify-between gap-3">
              <span>
                <strong>Dữ liệu khách hàng tạm thời chưa tải được.</strong> Hệ thống vẫn giữ dữ liệu hiện có và sẽ tự động kết nối lại.
              </span>
              <button
                type="button"
                onClick={loadLeads}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 font-bold hover:bg-amber-100 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Screen Mounting Based on Tab */}
        {tab === 'analytics' && <AnalyticsDashboard pageId={currentPageId} canEditCosts={canAdvanced} config={safeConfig} />}
        {tab === 'pages' && (
          <PageManager
            role={currentUser.role}
            currentPageId={currentPageId}
            onSelect={onPageChange}
            onOrderChange={(ids)=>{
              const navigation=safeConfig.websiteSettings?.navigation;
              if(!navigation)return;
              const order=new Map(ids.map((id,index)=>[id,index+1]));
              const items=(navigation.items||[]).map(item=>({...item,order:order.get(String(item.pageId))??item.order})).sort((a,b)=>a.order-b.order);
              change({...safeConfig,websiteSettings:{...safeConfig.websiteSettings!,navigation:{...navigation,items}}});
            }}
            onPreparePreviewPage={async(id)=>{
              if(id===currentPageId&&dirty)await save(true,true);
            }}
            onNavigateToEditor={() => setTab('content')}
          />
        )}
        {tab === 'seo' && <SeoManager currentConfig={safeConfig} onPersistedSeoChange={applyPersistedSeo} initialPageId={currentPageId} />}
        {tab === 'leads' && canLeads && <LeadManagement leads={leads} formFields={allFields} onRefresh={loadLeads} canDelete={canDeleteLeads} />}
        {tab === 'sheets' && canSheets && (
          <GoogleSheetsPanel
            config={safeConfig.googleSheets}
            formFields={allFields}
            leads={leads}
            onChange={(s) => change({ ...safeConfig, googleSheets: s })}
            onRefreshLeads={loadLeads}
          />
        )}
        {tab === 'forms' && canForms && <UnifiedFormManager config={safeConfig} onChange={change} />}
        {tab === 'content' && canEdit && <ContentEditor config={safeConfig} onChange={change} role={currentUser.role} onNavigateTab={(t) => setTab(t as Tab)} />}
        {tab === 'footer' && canAdvanced && <FooterBuilder config={safeConfig} onChange={change} />}
        {tab === 'settings' && canGlobal && (
          <WebsiteSettingsPanel
            config={safeConfig}
            onChange={change}
            role={currentUser.role}
            onNavigateTab={(t) => setTab(t as Tab)}
          />
        )}
        {tab === 'login-design' && canGlobal && <AdminLoginSettingsEditor config={safeConfig} onChange={change} />}
        {tab === 'accounts' && canAccounts && <AdminAccountManager />}
        {tab === 'revisions' && (
          <RevisionHistory
            pageId={currentPageId}
            canRestore={canPublish}
            canDelete={currentUser.role === 'superadmin' || currentUser.role === 'marketing_admin'}
            onRestore={(restored) => {
              const restoredConfig=normalizeLandingConfig(restored);
              currentConfigFingerprint.current=fingerprintConfig(restoredConfig);
              setConfig(restoredConfig);
              setDirty(currentConfigFingerprint.current!==savedConfigFingerprint.current);
              setNotice({ text: 'Đã đưa revision về bản nháp. Publish để áp dụng lên live.', type: 'success' });
            }}
          />
        )}
        {tab === 'ai-settings' && (
          <KnowledgeManager
            role={currentUser.role}
            config={safeConfig}
            onConfigChange={change}
            initialTab="settings"
            onNavigateTab={(t) => setTab(t as Tab)}
            canViewAI={canViewAI}
            canEditAI={canEditAI}
          />
        )}
        {tab === 'ai-knowledge' && (
          <KnowledgeManager
            role={currentUser.role}
            config={safeConfig}
            onConfigChange={change}
            initialTab="knowledge"
            onNavigateTab={(t) => setTab(t as Tab)}
            canViewAI={canViewAI}
            canEditAI={canEditAI}
          />
        )}
        {tab === 'ai-health' && (
          <KnowledgeManager
            role={currentUser.role}
            config={safeConfig}
            onConfigChange={change}
            initialTab="health"
            onNavigateTab={(t) => setTab(t as Tab)}
            canViewAI={canViewAI}
            canEditAI={canEditAI}
          />
        )}
        {tab === 'chat-history' && canChatHistory && (
          <ChatHistoryManager
            role={currentUser.role}
            canTakeover={perms?.canTakeoverChat ?? true}
          />
        )}
        {tab === 'countdown' && canAdvanced && (
          <CountdownConfig config={safeConfig.countdown} onChange={(countdown) => change({ ...safeConfig, countdown })} />
        )}
      </main>
      </div>
      </div>

      {/* 5. QUICK JUMP MODAL */}
      {showQuickJump && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 animate-in fade-in" role="dialog" aria-modal="true" aria-label="Tìm và chuyển nhanh đến chức năng CMS">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Chuyển Nhanh Danh Mục Quản Trị CMS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickJump(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Nhập tên mục cần tìm (ví dụ: SEO, form, màu sắc, lead, sheets, footer)..."
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1.5 cms-admin-modal-scroll pr-1">
              {quickJumpFiltered.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Không tìm thấy mục nào phù hợp với từ khóa "{quickSearch}".
                </div>
              ) : (
                quickJumpFiltered.map(({ catLabel, item }) => {
                  const ItemIcon = item.icon;
                  const isCurrent = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setShowQuickJump(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 border border-blue-200 text-blue-900'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isCurrent ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                            <span>{item.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500 font-normal">
                              {catLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">{item.description}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Mẹo: Bạn có thể nhấn <strong>Ctrl + K</strong> bất cứ lúc nào để mở hộp thoại này.</span>
              <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px]">Esc để đóng</kbd>
            </div>
          </div>
        </div>
      )}

      {/* 6. LIVE DEVICE PREVIEW MODAL */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col animate-in fade-in">
          <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between gap-3 border-b border-neutral-800">
            <button
              onClick={() => setPreview(false)}
              className="text-xs font-bold bg-neutral-800 hover:bg-neutral-700 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Đóng Xem Trước
            </button>

            <div className="flex p-1 rounded-xl bg-neutral-800 border border-neutral-700">
              {([
                ['desktop', Monitor, 'Máy tính'],
                ['tablet', Tablet, 'Máy tính bảng'],
                ['mobile', Smartphone, 'Điện thoại']
              ] as const).map(([id, Icon, name]) => (
                <button
                  key={id}
                  onClick={() => setDevice(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    device === id ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title={name}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={previewNewTab}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-xl flex gap-1.5 items-center transition-colors cursor-pointer shadow-xs"
            >
              <Globe className="w-4 h-4" />
              <span>Mở Tab Mới</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-neutral-950/60">
            <div
              className={`bg-white shadow-2xl overflow-auto transition-all ${
                device === 'desktop'
                  ? 'w-full max-w-7xl rounded-2xl min-h-[90vh]'
                  : device === 'tablet'
                  ? 'w-[768px] max-w-full h-[900px] rounded-3xl border-8 border-neutral-800'
                  : 'w-[390px] max-w-full h-[820px] rounded-[36px] border-8 border-neutral-800'
              }`}
            >
              <LandingPage config={safeConfig} isPreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
