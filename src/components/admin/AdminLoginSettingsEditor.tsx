import React, { useRef, useState } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Sliders,
  Layers,
  Sparkles,
  Eye,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Lock,
  ArrowLeft,
  Smartphone,
  Monitor,
  Maximize2,
  X,
  RotateCcw,
  Plus,
  Trash2,
  HelpCircle,
  Megaphone,
  Key,
  Fingerprint,
  Building2,
  Award,
  UserCheck,
  Type,
} from 'lucide-react';
import { AdminLoginSettings, LandingPageConfig, LoginBackgroundType, LoginCardPosition, LoginThemeMode, LoginCardIcon } from '../../types';
import { defaultAdminLoginSettings } from '../../data/defaultConfig';
import { AdminLogin } from './AdminLogin';
import { FontSelector } from '../common/FontSelector';

interface Props {
  config: LandingPageConfig;
  onChange: (config: LandingPageConfig) => void;
  onPreviewLogin?: () => void;
}

type Tab = 'presets' | 'background' | 'card' | 'branding' | 'features';

const CURATED_BACKGROUND_IMAGES = [
  {
    name: 'Tòa nhà tài chính hiện đại',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80',
    thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=60',
  },
  {
    name: 'Văn phòng số hóa cao cấp',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80',
    thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=60',
  },
  {
    name: 'Kiến trúc kính đô thị ban đêm',
    url: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=2000&q=80',
    thumb: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=400&q=60',
  },
  {
    name: 'Trừu tượng sóng xanh tài chính',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=60',
  },
  {
    name: 'Phòng họp điều hành Executive',
    url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=2000&q=80',
    thumb: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=60',
  },
];

