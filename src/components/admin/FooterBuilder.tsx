import React, { useState } from 'react';
import {
  Layers,
  Image as ImageIcon,
  Palette,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Phone,
  PhoneCall,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Globe,
  Share2,
  FileText,
  Sliders,
  Check,
  Eye,
  RefreshCw,
  Upload,
  Sparkles,
  Smartphone,
  Copy,
  ChevronDown,
  ChevronUp,
  Type,
} from 'lucide-react';
import {
  LandingPageConfig,
  FooterConfig,
  FooterColumn,
  FooterColumnType,
  FooterLink,
  FooterButton,
  FooterButtonAction,
  SocialLinksConfig,
  CustomContactButton,
  ContactButtonPlatform,
  ContactButtonActionType,
} from '../../types';
import { ContactButtonIcon } from '../common/ContactButtonIcon';
import { defaultLandingConfig } from '../../data/defaultConfig';
import { FontSelector } from '../common/FontSelector';
import { CmsLinkField } from './CmsLinkField';
import { heritageFooter } from '../../utils/heritageDesign';

interface Props {
  config: LandingPageConfig;
  onChange: (newConfig: LandingPageConfig) => void;
}

// Kho logo/ảnh nền mẫu đã được xóa. Admin chỉ sử dụng tài nguyên tự tải lên.
const LOGO_PRESETS: Array<{ name: string; url: string }> = [];
const FOOTER_BG_PRESETS: Array<{ name: string; url: string }> = [];