const PRESETS: Array<{
  id: string;
  name: string;
  badge: string;
  desc: string;
  settings: Partial<AdminLoginSettings>;
}> = [
  {
    id: 'bv-corporate',
    name: 'thương hiệu của bạn Corporate Blue',
    badge: 'Mặc định chuẩn',
    desc: 'Xanh Navy tài chính truyền thống, gradient sâu, phong cách chuẩn nhận diện thương hiệu.',
    settings: {
      backgroundType: 'gradient',
      backgroundColor: '#07152f',
      backgroundGradient: { from: '#061633', via: '#0a234f', to: '#041026', direction: 'to-br' },
      themeMode: 'dark',
      cardPosition: 'center',
      accentColor: '#0054a6',
      cardBorderRadius: 20,
      cardShadow: '2xl',
      title: 'Đăng nhập Quản trị thương hiệu của bạn CMS',
      subtitle: 'Hệ thống Quản lý Khách hàng tiềm năng & Trợ lý AI Thông minh',
      badgeText: 'Bảo mật Doanh nghiệp • SSL 256-bit',
      showQuickAdmin: true,
      showGoogleLogin: true,
      showBackToLanding: true,
    },
  },
  {
    id: 'glass-frost',
    name: 'Frost Glassmorphism',
    badge: 'Hiện đại nhất',
    desc: 'Hiệu ứng kính mờ trong suốt trên nền ảnh tòa nhà hiện đại, bo góc thanh lịch.',
    settings: {
      backgroundType: 'image',
      backgroundImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80',
      backgroundOverlayColor: '#020617',
      backgroundOverlayOpacity: 65,
      backgroundBlur: 6,
      themeMode: 'glassmorphism',
      cardPosition: 'center',
      accentColor: '#2563eb',
      cardBorderRadius: 24,
      cardShadow: '2xl',
      title: 'Cổng Quản trị Trực tuyến',
      subtitle: 'Đăng nhập bảo mật để quản lý chiến dịch và chuyển đổi',
      badgeText: 'Smart Cloud Portal • Zero-Trust',
      showQuickAdmin: true,
      showGoogleLogin: true,
      showBackToLanding: true,
    },
  },
  {
    id: 'split-executive',
    name: 'Split Executive Screen',
    badge: 'Màn hình đôi',
    desc: 'Màn hình chia đôi: Banner nhận diện giá trị cốt lõi bên trái, form đăng nhập bên phải.',
    settings: {
      backgroundType: 'split',
      backgroundColor: '#07152f',
      splitBannerImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
      splitBannerTitle: 'Cổng quản trị nội dung và khách hàng',
      splitBannerSubtitle: 'Nền tảng Quản trị Landing Page, Lead Realtime & Trợ lý AI Thông minh số 1 Việt Nam.',
      splitBannerBenefits: [
        'Đồng bộ khách hàng tiềm năng tức thì về Google Sheets & Firestore',
        'Trợ lý AI Notebook & RAG tri thức tài liệu chống Hallucination',
        'Phân quyền tài khoản đa vai trò và giám sát chuyển đổi thời gian thực',
      ],
      themeMode: 'dark',
      cardPosition: 'right',
      accentColor: '#0284c7',
      cardBorderRadius: 20,
      cardShadow: '2xl',
      title: 'Đăng nhập hệ thống',
      subtitle: 'Truy cập bằng tài khoản được cấp quyền hoặc đăng nhập nhanh.',
      badgeText: 'Bảo vệ đa tầng • Multi-Factor',
      showQuickAdmin: true,
      showGoogleLogin: true,
      showBackToLanding: true,
    },
  },
  {
    id: 'dark-cyber',
    name: 'Dark Cyber Security',
    badge: 'Bảo mật cao',
    desc: 'Nền tối sâu thẳm #090d16, đường viền công nghệ tinh tế, tập trung tối đa sự an toàn.',
    settings: {
      backgroundType: 'color',
      backgroundColor: '#090d16',
      themeMode: 'dark',
      cardPosition: 'center',
      cardBorderColor: '#1e293b',
      accentColor: '#0ea5e9',
      cardBorderRadius: 16,
      cardShadow: '2xl',
      title: 'Trung tâm Quản trị CMS',
      subtitle: 'Xác thực tài khoản và kiểm soát phiên làm việc an toàn',
      badgeText: 'Secure Session • 2FA Ready',
      showQuickAdmin: true,
      showGoogleLogin: true,
      showBackToLanding: true,
    },
  },
  {
    id: 'clean-light',
    name: 'Clean Light Editorial',
    badge: 'Sáng thanh lịch',
    desc: 'Phong cách trắng sáng tối giản, độ tương phản cao, dễ nhìn trong văn phòng ban ngày.',
    settings: {
      backgroundType: 'color',
      backgroundColor: '#f1f5f9',
      themeMode: 'light',
      cardPosition: 'center',
      accentColor: '#0054a6',
      cardBorderRadius: 16,
      cardShadow: 'xl',
      title: 'Đăng nhập thương hiệu của bạn CMS',
      subtitle: 'Giao diện sáng tinh gọn, thuận tiện thao tác quản trị hàng ngày.',
      badgeText: 'Phiên bản Doanh nghiệp v3.0',
      showQuickAdmin: true,
      showGoogleLogin: true,
      showBackToLanding: true,
    },
  },
];