export const FooterBuilder: React.FC<Props> = ({ config, onChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'layout' | 'columns' | 'social' | 'buttons' | 'legal'>('branding');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [editingCustomButtonId, setEditingCustomButtonId] = useState<string | null>(null);

  // Safeguard footer config
  const footer: FooterConfig = config.footer || {
    enabled: true,
    bgType: 'dark',
    customBgColor: '#0b1329',
    textColor: '#e5e7eb',
    headingColor: '#ffffff',
    mutedTextColor: '#9ca3af',
    bgImageUrl: '',
    bgMode: 'color',
    overlayColor: '#000000',
    overlayOpacity: 40,
    footerLogoUrl: '',
    footerLogoHeight: 44,
    footerDescription: config.footerText || '',
    address: '',
    hotline: config.hotline || '',
    email: '',
    workingHours: '',
    copyrightText: config.footerText || '',
    disclaimerText: config.footerDisclaimer || '',
    showTopContactBar: false,
    showFloatingContactBar: true,
    showMobileStickyBar: true,
    columns: [],
    socialLinks: {},
    actionButtons: [],
    customContactButtons: config.customContactButtons || [],
  };

  // Legacy builds stored enabled=false by default. Treat those as visible until a
  // user deliberately changes this switch; no published content is overwritten.
  const footerVisible = footer.enabled !== false || footer.enabledExplicit !== true;

  const updateFooter = (updatedFields: Partial<FooterConfig>) => {
    const updatedFooter: FooterConfig = { ...footer, ...updatedFields };
    const nextConfig: LandingPageConfig = {
      ...config,
      footer: updatedFooter,
    };

    // Keep legacy/top-level fields synchronized with the structured footer.
    // Explicitly preserve empty strings so an admin can clear old text.
    if (Object.prototype.hasOwnProperty.call(updatedFields, 'copyrightText')) {
      nextConfig.footerText = updatedFields.copyrightText ?? '';
    } else if (typeof updatedFooter.copyrightText === 'string') {
      nextConfig.footerText = updatedFooter.copyrightText;
    }

    if (Object.prototype.hasOwnProperty.call(updatedFields, 'disclaimerText')) {
      nextConfig.footerDisclaimer = updatedFields.disclaimerText ?? '';
    } else if (typeof updatedFooter.disclaimerText === 'string') {
      nextConfig.footerDisclaimer = updatedFooter.disclaimerText;
    }

    if (Object.prototype.hasOwnProperty.call(updatedFields, 'customContactButtons')) {
      nextConfig.customContactButtons = updatedFields.customContactButtons ?? [];
    }
    if (Object.prototype.hasOwnProperty.call(updatedFields, 'footerLogoUrl')) {
      nextConfig.footerLogoUrl = updatedFields.footerLogoUrl ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(updatedFields, 'footerLogoHeight')) {
      nextConfig.footerLogoHeight = updatedFields.footerLogoHeight ?? 44;
    }

    onChange(nextConfig);
  };

  // Helper for image upload -> base64
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Vui lòng chọn hình ảnh dưới 3MB để đảm bảo tốc độ tải trang!');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // COLUMNS MANAGEMENT
  // ----------------------------------------------------
  const handleAddColumn = (type: FooterColumnType) => {
    const newColId = `col_${Date.now()}`;
    let newCol: FooterColumn = {
      id: newColId,
      type,
      title:
        type === 'brand'
          ? 'Về Chúng Tôi'
          : type === 'links'
          ? 'Liên Kết Nhanh'
          : type === 'contact'
          ? 'Thông Tin Liên Hệ'
          : type === 'social'
          ? 'Mạng Xã Hội'
          : 'Thông Tin Bổ Sung',
      order: (footer.columns?.length || 0) + 1,
      enabled: true,
    };

    if (type === 'brand') {
      newCol.showLogo = true;
      newCol.content =
        '';
      newCol.showSocials = true;
    } else if (type === 'links') {
      newCol.links = [];
    } else if (type === 'contact') {
      newCol.contactAddress = footer.address || '';
      newCol.contactHotline = footer.hotline || config.hotline || '';
      newCol.contactEmail = footer.email || '';
      newCol.contactHours = footer.workingHours || '';
    }

    const updatedCols = [...(footer.columns || []), newCol];
    updateFooter({ columns: updatedCols });
    setEditingColumnId(newColId);
  };

  const handleUpdateColumn = (colId: string, fields: Partial<FooterColumn>) => {
    const updated = (footer.columns || []).map((col) =>
      col.id === colId ? { ...col, ...fields } : col
    );
    updateFooter({ columns: updated });
  };

  const handleDeleteColumn = (colId: string) => {
    // Delete directly from the builder. The previous native confirm dialog could
    // be blocked/ignored in some embedded CMS environments, making the trash
    // button appear unresponsive.
    const filtered = (footer.columns || []).filter((col) => col.id !== colId);
    const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    updateFooter({ columns: reordered });
    if (editingColumnId === colId) setEditingColumnId(null);
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const cols = [...(footer.columns || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cols.length) return;

    const temp = cols[index];
    cols[index] = cols[targetIdx];
    cols[targetIdx] = temp;

    const reordered = cols.map((c, i) => ({ ...c, order: i + 1 }));
    updateFooter({ columns: reordered });
  };

  // ----------------------------------------------------
  // ACTION BUTTONS MANAGEMENT
  // ----------------------------------------------------
  const handleAddButton = () => {
    const newBtnId = `btn_${Date.now()}`;
    const newBtn: FooterButton = {
      id: newBtnId,
      label: 'Nút Mới',
      action: 'call',
      icon: 'phone',
      targetUrl: `tel:${(footer.hotline || config.hotline || '').replace(/[^0-9+]/g, '')}`,
      bgColor: '#0054a6',
      textColor: '#ffffff',
      order: (footer.actionButtons?.length || 0) + 1,
      enabled: true,
    };
    const updated = [...(footer.actionButtons || []), newBtn];
    updateFooter({ actionButtons: updated });
    setEditingButtonId(newBtnId);
  };

  const handleUpdateButton = (btnId: string, fields: Partial<FooterButton>) => {
    const updated = (footer.actionButtons || []).map((b) =>
      b.id === btnId ? { ...b, ...fields } : b
    );
    updateFooter({ actionButtons: updated });
  };

  const handleDeleteButton = (btnId: string) => {
    const filtered = (footer.actionButtons || []).filter((b) => b.id !== btnId);
    const reordered = filtered.map((b, i) => ({ ...b, order: i + 1 }));
    updateFooter({ actionButtons: reordered });
    if (editingButtonId === btnId) setEditingButtonId(null);
  };

  const handleMoveButton = (index: number, direction: 'up' | 'down') => {
    const btns = [...(footer.actionButtons || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= btns.length) return;

    const temp = btns[index];
    btns[index] = btns[targetIdx];
    btns[targetIdx] = temp;

    const reordered = btns.map((b, i) => ({ ...b, order: i + 1 }));
    updateFooter({ actionButtons: reordered });
  };

  // ----------------------------------------------------
  // DYNAMIC CONTACT & SOCIAL BUTTONS (CONFIG ĐỘNG, KHÔNG HARD-CODE)
  // ----------------------------------------------------
  const currentContactButtons: CustomContactButton[] =
    (footer.customContactButtons && footer.customContactButtons.length > 0)
      ? footer.customContactButtons
      : (config.customContactButtons && config.customContactButtons.length > 0)
      ? config.customContactButtons
      : defaultLandingConfig.customContactButtons || [];

  const updateCustomButtons = (buttons: CustomContactButton[]) => {
    updateFooter({ customContactButtons: buttons });
    onChange({
      ...config,
      footer: { ...footer, customContactButtons: buttons },
      customContactButtons: buttons,
    });
  };

  const handleAddCustomContactButton = (platformPreset?: ContactButtonPlatform) => {
    const newId = `cb_${Date.now()}`;
    const cleanHotline = (config.hotline || footer.hotline || '').replace(/[^0-9+]/g, '');
    let newBtn: CustomContactButton;

    if (platformPreset === 'hotline') {
      newBtn = {
        id: newId,
        name: 'Hotline 24/7 (Bấm Để Gọi)',
        platform: 'hotline',
        actionType: 'call',
        value: cleanHotline,
        iconType: 'preset',
        presetIcon: 'phone',
        bgColor: '#dc2626',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: true,
        showMobileBar: true,
        order: currentContactButtons.length + 1,
        enabled: true,
      };
    } else if (platformPreset === 'zalo') {
      newBtn = {
        id: newId,
        name: 'Chat Zalo Tư Vấn',
        platform: 'zalo',
        actionType: 'zalo',
        value: footer.socialLinks?.zalo || '',
        iconType: 'preset',
        presetIcon: 'zalo',
        bgColor: '#0068ff',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: true,
        showMobileBar: true,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'messenger') {
      newBtn = {
        id: newId,
        name: 'Facebook Messenger',
        platform: 'messenger',
        actionType: 'messenger',
        value: '',
        iconType: 'preset',
        presetIcon: 'messenger',
        bgColor: '#0084ff',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: true,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'maps') {
      newBtn = {
        id: newId,
        name: 'Chỉ Đường Google Maps',
        platform: 'maps',
        actionType: 'maps',
        value: '',
        iconType: 'preset',
        presetIcon: 'maps',
        bgColor: '#ea4335',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'youtube') {
      newBtn = {
        id: newId,
        name: 'Kênh YouTube',
        platform: 'youtube',
        actionType: 'url',
        value: footer.socialLinks?.youtube || '',
        iconType: 'preset',
        presetIcon: 'youtube',
        bgColor: '#ff0000',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'tiktok') {
      newBtn = {
        id: newId,
        name: 'Kênh TikTok',
        platform: 'tiktok',
        actionType: 'url',
        value: footer.socialLinks?.tiktok || '',
        iconType: 'preset',
        presetIcon: 'tiktok',
        bgColor: '#000000',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'whatsapp') {
      newBtn = {
        id: newId,
        name: 'WhatsApp Chat',
        platform: 'whatsapp',
        actionType: 'whatsapp',
        value: '',
        iconType: 'preset',
        presetIcon: 'whatsapp',
        bgColor: '#25d366',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    } else if (platformPreset === 'email') {
      newBtn = {
        id: newId,
        name: 'Email Hỗ Trợ Khách Hàng',
        platform: 'email',
        actionType: 'email',
        value: footer.email || '',
        iconType: 'preset',
        presetIcon: 'email',
        bgColor: '#0284c7',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
      };
    } else {
      newBtn = {
        id: newId,
        name: 'Nút Liên Hệ Mới',
        platform: 'other',
        actionType: 'url',
        value: 'https://',
        iconType: 'preset',
        presetIcon: 'globe',
        bgColor: '#334155',
        textColor: '#ffffff',
        showInFooter: true,
        showFloating: false,
        showMobileBar: false,
        order: currentContactButtons.length + 1,
        enabled: true,
        openInNewTab: true,
      };
    }

    const updated = [...currentContactButtons, newBtn];
    updateCustomButtons(updated);
    setEditingCustomButtonId(newId);
  };

  const handleUpdateCustomContactButton = (btnId: string, fields: Partial<CustomContactButton>) => {
    const updated = currentContactButtons.map((b) => (b.id === btnId ? { ...b, ...fields } : b));
    updateCustomButtons(updated);
  };

  const handleDeleteCustomContactButton = (btnId: string) => {
    const filtered = currentContactButtons.filter((b) => b.id !== btnId);
    const reordered = filtered.map((b, i) => ({ ...b, order: i + 1 }));
    updateCustomButtons(reordered);
    if (editingCustomButtonId === btnId) setEditingCustomButtonId(null);
  };

  const handleMoveCustomContactButton = (index: number, direction: 'up' | 'down') => {
    const btns = [...currentContactButtons];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= btns.length) return;

    const temp = btns[index];
    btns[index] = btns[targetIdx];
    btns[targetIdx] = temp;

    const reordered = btns.map((b, i) => ({ ...b, order: i + 1 }));
    updateCustomButtons(reordered);
  };

  const handleDuplicateCustomContactButton = (btn: CustomContactButton) => {
    const duplicate: CustomContactButton = {
      ...btn,
      id: `cb_${Date.now()}`,
      name: `${btn.name} (Bản sao)`,
      order: currentContactButtons.length + 1,
    };
    const updated = [...currentContactButtons, duplicate];
    updateCustomButtons(updated);
    setEditingCustomButtonId(duplicate.id);
  };

  const handleButtonIconUpload = (
    btnId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn file icon dung lượng dưới 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleUpdateCustomContactButton(btnId, {
          iconType: 'custom_upload',
          customIconUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <div className="font-black">Footer dùng chung toàn website</div>
        <div className="mt-1 leading-5">Mọi thay đổi Footer tại Category Page hiện tại sẽ áp dụng cho tất cả Category Page/Home. Footer được quản lý như một thành phần global và phải giống nhau hoàn toàn giữa các trang.</div>
      </div>
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0054a6]" />
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
              Tùy Chỉnh Logo, Nền & Footer Builder Không Cần Code
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600">
            Quản lý logo Header/Footer, Hotline trực tiếp, màu sắc nền, overlay, và các cột khối nội dung Footer linh hoạt.
          </p>
        </div>

        {/* Global Footer Switch */}
        <div className="flex items-center gap-3 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-200">
          <label className="text-xs font-bold text-neutral-700">Hiển Thị Footer:</label>
          <button
            type="button"
            onClick={() => updateFooter({ enabled: !footerVisible, enabledExplicit: true })}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              footerVisible ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      {/* 2. Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('branding')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'branding'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Logo & Thương Hiệu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('layout')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'layout'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Màu Sắc & Nền (Background)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('columns')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'columns'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cột & Khối Footer ({footer.columns?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('social')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'social'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Mạng Xã Hội (Social Links)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('buttons')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'buttons'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Nút Social & Contact Tùy Chỉnh ({currentContactButtons.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('legal')}
          className={`flex items-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'legal'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Bản Quyền & Pháp Lý</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 1: LOGO & BRANDING */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contact Bar visibility */}
          <div className="lg:col-span-2 bg-blue-50 rounded-2xl p-5 sm:p-6 border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-blue-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Thanh liên hệ lớn phía trên Footer</span>
                </h3>
                <p className="text-xs text-blue-800/80 mt-1 max-w-2xl">
                  Bật để hiển thị các nút lớn có chữ như Facebook Messenger, Hotline, YouTube, TikTok ở phía trên Footer. Tắt để chỉ giữ các icon nhỏ trong nội dung Footer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateFooter({ showTopContactBar: footer.showTopContactBar !== true })}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  footer.showTopContactBar === true
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:border-blue-400'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${footer.showTopContactBar === true ? 'bg-white' : 'bg-neutral-400'}`} />
                {footer.showTopContactBar === true ? 'Đang Bật' : 'Đang Tắt'}
              </button>
            </div>
          </div>

          {/* Header Logo */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Logo Header (Đầu Trang)</span>
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-24 h-16 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center overflow-hidden p-1">
                {config.headerLogoUrl || config.brandLogoUrl ? (
                  <img
                    src={config.headerLogoUrl || config.brandLogoUrl}
                    alt="Header Logo"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-neutral-400 text-center font-bold">Chưa có ảnh</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={config.headerLogoUrl || ''}
                  onChange={(e) => onChange({ ...config, headerLogoUrl: e.target.value })}
                  placeholder="Nhập URL Logo Header hoặc dán ảnh..."
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh từ máy tính (PNG/SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => onChange({ ...config, headerLogoUrl: url }))
                    }
                  />
                </label>
              </div>
            </div>

            {/* Header Logo Height Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-neutral-700">
                <span>Chiều cao hiển thị Logo Header:</span>
                <span className="text-blue-600 font-bold">{config.headerLogoHeight || 44}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="80"
                value={config.headerLogoHeight || 44}
                onChange={(e) => onChange({ ...config, headerLogoHeight: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Presets */}
            <div className="hidden pt-2">
              <span className="text-[11px] font-bold text-neutral-500 block mb-1.5">
                Hoặc chọn mẫu Logo có sẵn:
              </span>
              <div className="flex flex-wrap gap-2">
                {LOGO_PRESETS.map((lp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ ...config, headerLogoUrl: lp.url })}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-blue-50 hover:text-blue-700 text-neutral-700 border border-neutral-200 transition-colors"
                  >
                    {lp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Logo */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Logo Footer (Chân Trang)</span>
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-24 h-16 rounded-xl border border-dashed border-neutral-300 bg-neutral-900 flex items-center justify-center overflow-hidden p-1">
                {footer.footerLogoUrl || config.footerLogoUrl || config.brandLogoUrl ? (
                  <img
                    src={footer.footerLogoUrl || config.footerLogoUrl || config.brandLogoUrl}
                    alt="Footer Logo"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-neutral-400 text-center font-bold">Chưa có ảnh</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={footer.footerLogoUrl || ''}
                  onChange={(e) => {
                    updateFooter({ footerLogoUrl: e.target.value });
                    onChange({ ...config, footerLogoUrl: e.target.value });
                  }}
                  placeholder="Nhập URL Logo Footer (Khuyên dùng logo chữ trắng)..."
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh từ máy tính (PNG/SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e, (url) => {
                        updateFooter({ footerLogoUrl: url });
                        onChange({ ...config, footerLogoUrl: url });
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <CmsLinkField config={config} id="footer-logo-destination" label="Nhấn logo Footer dẫn đến" value={footer.footerLogoLink} onChange={v=>updateFooter({footerLogoLink:v})}/>

            {/* Logo Height Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-neutral-700">
                <span>Chiều cao hiển thị Logo Footer:</span>
                <span className="text-blue-600 font-bold">{footer.footerLogoHeight || config.footerLogoHeight || 44}px</span>
              </div>
              <input
                type="range"
                min="24"
                max="80"
                value={footer.footerLogoHeight || config.footerLogoHeight || 44}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateFooter({ footerLogoHeight: val });
                  onChange({ ...config, footerLogoHeight: val });
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Brand Info & Global Hotline */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4 lg:col-span-2">
            <h3 className="font-bold text-sm sm:text-base text-neutral-900">
              Thông Tin Thương Hiệu & Hotline Toàn Website
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Tên Thương Hiệu (Brand Name)
                </label>
                <input
                  type="text"
                  value={config.brandName || ''}
                  onChange={(e) => onChange({ ...config, brandName: e.target.value })}
                  placeholder="vd: Tên thương hiệu"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Chữ Dưới Logo / Slogan
                </label>
                <input
                  type="text"
                  value={config.brandLogoText || ''}
                  onChange={(e) => onChange({ ...config, brandLogoText: e.target.value })}
                  placeholder="vd: Thông điệp ngắn của thương hiệu"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Số Điện Thoại Hotline (Bấm để gọi)</span>
                </label>
                <input
                  type="text"
                  value={config.hotline || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...config,
                      hotline: v,
                      hotlineDisplay: v,
                      customContactButtons: (config.customContactButtons || []).map((b) => b.platform === 'hotline' ? { ...b, value: v } : b),
                      footer: {
                        ...footer,
                        hotline: v,
                        customContactButtons: (footer.customContactButtons || []).map((b) => b.platform === 'hotline' ? { ...b, value: v } : b),
                      },
                      websiteSettings: config.websiteSettings ? {
                        ...config.websiteSettings,
                        header: { ...config.websiteSettings.header, hotline: v },
                      } : config.websiteSettings,
                    });
                  }}
                  placeholder="vd: 1900 55 88 99 hoặc 0901 234 567"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold text-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Đoạn Giới Thiệu Chân Trang (Footer Description)
              </label>
              <textarea
                rows={3}
                value={footer.footerDescription || ''}
                onChange={(e) => updateFooter({ footerDescription: e.target.value })}
                placeholder="Nhập đoạn văn giới thiệu tóm tắt công ty..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 2: LAYOUT, COLORS & BACKGROUND */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'layout' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-6">
          <div>
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Tùy Biến Nền Footer (Màu Nền hoặc Hình Ảnh)
            </h3>
            <p className="text-xs text-neutral-600">
              Bạn có thể sử dụng màu nền đơn giản, sang trọng hoặc tải hình ảnh nền kèm lớp phủ màu (overlay) và điều chỉnh độ trong suốt.
            </p>
          </div>

          {/* Mode Switch: Color vs Image */}
          <div className="flex items-center gap-4 border-b border-neutral-100 pb-4">
            <span className="text-xs font-bold text-neutral-700">Chế độ nền Footer:</span>
            <div className="inline-flex rounded-xl p-1 bg-neutral-100 border border-neutral-200">
              <button
                type="button"
                onClick={() => updateFooter({ bgMode: 'color' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  footer.bgMode !== 'image'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Màu Nền Đơn Sắc
              </button>
              <button
                type="button"
                onClick={() => updateFooter({ bgMode: 'image' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  footer.bgMode === 'image'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Hình Ảnh Nền (Background Image)
              </button>
            </div>
          </div>

          {/* Color Mode Options */}
          {footer.bgMode !== 'image' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-2">
                  Chọn Theme Màu Nền Footer:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'dark', label: 'Dark Navy (Chuẩn)', bg: '#0b1329', text: 'text-white' },
                    { id: 'brand-blue', label: 'thương hiệu của bạn Blue', bg: '#003870', text: 'text-white' },
                    { id: 'black', label: 'Black Huyền Bí', bg: '#000000', text: 'text-white' },
                    { id: 'light', label: 'Light Tươi Sáng', bg: '#f4f8fc', text: 'text-neutral-900' },
                    { id: 'custom', label: 'Tùy Chỉnh Mã Màu', bg: footer.customBgColor || '#1e1e24', text: 'text-white' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateFooter({ bgType: t.id as any })}
                      style={{ backgroundColor: t.bg }}
                      className={`h-14 rounded-xl p-2 flex flex-col justify-between border transition-all cursor-pointer ${t.text} ${
                        footer.bgType === t.id
                          ? 'ring-2 ring-blue-500 border-white shadow-md'
                          : 'border-white/20 hover:opacity-90'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{t.label}</span>
                      {footer.bgType === t.id && <Check className="w-4 h-4 self-end" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Color input */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Mã Màu Nền Tự Chọn (Hex Color):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={footer.customBgColor || '#0b1329'}
                    onChange={(e) => updateFooter({ customBgColor: e.target.value, bgType: 'custom' })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                  />
                  <input
                    type="text"
                    value={footer.customBgColor || '#0b1329'}
                    onChange={(e) => updateFooter({ customBgColor: e.target.value, bgType: 'custom' })}
                    placeholder="#0b1329"
                    className="w-32 text-xs p-2.5 rounded-xl border border-neutral-200 font-mono"
                  />
                  <span className="text-xs text-neutral-500">
                    Áp dụng ngay khi chọn chế độ "Tùy Chỉnh Mã Màu"
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4"><button type="button" className="px-3 py-2 border rounded-lg bg-[#0B0C0E] text-[#C5A880] text-xs font-bold" onClick={()=>onChange({...config,footer:heritageFooter(footer)})}>Áp dụng Footer than chì · champagne</button><p className="text-xs text-neutral-500 mt-2">Giữ logo, cột, liên kết và thông tin liên hệ; chỉ đổi nền, màu chữ và font.</p></div>
          <label className="block text-xs font-bold">Bố cục Footer<select className="mt-1 w-full max-w-sm rounded-lg border p-2 text-xs" value={footer.visualStyle||'current'} onChange={e=>updateFooter({visualStyle:e.target.value as FooterConfig['visualStyle']})}><option value="current">Bố cục hiện tại</option><option value="heritage">Di sản · thoáng và đường kẻ mảnh</option></select></label>
          {/* Footer Text Colors */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div>
              <h4 className="text-sm font-black text-neutral-900">Màu Chữ Footer</h4>
              <p className="text-xs text-neutral-500 mt-1">Điều chỉnh màu chữ trực tiếp trên giao diện khách hàng. Thay đổi sẽ được áp dụng sau khi Lưu/Xuất bản.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'textColor', label: 'Chữ chính', fallback: '#e5e7eb' },
                { key: 'headingColor', label: 'Tiêu đề', fallback: '#ffffff' },
                { key: 'mutedTextColor', label: 'Chữ phụ', fallback: '#9ca3af' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">{item.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(footer as any)[item.key] || item.fallback}
                      onChange={(e) => updateFooter({ [item.key]: e.target.value } as Partial<FooterConfig>)}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                    />
                    <input
                      type="text"
                      value={(footer as any)[item.key] || item.fallback}
                      onChange={(e) => updateFooter({ [item.key]: e.target.value } as Partial<FooterConfig>)}
                      className="flex-1 min-w-0 text-xs p-2.5 rounded-xl border border-neutral-200 font-mono"
                      placeholder={item.fallback}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Typography Fonts */}
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-600" />
                  <span>Font Chữ Footer (Footer Typography)</span>
                </h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Tùy chỉnh phông chữ cho toàn bộ phần chân trang Footer, đồng bộ hoặc tách biệt với phông chữ chính của Website.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FontSelector
                value={footer.fontFamily || ''}
                onChange={(font) => updateFooter({ fontFamily: font })}
                label="Font Chữ Toàn Bộ Footer (Nội dung & Liên kết)"
                previewText="Giới thiệu thương hiệu và thông tin liên hệ"
              />
              <FontSelector
                value={footer.headingFontFamily || ''}
                onChange={(font) => updateFooter({ headingFontFamily: font })}
                label="Font Chữ Tiêu Đề Cột Footer (Heading Font)"
                previewText="SẢN PHẨM • DỊCH VỤ • LIÊN HỆ"
              />
            </div>
          </div>

          {/* Image Mode Options */}
          {footer.bgMode === 'image' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  URL Hình Ảnh Nền Footer:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={footer.bgImageUrl || ''}
                    onChange={(e) => updateFooter({ bgImageUrl: e.target.value })}
                    placeholder="Nhập URL ảnh hoặc tải ảnh lên"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-3 py-2.5 rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh lên</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => updateFooter({ bgImageUrl: url }))}
                    />
                  </label>
                </div>
              </div>

              {/* Presets */}
              <div className="hidden">
                <span className="text-[11px] font-bold text-neutral-500 block mb-1.5">
                  Hoặc sử dụng ảnh nền đã tải lên:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FOOTER_BG_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updateFooter({ bgImageUrl: p.url })}
                      className="relative h-20 rounded-xl overflow-hidden border border-neutral-200 hover:ring-2 hover:ring-blue-500 transition-all text-left group"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/50 p-2 flex items-end">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          {p.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay Color & Opacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Màu Lớp Phủ (Overlay Color):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={footer.overlayColor || '#000000'}
                      onChange={(e) => updateFooter({ overlayColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                    />
                    <input
                      type="text"
                      value={footer.overlayColor || '#000000'}
                      onChange={(e) => updateFooter({ overlayColor: e.target.value })}
                      className="w-28 text-xs p-2 rounded-xl border border-neutral-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                    <span>Độ Trong Suốt Lớp Phủ:</span>
                    <span className="text-blue-600 font-bold">{footer.overlayOpacity || 40}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={footer.overlayOpacity || 40}
                    onChange={(e) => updateFooter({ overlayOpacity: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                  <span className="text-[10px] text-neutral-500 block mt-1">
                    Độ mờ càng cao giúp chữ hiển thị rõ ràng và tương phản tốt trên nền ảnh.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Floating Call & Mobile Sticky toggles */}
          <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <span className="font-bold text-xs text-neutral-900 block">
                  Nút Gọi & Zalo Nổi (Floating Bar)
                </span>
                <span className="text-[11px] text-neutral-500">
                  Hiển thị nút gọi điện thoại & chat Zalo góc dưới màn hình
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateFooter({ showFloatingContactBar: !footer.showFloatingContactBar })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  footer.showFloatingContactBar !== false ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <span className="font-bold text-xs text-neutral-900 block">
                  Thanh Sticky Bar Dưới Cùng Mobile
                </span>
                <span className="text-[11px] text-neutral-500">
                  Cố định nút CTA nhận ưu đãi khi khách hàng lướt xem trên điện thoại
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateFooter({ showMobileStickyBar: !footer.showMobileStickyBar })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  footer.showMobileStickyBar !== false ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 3: COLUMNS & BLOCKS BUILDER */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'columns' && (
        <div className="space-y-6">
          {/* Add Column Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-bold text-neutral-800">
              Thêm Khối / Cột Footer Mới:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddColumn('brand')}
                className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cột Giới Thiệu / Logo</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddColumn('links')}
                className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cột Danh Sách Liên Kết</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddColumn('contact')}
                className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cột Thông Tin Liên Hệ</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddColumn('social')}
                className="inline-flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cột Mạng Xã Hội / Chứng Nhận</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddColumn('custom')}
                className="inline-flex items-center gap-1 text-xs font-bold bg-neutral-100 text-neutral-800 hover:bg-neutral-200 px-3 py-1.5 rounded-xl border border-neutral-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cột Tự Do</span>
              </button>
            </div>
          </div>

          {/* List of Columns */}
          <div className="space-y-4">
            {(footer.columns || []).map((col, idx) => (
              <div
                key={col.id}
                className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden"
              >
                {/* Column Row Header */}
                <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Order Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 disabled:opacity-30 cursor-pointer"
                        title="Di chuyển lên trước"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(idx, 'down')}
                        disabled={idx === (footer.columns?.length || 0) - 1}
                        className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 disabled:opacity-30 cursor-pointer"
                        title="Di chuyển xuống sau"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>

                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{col.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                        Loại: {col.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateColumn(col.id, { enabled: !col.enabled })}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                        col.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {col.enabled ? 'Đang Bật' : 'Đã Tắt'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingColumnId(editingColumnId === col.id ? null : col.id)}
                      className="text-xs px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold border border-blue-200 cursor-pointer"
                    >
                      {editingColumnId === col.id ? 'Thu Gọn' : 'Chỉnh Sửa'}
                    </button>

                    <button
                      type="button"
                      aria-label={`Xóa cột ${col.title || ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteColumn(col.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="relative z-20 inline-flex items-center justify-center min-w-9 min-h-9 p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors pointer-events-auto"
                      title="Xóa cột"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                </div>

                {/* Column Detailed Form when open */}
                {editingColumnId === col.id && (
                  <div className="p-5 space-y-4 bg-white">
                    <div>
                      <label className="text-xs font-bold text-neutral-700 block mb-1">
                        Tiêu Đề Cột
                      </label>
                      <input
                        type="text"
                        value={col.title}
                        onChange={(e) => handleUpdateColumn(col.id, { title: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                      />
                    </div>

                    {/* Specific fields based on Column Type */}
                    {col.type === 'brand' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={col.showLogo !== false}
                              onChange={(e) => handleUpdateColumn(col.id, { showLogo: e.target.checked })}
                              className="rounded-sm text-blue-600"
                            />
                            <span>Hiển thị Logo trong cột này</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={col.showSocials !== false}
                              onChange={(e) => handleUpdateColumn(col.id, { showSocials: e.target.checked })}
                              className="rounded-sm text-blue-600"
                            />
                            <span>Hiển thị các icon Mạng Xã Hội trong cột này</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-neutral-700 block mb-1">
                            Nội Dung Mô Tả Doanh Nghiệp
                          </label>
                          <textarea
                            rows={3}
                            value={col.content || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { content: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}

                    {col.type === 'links' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-700">
                            Danh Sách Các Liên Kết (Links):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newLinks = [
                                ...(col.links || []),
                                {
                                  id: `l_${Date.now()}`,
                                  label: 'Liên Kết Mới',
                                  url: '#lead-form-section',
                                },
                              ];
                              handleUpdateColumn(col.id, { links: newLinks });
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm Link</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(col.links || []).map((link, lIdx) => (
                            <div key={link.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={link.label}
                                onChange={(e) => {
                                  const newLinks = [...(col.links || [])];
                                  newLinks[lIdx].label = e.target.value;
                                  handleUpdateColumn(col.id, { links: newLinks });
                                }}
                                placeholder="Tên hiển thị link..."
                                className="w-1/3 text-xs p-2 rounded-lg border border-neutral-200"
                              />
                              <input
                                type="text"
                                value={link.url}
                                onChange={(e) => {
                                  const newLinks = [...(col.links || [])];
                                  newLinks[lIdx].url = e.target.value;
                                  handleUpdateColumn(col.id, { links: newLinks });
                                }}
                                placeholder="URL hoặc #id..."
                                className="flex-1 text-xs p-2 rounded-lg border border-neutral-200 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newLinks = (col.links || []).filter((_, i) => i !== lIdx);
                                  handleUpdateColumn(col.id, { links: newLinks });
                                }}
                                className="p-1.5 text-neutral-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {col.type === 'contact' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-neutral-700 block mb-1">
                            Địa Chỉ Trụ Sở / Chi Nhánh
                          </label>
                          <input
                            type="text"
                            value={col.contactAddress || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { contactAddress: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-neutral-700 block mb-1">
                            Hotline Tư Vấn (Bấm để gọi)
                          </label>
                          <input
                            type="text"
                            value={col.contactHotline || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { contactHotline: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-neutral-700 block mb-1">
                            Email Hỗ Trợ Khách Hàng
                          </label>
                          <input
                            type="email"
                            value={col.contactEmail || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { contactEmail: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-neutral-700 block mb-1">
                            Thời Gian Tiếp Khách / Làm Việc
                          </label>
                          <input
                            type="text"
                            value={col.contactHours || ''}
                            onChange={(e) => handleUpdateColumn(col.id, { contactHours: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
                          />
                        </div>
                      </div>
                    )}

                    {(col.type === 'custom' || col.type === 'social') && (
                      <div>
                        <label className="text-xs font-bold text-neutral-700 block mb-1">
                          Nội Dung Chi Tiết (Hỗ trợ xuống dòng)
                        </label>
                        <textarea
                          rows={4}
                          value={col.content || ''}
                          onChange={(e) => handleUpdateColumn(col.id, { content: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 4: SOCIAL LINKS */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'social' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Liên Kết Mạng Xã Hội Chính Thức
            </h3>
            <p className="text-xs text-neutral-600">
              Gán đường link dẫn đến các kênh mạng xã hội của thương hiệu của bạn. Nếu để trống kênh nào, icon tương ứng sẽ tự động ẩn đi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Facebook Fanpage URL:
              </label>
              <input
                type="text"
                value={footer.socialLinks?.facebook || ''}
                onChange={(e) =>
                  updateFooter({
                    socialLinks: { ...footer.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="https://facebook.com/your-page"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                YouTube Channel URL:
              </label>
              <input
                type="text"
                value={footer.socialLinks?.youtube || ''}
                onChange={(e) =>
                  updateFooter({
                    socialLinks: { ...footer.socialLinks, youtube: e.target.value },
                  })
                }
                placeholder="https://youtube.com/@your-channel"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                TikTok URL:
              </label>
              <input
                type="text"
                value={footer.socialLinks?.tiktok || ''}
                onChange={(e) =>
                  updateFooter({
                    socialLinks: { ...footer.socialLinks, tiktok: e.target.value },
                  })
                }
                placeholder="https://tiktok.com/@your-channel"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Zalo Official Account / Link Chat:
              </label>
              <input
                type="text"
                value={footer.socialLinks?.zalo || ''}
                onChange={(e) =>
                  updateFooter({
                    socialLinks: { ...footer.socialLinks, zalo: e.target.value },
                  })
                }
                placeholder="https://zalo.me/0901234567"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                LinkedIn Company URL:
              </label>
              <input
                type="text"
                value={footer.socialLinks?.linkedin || ''}
                onChange={(e) =>
                  updateFooter({
                    socialLinks: { ...footer.socialLinks, linkedin: e.target.value },
                  })
                }
                placeholder="https://linkedin.com/company/your-company"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Banner to dynamic contact buttons */}
          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cần thêm nút Hotline click-to-call, Messenger, Maps, WhatsApp hoặc Upload Icon riêng?</span>
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Chuyển sang tab Nút Social & Contact Tùy Chỉnh để cấu hình động mọi nền tảng mà không cần viết code.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('buttons')}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Mở Trình Quản Lý Nút Động →
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 5: DYNAMIC CONTACT & SOCIAL BUTTONS */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'buttons' && (
        <div className="space-y-6">
          {/* Main header banner */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="font-bold text-base text-neutral-900">
                  Quản Lý Nút Social & Contact Tùy Chỉnh (Dynamic & No-Code)
                </h3>
              </div>
              <p className="text-xs text-neutral-600 max-w-2xl">
                Cấu hình động, không hard-code. Admin có thể thêm mới mọi nền tảng (Hotline click-to-call, Zalo, Messenger, Google Maps, YouTube, TikTok...), tùy chỉnh tên, chức năng, tải icon/logo riêng và vị trí hiển thị.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAddCustomContactButton()}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nút Tùy Chỉnh</span>
            </button>
          </div>

          {/* 1-Click Platform Presets */}
          <div className="bg-blue-50/70 rounded-2xl p-4 sm:p-5 border border-blue-200/80">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Thêm Nhanh Nền Tảng Phổ Biến (1-Click):</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAddCustomContactButton('hotline')}
                className="text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>+ Hotline (Click-to-Call)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('zalo')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#0068ff] hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Zalo Tư Vấn</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('messenger')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Facebook Messenger</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('maps')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#ea4335] hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>+ Google Maps (Chỉ đường)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('youtube')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#ff0000] hover:bg-red-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Kênh YouTube</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('tiktok')}
                className="text-xs px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Kênh TikTok</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('whatsapp')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#25d366] hover:bg-emerald-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ WhatsApp Chat</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton('email')}
                className="text-xs px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>+ Email Hỗ Trợ</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomContactButton()}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nền Tảng Khác</span>
              </button>
            </div>
          </div>

          {/* Widget placement options */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Nút Nổi Speed Dial (Floating Widget)</span>
                <span className="text-[11px] text-neutral-500">Hiển thị nhóm nút tròn nổi ở góc dưới màn hình</span>
              </div>
              <button
                type="button"
                onClick={() => updateFooter({ showFloatingContactBar: !footer.showFloatingContactBar })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  footer.showFloatingContactBar ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Thanh Dính Đáy Mobile (Sticky Bar)</span>
                <span className="text-[11px] text-neutral-500">Hiển thị thanh Hotline và Đăng ký cố định trên Smartphone</span>
              </div>
              <button
                type="button"
                onClick={() => updateFooter({ showMobileStickyBar: !footer.showMobileStickyBar })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  footer.showMobileStickyBar ? 'bg-blue-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>

          {/* Buttons List */}
          <div className="space-y-3">
            {currentContactButtons.length === 0 && (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-neutral-300 p-6">
                <PhoneCall className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-neutral-700">Chưa có nút liên hệ nào</p>
                <p className="text-xs text-neutral-500 mb-4">Hãy bấm vào các nút thêm nhanh ở trên để tạo nút liên hệ đầu tiên</p>
                <button
                  type="button"
                  onClick={() => handleAddCustomContactButton('hotline')}
                  className="inline-flex items-center gap-1.5 bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>+ Thêm Hotline Click-to-Call</span>
                </button>
              </div>
            )}

            {currentContactButtons.map((btn, bIdx) => {
              const isExpanded = editingCustomButtonId === btn.id;

              return (
                <div
                  key={btn.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Item Header / Overview Card */}
                  <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/70 border-b border-neutral-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-0.5 bg-white rounded-lg border border-neutral-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveCustomContactButton(bIdx, 'up')}
                          disabled={bIdx === 0}
                          title="Di chuyển lên"
                          className="p-1 rounded-md hover:bg-neutral-100 text-neutral-600 disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-neutral-400 px-1">#{bIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveCustomContactButton(bIdx, 'down')}
                          disabled={bIdx === currentContactButtons.length - 1}
                          title="Di chuyển xuống"
                          className="p-1 rounded-md hover:bg-neutral-100 text-neutral-600 disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Live Pill Preview */}
                      <div
                        style={{ backgroundColor: btn.bgColor || '#0054a6', color: btn.textColor || '#ffffff' }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs"
                      >
                        <ContactButtonIcon button={btn} className="w-4 h-4" />
                        <span>{btn.name || 'Chưa đặt tên'}</span>
                      </div>

                      {/* Badges */}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-700">
                        {btn.platform}
                      </span>

                      {/* Placements tags */}
                      <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-neutral-500">
                        {btn.showInFooter && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Footer</span>}
                        {btn.showFloating && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Nổi</span>}
                        {btn.showMobileBar && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Mobile Bar</span>}
                      </div>
                    </div>

                    {/* Action controls */}
                    <div className="flex items-center gap-2">
                      {/* Enable/Disable switch */}
                      <button
                        type="button"
                        onClick={() => handleUpdateCustomContactButton(btn.id, { enabled: !btn.enabled })}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                          btn.enabled ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                        }`}
                      >
                        {btn.enabled ? 'Đang Bật' : 'Đã Tắt'}
                      </button>

                      {/* Duplicate button */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateCustomContactButton(btn)}
                        title="Nhân bản nút"
                        className="p-1.5 text-neutral-400 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomContactButton(btn.id)}
                        title="Xóa nút"
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand/Collapse */}
                      <button
                        type="button"
                        onClick={() => setEditingCustomButtonId(isExpanded ? null : btn.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        <span>{isExpanded ? 'Thu gọn' : 'Chỉnh sửa'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-4 bg-white">
                      {/* Row 1: Name, Platform, Action */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Tên Nút Hiển Thị:
                          </label>
                          <input
                            type="text"
                            value={btn.name}
                            onChange={(e) => handleUpdateCustomContactButton(btn.id, { name: e.target.value })}
                            placeholder="Ví dụ: Hotline 24/7, Chat Zalo..."
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Nền Tảng (Platform):
                          </label>
                          <select
                            value={btn.platform}
                            onChange={(e) => {
                              const newPlat = e.target.value as ContactButtonPlatform;
                              handleUpdateCustomContactButton(btn.id, {
                                platform: newPlat,
                                presetIcon: (newPlat as any),
                              });
                            }}
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          >
                            <option value="hotline">Hotline (Số Điện Thoại)</option>
                            <option value="zalo">Zalo</option>
                            <option value="messenger">Facebook Messenger</option>
                            <option value="facebook">Facebook Fanpage / Profile</option>
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="maps">Google Maps (Chỉ đường)</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="email">Email Hỗ Trợ</option>
                            <option value="telegram">Telegram</option>
                            <option value="form">Form Đăng Ký Tư Vấn</option>
                            <option value="other">Nền Tảng Khác (Tùy Chỉnh)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                            Chức Năng / Hành Động:
                          </label>
                          <select
                            value={btn.actionType}
                            onChange={(e) =>
                              handleUpdateCustomContactButton(btn.id, {
                                actionType: e.target.value as ContactButtonActionType,
                              })
                            }
                            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          >
                            <option value="call">Gọi Điện Trực Tiếp (Click-to-Call tel:...)</option>
                            <option value="zalo">Mở Chat Zalo (zalo.me/...)</option>
                            <option value="messenger">Mở Facebook Messenger (m.me/...)</option>
                            <option value="maps">Mở Chỉ Đường Google Maps</option>
                            <option value="whatsapp">Mở Chat WhatsApp</option>
                            <option value="email">Gửi Email (mailto:...)</option>
                            <option value="form">Cuộn đến biểu mẫu liên hệ</option>
                            <option value="url">Mở Đường Dẫn URL Bất Kỳ</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Value / URL / Phone */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-neutral-700">
                            Giá Trị Đích (Số Điện Thoại / Link URL / Địa Chỉ):
                          </label>
                          {btn.actionType === 'call' && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              ✓ Hỗ trợ Click-to-Call trực tiếp trên Smartphone
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={btn.value}
                          onChange={(e) => handleUpdateCustomContactButton(btn.id, { value: e.target.value })}
                          placeholder={
                            btn.actionType === 'call'
                              ? 'Ví dụ: 1900 55 88 99 hoặc 0901234567'
                              : btn.actionType === 'email'
                              ? 'Ví dụ: lienhe@example.com'
                              : btn.actionType === 'form'
                              ? '#lead-form-section'
                              : 'https://...'
                          }
                          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1">
                          {btn.actionType === 'call'
                            ? 'Khách hàng bấm vào nút trên điện thoại sẽ tự động mở ứng dụng cuộc gọi với số điện thoại này.'
                            : btn.actionType === 'zalo'
                            ? 'Đường link Zalo cá nhân hoặc Zalo Official Account (Ví dụ: https://zalo.me/0901234567).'
                            : btn.actionType === 'maps'
                            ? 'Link Google Maps hoặc địa chỉ để khách hàng bấm mở ứng dụng bản đồ chỉ đường.'
                            : btn.actionType === 'form'
                            ? 'Tự động cuộn mượt xuống khối Form đăng ký tư vấn trên trang.'
                            : 'Đường dẫn liên kết trang web hoặc nền tảng đích.'}
                        </p>
                      </div>

                      {/* Row 3: Custom Icon / Logo Upload */}
                      <div className="pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-neutral-700">
                            Icon / Logo Của Nút:
                          </label>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomContactButton(btn.id, { iconType: 'preset' })}
                              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                                btn.iconType === 'preset'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              Icon Vector Chuẩn
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomContactButton(btn.id, { iconType: 'custom_upload' })}
                              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                                btn.iconType === 'custom_upload'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              Upload Icon / Logo Riêng
                            </button>
                          </div>
                        </div>

                        {btn.iconType === 'preset' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'phone', label: '📞 Hotline / Điện Thoại' },
                              { id: 'zalo', label: '💬 Zalo' },
                              { id: 'messenger', label: '💬 Messenger' },
                              { id: 'facebook', label: 'Facebook' },
                              { id: 'youtube', label: 'YouTube' },
                              { id: 'tiktok', label: 'TikTok' },
                              { id: 'maps', label: '📍 Google Maps' },
                              { id: 'whatsapp', label: 'WhatsApp' },
                              { id: 'email', label: '✉️ Email' },
                              { id: 'telegram', label: 'Telegram' },
                              { id: 'globe', label: '🌐 Website' },
                              { id: 'shield', label: '🛡️ Khiên Bảo Mật' },
                              { id: 'star', label: '⭐ Ngôi Sao' },
                              { id: 'form', label: '📝 Form Đăng Ký' },
                            ].map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleUpdateCustomContactButton(btn.id, { presetIcon: preset.id })}
                                className={`text-left text-xs p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  (btn.presetIcon || btn.platform) === preset.id
                                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                                }`}
                              >
                                <span className="truncate">{preset.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl border border-dashed border-neutral-300 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs">
                              {btn.customIconUrl ? (
                                <img
                                  src={btn.customIconUrl}
                                  alt="Custom Icon"
                                  referrerPolicy="no-referrer"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-neutral-400 text-center font-bold">Chưa có logo</span>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={btn.customIconUrl || ''}
                                onChange={(e) =>
                                  handleUpdateCustomContactButton(btn.id, {
                                    iconType: 'custom_upload',
                                    customIconUrl: e.target.value,
                                  })
                                }
                                placeholder="Dán link ảnh logo hoặc upload file bên dưới..."
                                className="w-full text-xs p-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                              <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Tải Logo / Icon riêng từ máy tính (PNG, SVG, WebP)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleButtonIconUpload(btn.id, e)}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Row 4: Button Colors */}
                      <div className="pt-2 border-t border-neutral-100">
                        <label className="text-[11px] font-bold text-neutral-700 block mb-2">
                          Màu Sắc Nút:
                        </label>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          {/* Bg color */}
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-600 font-semibold">Màu nền:</span>
                            <input
                              type="color"
                              value={btn.bgColor || '#0054a6'}
                              onChange={(e) => handleUpdateCustomContactButton(btn.id, { bgColor: e.target.value })}
                              className="w-7 h-7 rounded-lg cursor-pointer border border-neutral-300"
                            />
                            <input
                              type="text"
                              value={btn.bgColor || '#0054a6'}
                              onChange={(e) => handleUpdateCustomContactButton(btn.id, { bgColor: e.target.value })}
                              className="w-20 text-xs p-1 rounded-md border border-neutral-200 font-mono text-center uppercase"
                            />
                          </div>

                          {/* Quick brand colors */}
                          <div className="flex items-center gap-1">
                            {[
                              { hex: '#0054a6', name: 'thương hiệu của bạn' },
                              { hex: '#dc2626', name: 'Hotline Đỏ' },
                              { hex: '#0068ff', name: 'Zalo' },
                              { hex: '#0084ff', name: 'Messenger' },
                              { hex: '#ea4335', name: 'Google Maps' },
                              { hex: '#ff0000', name: 'YouTube' },
                              { hex: '#000000', name: 'TikTok' },
                              { hex: '#25d366', name: 'WhatsApp' },
                              { hex: '#059669', name: 'Emerald' },
                              { hex: '#334155', name: 'Slate' },
                            ].map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => handleUpdateCustomContactButton(btn.id, { bgColor: c.hex })}
                                title={c.name}
                                style={{ backgroundColor: c.hex }}
                                className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                              />
                            ))}
                          </div>

                          {/* Text color */}
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-neutral-600 font-semibold">Màu chữ & Icon:</span>
                            <input
                              type="color"
                              value={btn.textColor || '#ffffff'}
                              onChange={(e) => handleUpdateCustomContactButton(btn.id, { textColor: e.target.value })}
                              className="w-7 h-7 rounded-lg cursor-pointer border border-neutral-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomContactButton(btn.id, { textColor: '#ffffff' })}
                              className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-bold hover:bg-neutral-100"
                            >
                              Trắng
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomContactButton(btn.id, { textColor: '#1e293b' })}
                              className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] font-bold hover:bg-neutral-100"
                            >
                              Đen
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 5: Display Placements & Target */}
                      <div className="pt-2 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 cursor-pointer hover:bg-neutral-100">
                          <input
                            type="checkbox"
                            checked={btn.showInFooter !== false}
                            onChange={(e) => handleUpdateCustomContactButton(btn.id, { showInFooter: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-neutral-800">Hiển thị ở Footer</span>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 cursor-pointer hover:bg-neutral-100">
                          <input
                            type="checkbox"
                            checked={btn.showFloating === true}
                            onChange={(e) => handleUpdateCustomContactButton(btn.id, { showFloating: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-neutral-800">Nút Nổi (Speed Dial)</span>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 cursor-pointer hover:bg-neutral-100">
                          <input
                            type="checkbox"
                            checked={btn.showMobileBar === true}
                            onChange={(e) => handleUpdateCustomContactButton(btn.id, { showMobileBar: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-neutral-800">Thanh Sticky Mobile</span>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 cursor-pointer hover:bg-neutral-100">
                          <input
                            type="checkbox"
                            checked={btn.openInNewTab !== false}
                            onChange={(e) => handleUpdateCustomContactButton(btn.id, { openInNewTab: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-neutral-800">Mở Tab Mới (_blank)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB 6: COPYRIGHT & DISCLAIMER */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'legal' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 space-y-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900 mb-1">
              Bản Quyền & Tuyên Bố Miễn Trừ Trách Nhiệm (Compliance)
            </h3>
            <p className="text-xs text-neutral-600">
              Kiểm tra nội dung công bố, chính sách quyền riêng tư và các quy định phù hợp với ngành nghề của website.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">
              Dòng Bản Quyền (Copyright Text)
            </label>
            <input
              type="text"
              value={footer.copyrightText || ''}
              onChange={(e) => updateFooter({ copyrightText: e.target.value })}
              placeholder="© 2026 Tên thương hiệu..."
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">
              Tuyên Bố Miễn Trừ & Cảnh Báo Pháp Lý (Advertising & Legal Disclaimer)
            </label>
            <textarea
              rows={4}
              value={footer.disclaimerText || ''}
              onChange={(e) => updateFooter({ disclaimerText: e.target.value })}
              placeholder="Thông tin trên website có thể thay đổi theo chính sách được công bố..."
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};