export const AdminLoginSettingsEditor: React.FC<Props> = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const tabStripRef = useRef<HTMLDivElement>(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const settings: AdminLoginSettings = {
    ...defaultAdminLoginSettings,
    ...(config.adminLoginSettings || {}),
  };

  const update = (patch: Partial<AdminLoginSettings>) => {
    const updated = { ...settings, ...patch };
    onChange({
      ...config,
      adminLoginSettings: updated,
    });
  };

  const applyPreset = (presetSettings: Partial<AdminLoginSettings>) => {
    update(presetSettings);
  };

  const inputClass = 'w-full rounded-xl bg-neutral-50 border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-800 outline-none focus:border-blue-500 focus:bg-white transition-all';
  const labelClass = 'block text-[11px] font-bold text-neutral-600 mb-1.5 uppercase tracking-wide';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Lock className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-neutral-900">
              Chỉnh sửa Giao diện & Nền Đăng nhập Admin CMS
            </h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Realtime
            </span>
          </div>
          <p className="text-xs text-neutral-500 max-w-2xl">
            Tùy biến toàn diện ảnh nền, màu sắc, gradient, hiệu ứng kính mờ (Glassmorphic), bố cục màn hình đôi (Split Screen),
            logo và các phương thức đăng nhập cho trang <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-700 font-mono">#admin</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewFullscreen(true)}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Mở toàn màn hình xem thử</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Mini-Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Kéo thanh chức năng sang trái" onClick={() => tabStripRef.current?.scrollBy({left:-220,behavior:'smooth'})} className="shrink-0 px-2 py-2 rounded-lg border bg-white">←</button>
          <div ref={tabStripRef} className="flex min-w-0 flex-1 gap-1.5 p-1 pb-3 bg-neutral-100 rounded-2xl overflow-x-scroll" style={{scrollbarWidth:'auto'}}>
            {[
              { id: 'presets', label: '1-Click Presets', icon: Sparkles },
              { id: 'background', label: 'Nền & Bố cục', icon: ImageIcon },
              { id: 'card', label: 'Khung & Theme', icon: Palette },
              { id: 'branding', label: 'Thương hiệu & Chữ', icon: Sliders },
              { id: 'features', label: 'Tính năng & Nút bấm', icon: Layers },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as Tab)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === id
                    ? 'bg-white text-blue-700 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
            <button type="button" aria-label="Kéo thanh chức năng sang phải" onClick={() => tabStripRef.current?.scrollBy({left:220,behavior:'smooth'})} className="shrink-0 px-2 py-2 rounded-lg border bg-white">→</button>
          </div>

          {/* Tab 1: 1-Click Presets */}
          {activeTab === 'presets' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-neutral-800 mb-1">Mẫu giao diện có sẵn (Presets)</h3>
                <p className="text-xs text-neutral-500">
                  Chọn ngay một phong cách chuẩn để áp dụng màu nền, phong cách thẻ và bố cục tức thì:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {PRESETS.map((p) => {
                  const isCurrent =
                    settings.backgroundType === p.settings.backgroundType &&
                    settings.themeMode === p.settings.themeMode;
                  return (
                    <div
                      key={p.id}
                      onClick={() => applyPreset(p.settings)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-blue-50/70 border-blue-500/80 ring-2 ring-blue-500/20'
                          : 'bg-neutral-50/50 hover:bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-neutral-900">{p.name}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                            {p.badge}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đang dùng
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">{p.desc}</p>
                      </div>
                      <button
                        type="button"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        Áp dụng mẫu
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Nền & Bố cục */}
          {activeTab === 'background' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div>
                <label className={labelClass}>Kiểu Nền (Background Type)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'gradient', label: 'Dải màu (Gradient)' },
                    { id: 'image', label: 'Hình ảnh (Image)' },
                    { id: 'split', label: 'Màn hình đôi (Split)' },
                    { id: 'color', label: 'Màu đơn (Solid)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => update({ backgroundType: t.id as LoginBackgroundType })}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        settings.backgroundType === t.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position selector (for non-split) */}
              {settings.backgroundType !== 'split' && (
                <div>
                  <label className={labelClass}>Vị trí Khung đăng nhập (Card Alignment)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'left', label: 'Căn Trái' },
                      { id: 'center', label: 'Căn Giữa (Mặc định)' },
                      { id: 'right', label: 'Căn Phải' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => update({ cardPosition: pos.id as LoginCardPosition })}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          settings.cardPosition === pos.id
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* If Image background or Split */}
              {(settings.backgroundType === 'image' || settings.backgroundType === 'split') && (
                <div className="space-y-4 border-t border-neutral-100 pt-4">
                  <div>
                    <label className={labelClass}>Chọn nhanh ảnh nền cao cấp (Curated Gallery)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {CURATED_BACKGROUND_IMAGES.map((img) => (
                        <div
                          key={img.url}
                          onClick={() => {
                            if (settings.backgroundType === 'split') {
                              update({ splitBannerImage: img.url, backgroundImage: img.url });
                            } else {
                              update({ backgroundImage: img.url });
                            }
                          }}
                          className={`group relative rounded-xl overflow-hidden cursor-pointer border aspect-video ${
                            (settings.backgroundType === 'split' ? settings.splitBannerImage : settings.backgroundImage) === img.url
                              ? 'ring-2 ring-blue-600 border-transparent'
                              : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          <img src={img.thumb} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white font-medium truncate">{img.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>URL Ảnh Nền Tùy Chọn (Custom Image URL)</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.backgroundType === 'split' ? (settings.splitBannerImage || '') : (settings.backgroundImage || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (settings.backgroundType === 'split') {
                          update({ splitBannerImage: val, backgroundImage: val });
                        } else {
                          update({ backgroundImage: val });
                        }
                      }}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Màu Lớp Phủ (Overlay Color)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.backgroundOverlayColor || '#000000'}
                          onChange={(e) => update({ backgroundOverlayColor: e.target.value })}
                          className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                        />
                        <input
                          type="text"
                          className={inputClass}
                          value={settings.backgroundOverlayColor || '#000000'}
                          onChange={(e) => update({ backgroundOverlayColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={labelClass}>Độ Đậm Lớp Phủ (Opacity %)</label>
                        <span className="text-xs font-mono font-bold text-neutral-700">{settings.backgroundOverlayOpacity ?? 65}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="95"
                        step="5"
                        value={settings.backgroundOverlayOpacity ?? 65}
                        onChange={(e) => update({ backgroundOverlayOpacity: Number(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={labelClass}>Độ Làm Mờ Nền (Backdrop Blur px)</label>
                      <span className="text-xs font-mono font-bold text-neutral-700">{settings.backgroundBlur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="2"
                      value={settings.backgroundBlur ?? 0}
                      onChange={(e) => update({ backgroundBlur: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* If Gradient */}
              {settings.backgroundType === 'gradient' && (
                <div className="space-y-4 border-t border-neutral-100 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Màu Bắt Đầu (From Color)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.backgroundGradient?.from || '#06132b'}
                          onChange={(e) =>
                            update({
                              backgroundGradient: {
                                ...(settings.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' }),
                                from: e.target.value,
                              },
                            })
                          }
                          className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                        />
                        <input
                          type="text"
                          className={inputClass}
                          value={settings.backgroundGradient?.from || '#06132b'}
                          onChange={(e) =>
                            update({
                              backgroundGradient: {
                                ...(settings.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' }),
                                from: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Màu Kết Thúc (To Color)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.backgroundGradient?.to || '#0f2744'}
                          onChange={(e) =>
                            update({
                              backgroundGradient: {
                                ...(settings.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' }),
                                to: e.target.value,
                              },
                            })
                          }
                          className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                        />
                        <input
                          type="text"
                          className={inputClass}
                          value={settings.backgroundGradient?.to || '#0f2744'}
                          onChange={(e) =>
                            update({
                              backgroundGradient: {
                                ...(settings.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' }),
                                to: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Hướng Dải Màu (Gradient Direction)</label>
                    <select
                      className={inputClass}
                      value={settings.backgroundGradient?.direction || 'to-br'}
                      onChange={(e) =>
                        update({
                          backgroundGradient: {
                            ...(settings.backgroundGradient || { from: '#06132b', to: '#0f2744' }),
                            direction: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="to-br">Góc chéo (Trên trái sang Dưới phải - to-br)</option>
                      <option value="to-b">Dọc (Trên xuống dưới - to-b)</option>
                      <option value="to-r">Ngang (Trái sang phải - to-r)</option>
                      <option value="to-tr">Góc chéo (Dưới trái lên Trên phải - to-tr)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* If Solid Color */}
              {settings.backgroundType === 'color' && (
                <div className="border-t border-neutral-100 pt-4">
                  <label className={labelClass}>Màu Nền Đơn (Background Hex Color)</label>
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="color"
                      value={settings.backgroundColor || '#0b1329'}
                      onChange={(e) => update({ backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.backgroundColor || '#0b1329'}
                      onChange={(e) => update({ backgroundColor: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Khung & Theme */}
          {activeTab === 'card' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Font chữ Khung Đăng nhập */}
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#0054a6]" />
                  <span className="text-xs font-black text-blue-900 uppercase">Font Chữ Khung Đăng Nhập CMS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FontSelector
                    value={settings.fontFamily || "'Be Vietnam Pro', sans-serif"}
                    onChange={(fontFamily) => update({ fontFamily })}
                    label="Font chữ Thân / Form đăng nhập"
                    description="Áp dụng cho các ô nhập, nhãn, nút bấm và mô tả"
                    previewText="Đăng nhập tài khoản quản trị CMS 123456"
                  />
                  <FontSelector
                    value={settings.headingFontFamily || settings.fontFamily || "'Be Vietnam Pro', sans-serif"}
                    onChange={(headingFontFamily) => update({ headingFontFamily })}
                    label="Font chữ Tiêu Đề & Tiêu Đề Phụ"
                    description="Áp dụng cho tiêu đề h2 và nút hành động"
                    previewText="CỔNG QUẢN TRỊ WEBSITE"
                  />
                </div>
              </div>

              {/* Icon Đầu Khung Đăng Nhập */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <label className={labelClass}>Biểu Tượng Đầu Khung (Card Icon)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'shieldCheck', label: 'Khiên bảo mật', icon: ShieldCheck },
                    { id: 'lock', label: 'Ổ khóa', icon: Lock },
                    { id: 'shield', label: 'Khiên cảnh báo', icon: ShieldAlert },
                    { id: 'key', label: 'Chìa khóa', icon: Key },
                    { id: 'fingerprint', label: 'Vân tay', icon: Fingerprint },
                    { id: 'building', label: 'Tòa nhà', icon: Building2 },
                    { id: 'sparkles', label: 'Tinh hoa AI', icon: Sparkles },
                    { id: 'userCheck', label: 'Xác thực User', icon: UserCheck },
                    { id: 'award', label: 'Huy chương vàng', icon: Award },
                  ].map(({ id, label, icon: Icon }) => {
                    const isSelected = (settings.cardIcon || 'shieldCheck') === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => update({ cardIcon: id as LoginCardIcon })}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-[#0054a6]'
                            : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold truncate max-w-full">{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className={labelClass}>Màu Biểu Tượng (Icon Color)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.cardIconColor || settings.accentColor || '#0054a6'}
                        onChange={(e) => update({ cardIconColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                      />
                      <input
                        type="text"
                        className={inputClass}
                        value={settings.cardIconColor || ''}
                        placeholder={settings.accentColor || '#0054a6'}
                        onChange={(e) => update({ cardIconColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Màu Nền Biểu Tượng (Icon Background)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={settings.cardIconBgColor || ''}
                        placeholder="rgba(0, 84, 166, 0.12) hoặc #f0f7ff"
                        onChange={(e) => update({ cardIconBgColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Chủ đề Khung (Theme Mode)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dark', label: 'Tối Sang Trọng (Dark)', desc: 'Nền đen xám sang trọng' },
                    { id: 'glassmorphism', label: 'Kính Mờ (Glass)', desc: 'Trong suốt làm mờ mượt mà' },
                    { id: 'light', label: 'Sáng Tinh Tế (Light)', desc: 'Trắng tinh khiết chuẩn văn phòng' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => update({ themeMode: m.id as LoginThemeMode })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        settings.themeMode === m.id
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="font-bold text-xs text-neutral-900">{m.label}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tùy chỉnh Màu Nền & Màu Viền Khung */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <label className={labelClass}>Tùy Biến Màu Khung & Màu Viền (Card Background & Border)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">Màu Nền Khung (Tùy chọn ghi đè)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.cardBackground || '#171717'}
                        onChange={(e) => update({ cardBackground: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                      />
                      <input
                        type="text"
                        className={inputClass}
                        value={settings.cardBackground || ''}
                        placeholder="Để trống dùng theo Theme"
                        onChange={(e) => update({ cardBackground: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">Màu Viền Khung (Border Color)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.cardBorderColor || '#334155'}
                        onChange={(e) => update({ cardBorderColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-neutral-200 p-1 cursor-pointer"
                      />
                      <input
                        type="text"
                        className={inputClass}
                        value={settings.cardBorderColor || ''}
                        placeholder="Để trống dùng theo Theme"
                        onChange={(e) => update({ cardBorderColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tùy biến Màu Chữ bên trong Khung */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <label className={labelClass}>Màu Chữ Trong Khung (Text Colors)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">Màu Tiêu Đề (Title)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={settings.cardHeadingColor || '#ffffff'}
                        onChange={(e) => update({ cardHeadingColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg"
                        value={settings.cardHeadingColor || ''}
                        placeholder="#ffffff"
                        onChange={(e) => update({ cardHeadingColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">Màu Chữ Nhãn Form (Labels)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={settings.cardTextColor || '#e2e8f0'}
                        onChange={(e) => update({ cardTextColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg"
                        value={settings.cardTextColor || ''}
                        placeholder="#e2e8f0"
                        onChange={(e) => update({ cardTextColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">Màu Mô Tả Phụ (Subtitle)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={settings.cardSubtextColor || '#94a3b8'}
                        onChange={(e) => update({ cardSubtextColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-neutral-200 p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg"
                        value={settings.cardSubtextColor || ''}
                        placeholder="#94a3b8"
                        onChange={(e) => update({ cardSubtextColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Màu Nhấn / Nút Đăng Nhập (Accent Color)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { name: 'thương hiệu của bạn Blue', color: '#0054a6' },
                    { name: 'Sky Electric', color: '#0284c7' },
                    { name: 'Emerald Green', color: '#059669' },
                    { name: 'Royal Violet', color: '#7c3aed' },
                    { name: 'Gold Amber', color: '#d97706' },
                    { name: 'Crimson Red', color: '#dc2626' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => update({ accentColor: c.color })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                        settings.accentColor === c.color ? 'border-blue-600 bg-blue-50' : 'border-neutral-200 bg-neutral-50'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                  <input
                    type="color"
                    value={settings.accentColor || '#0054a6'}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-neutral-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.accentColor || '#0054a6'}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    placeholder="#0054a6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={labelClass}>Bo Góc Khung (Border Radius px)</label>
                    <span className="text-xs font-mono font-bold text-neutral-700">{settings.cardBorderRadius ?? 20}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="36"
                    step="2"
                    value={settings.cardBorderRadius ?? 20}
                    onChange={(e) => update({ cardBorderRadius: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className={labelClass}>Độ Đổ Bóng (Card Shadow)</label>
                  <select
                    className={inputClass}
                    value={settings.cardShadow || '2xl'}
                    onChange={(e) => update({ cardShadow: e.target.value as any })}
                  >
                    <option value="none">Không bóng (Flat)</option>
                    <option value="md">Bóng vừa (Medium)</option>
                    <option value="xl">Bóng lớn (Large - XL)</option>
                    <option value="2xl">Bóng siêu sâu (2XL - Sang trọng)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Thương hiệu & Chữ */}
          {activeTab === 'branding' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Logo Đăng Nhập (Logo Image URL)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.logoUrl || ''}
                    onChange={(e) => update({ logoUrl: e.target.value })}
                    placeholder="Để trống sẽ dùng Logo & Tên mặc định của hệ thống"
                  />
                </div>
                <div>
                  <label className={labelClass}>Độ rộng Logo (px)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={settings.logoWidth || 160}
                    onChange={(e) => update({ logoWidth: Number(e.target.value) || 160 })}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Tiêu Đề Khung (Title)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={settings.title || ''}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Đăng nhập Quản trị CMS"
                />
              </div>

              <div>
                <label className={labelClass}>Mô Tả Phụ (Subtitle)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={settings.subtitle || ''}
                  onChange={(e) => update({ subtitle: e.target.value })}
                  placeholder="Hệ thống quản trị nội dung và hỗ trợ khách hàng"
                />
              </div>

              <div>
                <label className={labelClass}>Huy Hiệu Bảo Mật (Badge Text)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={settings.badgeText || ''}
                  onChange={(e) => update({ badgeText: e.target.value })}
                  placeholder="Bảo mật SSL 256-bit • Multi-Factor"
                />
              </div>

              {/* Tùy biến Chữ & Nội dung Form đăng nhập */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="text-xs font-black text-blue-900 uppercase">Chữ & Nhãn Form Đăng Nhập CMS</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Nhãn ô Tên đăng nhập</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.usernameLabel || ''}
                      onChange={(e) => update({ usernameLabel: e.target.value })}
                      placeholder="Tên đăng nhập"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Placeholder ô Tên đăng nhập</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.usernamePlaceholder || ''}
                      onChange={(e) => update({ usernamePlaceholder: e.target.value })}
                      placeholder="admin / marketing..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Nhãn ô Mật khẩu</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.passwordLabel || ''}
                      onChange={(e) => update({ passwordLabel: e.target.value })}
                      placeholder="Mật khẩu"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Placeholder ô Mật khẩu</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.passwordPlaceholder || ''}
                      onChange={(e) => update({ passwordPlaceholder: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Chữ trên Nút Đăng Nhập Chính (Submit Button)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.submitButtonText || ''}
                    onChange={(e) => update({ submitButtonText: e.target.value })}
                    placeholder="Đăng nhập"
                  />
                </div>
              </div>

              {/* Split Screen specific text */}
              {settings.backgroundType === 'split' && (
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <div className="text-xs font-black text-blue-700 uppercase">Cấu hình Cột Banner Màn hình đôi</div>
                  <div>
                    <label className={labelClass}>Tiêu đề Banner Trái</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={settings.splitBannerTitle || ''}
                      onChange={(e) => update({ splitBannerTitle: e.target.value })}
                      placeholder="Cổng quản trị nội dung và khách hàng"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mô tả Banner Trái</label>
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={settings.splitBannerSubtitle || ''}
                      onChange={(e) => update({ splitBannerSubtitle: e.target.value })}
                      placeholder="Giải pháp quản trị số hóa..."
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelClass}>3 Điểm nổi bật (Bullet Points)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(settings.splitBannerBenefits || [])];
                          list.push('Tính năng mới');
                          update({ splitBannerBenefits: list });
                        }}
                        className="text-[11px] text-blue-600 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Thêm điểm
                      </button>
                    </div>
                    {(settings.splitBannerBenefits || []).map((b, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          className={inputClass}
                          value={b}
                          onChange={(e) => {
                            const list = [...(settings.splitBannerBenefits || [])];
                            list[idx] = e.target.value;
                            update({ splitBannerBenefits: list });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = (settings.splitBannerBenefits || []).filter((_, i) => i !== idx);
                            update({ splitBannerBenefits: list });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
                <div>
                  <label className={labelClass}>Hotline / Hỗ Trợ Kỹ Thuật (Support Contact)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.supportContact || ''}
                    onChange={(e) => update({ supportContact: e.target.value })}
                    placeholder="Hotline Kỹ thuật CMS: 1900 55 88 99"
                  />
                </div>
                <div>
                  <label className={labelClass}>Bản Quyền Chân Trang (Copyright Text)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={settings.copyrightText || ''}
                    onChange={(e) => update({ copyrightText: e.target.value })}
                    placeholder="© 2026 Tên thương hiệu. Toàn bộ quyền được bảo lưu."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Tính năng & Nút bấm */}
          {activeTab === 'features' && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-black text-emerald-950">Nút Đăng nhập nhanh Admin (Bypass)</div>
                      <div className="text-[11px] text-emerald-700">Cho phép vào thẳng vai trò Super Admin mà không cần nhập mật khẩu</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showQuickAdmin !== false}
                    onChange={(e) => update({ showQuickAdmin: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                {settings.showQuickAdmin !== false && (
                  <div className="space-y-3 pt-2 border-t border-emerald-200/70">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-900 mb-1">Nhãn nút Đăng nhập nhanh (Bypass)</label>
                      <input
                        type="text"
                        className="w-full rounded-xl bg-white border border-emerald-300 px-3 py-2 text-xs text-emerald-950 font-semibold"
                        value={settings.quickAdminLabel || ''}
                        placeholder="Đăng nhập nhanh vai trò Admin (Bypass)"
                        onChange={(e) => update({ quickAdminLabel: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-900 mb-1">Dòng chú thích bên dưới nút Bypass</label>
                      <input
                        type="text"
                        className="w-full rounded-xl bg-white border border-emerald-300 px-3 py-2 text-xs text-emerald-950"
                        value={settings.bypassSubtitle || ''}
                        placeholder="Truy cập với toàn quyền Super Admin (không cần tài khoản & mật khẩu)"
                        onChange={(e) => update({ bypassSubtitle: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-900 mb-1">Màu Nền Nút Bypass</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.bypassButtonColor || '#059669'}
                            onChange={(e) => update({ bypassButtonColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-emerald-300 p-0.5 cursor-pointer"
                          />
                          <input
                            type="text"
                            className="flex-1 rounded-xl bg-white border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-950"
                            value={settings.bypassButtonColor || ''}
                            placeholder="Mặc định: Gradient Emerald"
                            onChange={(e) => update({ bypassButtonColor: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-900 mb-1">Màu Chữ Nút Bypass</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={settings.bypassButtonTextColor || '#ffffff'}
                            onChange={(e) => update({ bypassButtonTextColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-emerald-300 p-0.5 cursor-pointer"
                          />
                          <input
                            type="text"
                            className="flex-1 rounded-xl bg-white border border-emerald-300 px-2.5 py-1.5 text-xs text-emerald-950"
                            value={settings.bypassButtonTextColor || ''}
                            placeholder="#ffffff"
                            onChange={(e) => update({ bypassButtonTextColor: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Nút Đăng nhập bằng Google SSO</div>
                  <div className="text-[11px] text-neutral-500">Xác thực OAuth tài khoản Google qua Firebase Auth</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showGoogleLogin !== false}
                  onChange={(e) => update({ showGoogleLogin: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-neutral-50">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Nút Quay lại Landing Page</div>
                  <div className="text-[11px] text-neutral-500">Liên kết điều hướng người dùng quay về website công khai</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showBackToLanding !== false}
                  onChange={(e) => update({ showBackToLanding: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Announcement Banner */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-xs font-bold text-neutral-900">Băng rôn Thông báo Nội bộ (Announcement)</div>
                      <div className="text-[11px] text-neutral-500">Hiển thị thông báo bảo trì hoặc tin tức trên khung đăng nhập</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settings.announcement?.enabled}
                    onChange={(e) =>
                      update({
                        announcement: {
                          ...(settings.announcement || { text: '', type: 'info' }),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
                {settings.announcement?.enabled && (
                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Nội dung thông báo</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={settings.announcement?.text || ''}
                          onChange={(e) =>
                            update({
                              announcement: {
                                ...(settings.announcement || { enabled: true, type: 'info' }),
                                text: e.target.value,
                              },
                            })
                          }
                          placeholder="Hệ thống AI Agent v3.0 đang hoạt động ổn định."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">Mức độ thông báo</label>
                        <select
                          className={inputClass}
                          value={settings.announcement?.type || 'info'}
                          onChange={(e) =>
                            update({
                              announcement: {
                                ...(settings.announcement || { enabled: true, text: '' }),
                                type: e.target.value as any,
                              },
                            })
                          }
                        >
                          <option value="info">Thông tin (Xanh lam)</option>
                          <option value="warning">Cảnh báo / Bảo trì (Vàng cam)</option>
                          <option value="success">Thành công (Xanh lá)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Interactive Live Mini-Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-neutral-800">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Xem Trước Trực Tiếp (Live Preview)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs ${previewDevice === 'desktop' ? 'bg-blue-100 text-blue-700' : 'text-neutral-400 hover:text-neutral-700'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs ${previewDevice === 'mobile' ? 'bg-blue-100 text-blue-700' : 'text-neutral-400 hover:text-neutral-700'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Container for simulation */}
            <div className="border border-neutral-300 rounded-xl overflow-hidden bg-neutral-900 h-[560px] relative shadow-inner">
              <div className="w-full h-full overflow-y-auto transform origin-top" style={{ zoom: previewDevice === 'mobile' ? 0.7 : 0.72 }}>
                <AdminLogin
                  settings={settings}
                  brandName={config.brandName || 'Trang web'}
                  onSuccess={() => {}}
                  onBackToLanding={() => {}}
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 text-center mt-2">
              Khung xem trước thu nhỏ phản hồi ngay theo từng thao tác chỉnh sửa phía trên.
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between gap-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-neutral-200">
                Toàn Màn Hình: Giao diện Đăng nhập Quản trị thực tế
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewFullscreen(false)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Đóng toàn màn hình</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto relative">
            <AdminLogin
              settings={settings}
              brandName={config.brandName || 'Trang web'}
              onSuccess={() => setPreviewFullscreen(false)}
              onBackToLanding={() => setPreviewFullscreen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
