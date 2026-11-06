import { heritageButton, heritageSection } from '../../utils/heritageDesign';
import React, { useState } from 'react';
import {
  Layout,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Edit3,
  Sliders,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Shield,
  Layers,
  BarChart2,
  Upload,
  X,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  CheckCircle2,
  FileText,
  Star,
  ExternalLink,
  Package,
  Grid,
  Columns,
  Palette,
  Maximize2,
} from 'lucide-react';
import {
  LandingPageConfig,
  LandingPageSection,
  SectionType,
  SectionLayout,
  SectionPaddingY,
  SectionImage,
  SectionItem,
  HeroSlide,
  AdminRole,
  SectionCategory,
} from '../../types';
import { LandingPage } from '../landing/LandingPage';
import { ActionEditor, ButtonDesignEditor, ImageUrlField } from './SettingsEditors';
import { FontSelector } from '../common/FontSelector';
import { BlogPostEditor } from './BlogPostEditor';
import { QuickSectionStyleEditor } from './QuickSectionStyleEditor';
import { CmsLinkField } from './CmsLinkField';
import { copySectionVisualStyle, pasteSectionVisualStyle, type SectionVisualStyle } from '../../utils/sectionVisualStyle';

interface Props {
  config: LandingPageConfig;
  onChange: (config: LandingPageConfig) => void;
  role?: AdminRole;
  onNavigateTab?: (tab: string) => void;
}


// Kho ảnh mẫu đã được xóa. Admin chỉ sử dụng ảnh tự tải lên hoặc URL ảnh thật.
const BAOVIET_IMAGE_PRESETS: Array<{ name: string; url: string; category: string }> = [];

// Helper to convert uploaded local image file to base64 Data URL
const handleImageFileUpload = (
  file: File,
  callback: (base64: string) => void,
  onError?: (msg: string) => void
) => {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    if (onError) {
      onError('Kích thước ảnh tối đa là 8MB. Vui lòng chọn ảnh dung lượng nhỏ hơn.');
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      callback(reader.result);
    }
  };
  reader.readAsDataURL(file);
};

export const ContentEditor: React.FC<Props> = ({ config, onChange, role = 'superadmin', onNavigateTab }) => {
  const contentOnly = role === 'content_editor';
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'formSettings'>('sections');
  const [editingSection, setEditingSection] = useState<LandingPageSection | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [isNewSection, setIsNewSection] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<LandingPageSection | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Drag states for image upload areas in Hero tab
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isDraggingBg, setIsDraggingBg] = useState(false);

  // Modal active subtab
  const [modalTab, setModalTab] = useState<'general' | 'design' | 'layout' | 'action' | 'responsive' | 'advanced' | 'images' | 'items' | 'blog' | 'motion'>('general');
  const [copiedStyle, setCopiedStyle] = useState<SectionVisualStyle | null>(null);
  const [showHeroEditorModal, setShowHeroEditorModal] = useState(false);
  const [heroEditorTab, setHeroEditorTab] = useState<'general' | 'design' | 'images'>('general');
  const [editingHero, setEditingHero] = useState<LandingPageConfig | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<SectionType>('customContent');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sortedSections = [...(config.sections || [])].sort((a, b) => a.order - b.order);
  const heroBenefits = config.heroBenefits || [];

  const handleSectionMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedSections.length) return;

    const newSorted = [...sortedSections];
    const temp = newSorted[index];
    newSorted[index] = newSorted[targetIndex];
    newSorted[targetIndex] = temp;

    const reordered = newSorted.map((s, i) => ({ ...s, order: i + 1 }));
    onChange({ ...config, sections: reordered });
    showToast('Đã cập nhật thứ tự hiển thị của khối nội dung.');
  };

  const handleToggleSection = (sectionId: string) => {
    const updated = sortedSections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    onChange({ ...config, sections: updated });
  };

  const handleDuplicateSection = (sec: LandingPageSection) => {
    const newSec: LandingPageSection = {
      ...JSON.parse(JSON.stringify(sec)),
      id: `sec_${Date.now()}`,
      title: `${sec.title} (Bản sao)`,
      internalName: `${sec.internalName || sec.title} (Bản sao)`,
      deletedAt: undefined,
      status: 'active',
      enabled: true,
      order: sec.order + 1,
    };
    const newSections: LandingPageSection[] = [];
    for (const s of sortedSections) {
      newSections.push(s);
      if (s.id === sec.id) {
        newSections.push(newSec);
      }
    }
    const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }));
    onChange({ ...config, sections: reordered });
    showToast(`Đã nhân bản khối "${sec.title}" thành công!`);
  };

  const handleDeleteSectionPrompt = (section: LandingPageSection) => {
    setSectionToDelete(section);
  };

  const handleConfirmDeleteSection = () => {
    if (!sectionToDelete) return;
    const deleted = { ...sectionToDelete, enabled: false, status: 'inactive' as const, deletedAt: new Date().toISOString() };
    const remaining = sortedSections.filter((s) => s.id !== sectionToDelete.id);
    const reordered = remaining.map((s, i) => ({ ...s, order: i + 1 }));
    onChange({ ...config, sections: reordered, deletedSections: [...(config.deletedSections || []), deleted] });
    const title = sectionToDelete.title;
    setSectionToDelete(null);
    showToast(`Đã chuyển khối "${title}" vào Thùng rác.`);
  };

  const handleOpenAddSection = () => {
    setIsNewSection(true);
    setModalTab('general');
    const categories = (config.sectionCategories || []).filter(c => c.enabled !== false).sort((a,b)=>(a.order||0)-(b.order||0));
    const selectedCategory = categories[0];
    const now = Date.now();
    const newSec: LandingPageSection = {
      id: `sec_${now}`,
      internalName: '',
      anchorId: `section-${now}`,
      status: 'active',
      type: selectedCategory?.type || 'customContent',
      sectionCategoryId: selectedCategory?.id,
      title: '',
      subtitle: '',
      badge: '',
      order: sortedSections.length + 1,
      enabled: true,
      items: [],
      images: [],
    };
    setEditingSection(newSec);
    setShowSectionModal(true);
  };

  const handleOpenEditSection = (section: LandingPageSection) => {
    setIsNewSection(false);
    setModalTab('general');
    setEditingSection(JSON.parse(JSON.stringify(section)));
    setShowSectionModal(true);
  };

  const handleSaveSectionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    const sectionToSave: LandingPageSection = editingSection.type === 'dualProduct'
      ? { ...editingSection, items: (editingSection.items || []).slice(0, 2).map(item => ({ ...item, features: (item.features || []).slice(0, 4) })) }
      : editingSection;

    if (isNewSection) {
      onChange({ ...config, sections: [...sortedSections, sectionToSave] });
      showToast(`Đã thêm khối "${editingSection.title}" thành công!`);
    } else {
      onChange({
        ...config,
        sections: sortedSections.map((s) =>
          s.id === editingSection.id ? sectionToSave : s
        ),
      });
      showToast(`Đã lưu thay đổi khối "${editingSection.title}"!`);
    }

    setShowSectionModal(false);
    setEditingSection(null);
  };

  const handleOpenHeroEditor = () => {
    const draft = JSON.parse(JSON.stringify(config)) as LandingPageConfig;
    if ((draft.heroLayoutMode === 'image-form' || draft.heroLayoutMode === 'full-image') && (!draft.heroSlides || draft.heroSlides.length === 0) && draft.heroImage) {
      draft.heroSlides = [
        {
          id: `hero_${Date.now()}`,
          url: draft.heroImage,
          alt: draft.heroImageAlt || draft.headline,
        },
      ];
    }
    setEditingHero(draft);
    setHeroEditorTab('general');
    setShowHeroEditorModal(true);
  };

  const handleSaveHeroEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHero) return;

    const nextHeroSlides = (editingHero.heroSlides || []).filter((slide) => !!slide.url);
    onChange({
      ...config,
      heroLayoutMode: editingHero.heroLayoutMode === 'full-image' ? 'image-form' : (editingHero.heroLayoutMode || 'split'),
      heroSlides: nextHeroSlides,
      heroImage: editingHero.heroImage || '',
      heroImageLink: editingHero.heroImageLink || '',
      heroImageAlt: editingHero.heroImageAlt || '',
      heroBackgroundImage: editingHero.heroBackgroundImage || '',
      heroBackgroundMode: editingHero.heroBackgroundMode || 'color',
      heroCustomBgColor: editingHero.heroCustomBgColor,
      heroOverlayColor: editingHero.heroOverlayColor,
      heroOverlayOpacity: editingHero.heroOverlayOpacity,
      heroAutoplayMs: editingHero.heroAutoplayMs || 4500,
      heroShowDots: editingHero.heroShowDots !== false,
      heroShowArrows: editingHero.heroShowArrows !== false,
      heroFullImageOverlayOpacity: editingHero.heroFullImageOverlayOpacity || 0,
      heroFullImageShowText: false,
      heroHeightMode: editingHero.heroHeightMode || 'large',
      heroImageObjectPosition: editingHero.heroImageObjectPosition || 'center',
      heroBadge: editingHero.heroBadge,
      headline: editingHero.headline,
      subtitle: editingHero.subtitle,
      heroCtaPrimary: editingHero.heroCtaPrimary,
      heroCtaSecondary: editingHero.heroCtaSecondary,
      heroPrimaryCta: editingHero.heroPrimaryCta,
      heroSecondaryCta: editingHero.heroSecondaryCta,
    });

    setShowHeroEditorModal(false);
    setEditingHero(null);
    showToast('Đã lưu toàn bộ thiết kế Hero. Hãy bấm “Lưu Bản Nháp” hoặc “Xuất Bản Thay Đổi” để áp dụng.');
  };

  const addHeroImageUrl = (url: string, alt = '') => {
    if (!editingHero || !url.trim()) return;
    const slide: HeroSlide = {
      id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: url.trim(),
      alt: alt.trim() || editingHero.heroImageAlt || editingHero.headline,
    };
    setEditingHero({ ...editingHero, heroSlides: [...(editingHero.heroSlides || []), slide] });
  };

  const handleHeroMultipleFiles = (files: FileList | null) => {
    if (!editingHero || !files?.length) return;
    Array.from(files).forEach((file) => {
      handleImageFileUpload(
        file,
        (base64) => {
          setEditingHero((current) =>
            current
              ? {
                  ...current,
                  heroSlides: [
                    ...(current.heroSlides || []),
                    {
                      id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                      url: base64,
                      alt: file.name,
                    },
                  ],
                }
              : current
          );
        },
        (err) => showToast(err)
      );
    });
    showToast(`Đang thêm ${files.length} ảnh vào bộ Hero...`);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Content: Hero Copy vs Sections vs Form Copy */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'sections'
              ? 'bg-[#0054a6] text-white shadow-sm'
              : 'text-neutral-700 hover:text-neutral-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Khối Nội Dung & Giao Diện ({sortedSections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'hero'
              ? 'bg-[#0054a6] text-white shadow-sm'
              : 'text-neutral-700 hover:text-neutral-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hero & Nhận Diện Bảo Việt</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('formSettings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'formSettings'
              ? 'bg-[#0054a6] text-white shadow-sm'
              : 'text-neutral-700 hover:text-neutral-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Nội Dung Form & Thông Báo</span>
        </button>
      </div>

      {/* 1. SECTIONS BUILDER TAB (Highest Priority) */}
      {activeTab === 'sections' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
            <div>
              <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#0054a6]" />
                <span>Advanced Section Management – Quản Lý & Tùy Biến Khối Nội Dung</span>
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Giữ nguyên cấu trúc CMS hiện tại; cho phép thêm, sửa, nhân bản, đổi thứ tự và cấu hình sâu từng Section mà không cần chỉnh HTML/CSS/JavaScript.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowLivePreview(true)}
                className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Xem trước trực tiếp</span>
              </button>
              {!contentOnly && (
              <button
              type="button"
              onClick={handleOpenAddSection}
              className="inline-flex items-center gap-2 bg-[#0054a6] hover:bg-[#004182] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khối Mới</span>
              </button>
              )}
            </div>
          </div>

          {!contentOnly && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
              <h4 className="text-sm font-black text-neutral-900">Danh mục Khối Nội Dung</h4>
              <p className="text-[11px] text-neutral-500 mt-1 mb-4">Tự thêm, sửa, xóa danh mục. Hệ thống không nạp danh mục mẫu.</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_auto] gap-2 mb-3">
                <input className="px-3 py-2 border rounded-xl text-xs" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="Tên danh mục mới" />
                <select className="px-3 py-2 border rounded-xl text-xs bg-white" value={newCategoryType} onChange={e=>setNewCategoryType(e.target.value as SectionType)}>
                  <option value="customContent">Khối tùy biến</option><option value="fullImage">Ảnh phủ toàn khối</option><option value="logoMarquee">Logo/Icon đối tác chạy</option><option value="dualProduct">2 sản phẩm + CTA</option><option value="blogPost">Blog / Post / Tin tức</option><option value="textMedia">Text & Media</option><option value="products">Products</option><option value="features">Features</option><option value="gallery">Gallery</option><option value="stats">Stats</option><option value="testimonials">Testimonials</option><option value="faq">FAQ</option><option value="ctaBanner">CTA</option><option value="embed">Embed</option><option value="downloads">Download</option>
                </select>
                <button type="button" onClick={()=>{const name=newCategoryName.trim();if(!name)return;const cat:SectionCategory={id:`sc_${Date.now()}`,name,type:newCategoryType,enabled:true,order:(config.sectionCategories||[]).length+1};onChange({...config,sectionCategories:[...(config.sectionCategories||[]),cat]});setNewCategoryName('');showToast('Đã thêm danh mục khối.')}} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Thêm danh mục</button>
              </div>
              {(config.sectionCategories||[]).length===0 ? <div className="text-xs text-neutral-400 border border-dashed rounded-xl p-4">Chưa có danh mục. Khối mới sẽ bắt đầu trắng với loại Khối tùy biến.</div> : <div className="space-y-2">{(config.sectionCategories||[]).map(cat=><div key={cat.id} className="grid grid-cols-1 md:grid-cols-[1fr_190px_auto] gap-2 items-center border rounded-xl p-2.5"><input className="px-3 py-2 border rounded-lg text-xs" value={cat.name} onChange={e=>onChange({...config,sectionCategories:(config.sectionCategories||[]).map(c=>c.id===cat.id?{...c,name:e.target.value}:c)})}/><select className="px-3 py-2 border rounded-lg text-xs bg-white" value={cat.type} onChange={e=>onChange({...config,sectionCategories:(config.sectionCategories||[]).map(c=>c.id===cat.id?{...c,type:e.target.value as SectionType}:c)})}><option value="customContent">Khối tùy biến</option><option value="fullImage">Ảnh phủ toàn khối</option><option value="logoMarquee">Logo/Icon đối tác chạy</option><option value="dualProduct">2 sản phẩm + CTA</option><option value="textMedia">Text & Media</option><option value="products">Products</option><option value="features">Features</option><option value="gallery">Gallery</option><option value="stats">Stats</option><option value="testimonials">Testimonials</option><option value="faq">FAQ</option><option value="ctaBanner">CTA</option><option value="embed">Embed</option><option value="downloads">Download</option></select><button type="button" onClick={()=>onChange({...config,sectionCategories:(config.sectionCategories||[]).filter(c=>c.id!==cat.id)})} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></div>)}</div>}
            </div>
          )}

          {/* Section List */}
          <div className="space-y-3">
            {sortedSections.map((sec, index) => {
              const itemCount = (sec.items || []).length;
              const imageCount = (sec.images || []).length + (sec.imageUrl ? 1 : 0);
              return (
                <div
                  key={sec.id}
                  className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    sec.enabled
                      ? 'border-neutral-200/90 shadow-xs hover:border-blue-300'
                      : 'border-dashed border-neutral-300 bg-neutral-50/70 opacity-60'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0054a6] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-100">
                      {index + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-neutral-950 truncate block">
                          {sec.title}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-semibold">
                          {sec.type}
                        </span>
                        {sec.anchorId && <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">#{sec.anchorId}</span>}
                        {sec.status === 'inactive' && <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold">Inactive</span>}
                        {sec.layout && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-[#0054a6] font-semibold">
                            Layout: {sec.layout}
                          </span>
                        )}
                        {sec.bgType && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold">
                            Nền: {sec.bgType}
                          </span>
                        )}
                        {sec.hideOnMobile && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">
                            Ẩn Mobile
                          </span>
                        )}
                      </div>

                      {sec.subtitle && (
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {sec.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-0.5">
                        {itemCount > 0 && (
                          <span>{itemCount} mục con / thẻ</span>
                        )}
                        {imageCount > 0 && (
                          <span className="flex items-center gap-1 text-[#0054a6] font-semibold">
                            <ImageIcon className="w-3 h-3" />
                            {imageCount} hình ảnh
                          </span>
                        )}
                        {!sec.enabled && (
                          <span className="text-amber-600 font-semibold">(Đang tạm ẩn)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!contentOnly && (<>
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleSectionMove(index, 'up')}
                      className="p-2 text-neutral-500 hover:text-[#0054a6] hover:bg-blue-50 rounded-xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Chuyển lên trên"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === sortedSections.length - 1}
                      onClick={() => handleSectionMove(index, 'down')}
                      className="p-2 text-neutral-500 hover:text-[#0054a6] hover:bg-blue-50 rounded-xl disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Chuyển xuống dưới"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => handleToggleSection(sec.id)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        sec.enabled
                          ? 'text-neutral-500 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={sec.enabled ? 'Tạm ẩn khối này' : 'Bật hiển thị khối này'}
                    >
                      {sec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button type="button" onClick={() => { setCopiedStyle(copySectionVisualStyle(sec)); showToast('Đã Copy Style.'); }} className="p-2 text-neutral-500 hover:text-violet-700 hover:bg-violet-50 rounded-xl" title="Copy Style"><Palette className="w-4 h-4"/></button>
                    {copiedStyle && <button type="button" onClick={() => { onChange({...config, sections: sortedSections.map(s=>s.id===sec.id?pasteSectionVisualStyle(s,copiedStyle):s)}); showToast('Đã Paste Style, giữ nguyên Content.'); }} className="p-2 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl" title="Paste Style"><Check className="w-4 h-4"/></button>}

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateSection(sec)}
                      className="p-2 text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors"
                      title="Nhân bản khối này"
                    >
                      <Copy className="w-4 h-4" />
                    </button>


                    </>)}
                    {/* Edit Section */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection(sec)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0054a6] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh Sửa</span>
                    </button>

                    {!contentOnly && (<>
                    {/* Delete Section */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSectionPrompt(sec)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                      title="Xóa khối này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </>)}

                  </div>
                </div>
              );
            })}
          </div>

          {!contentOnly && (config.deletedSections || []).length > 0 && <div className="bg-white border border-red-100 rounded-2xl p-4 space-y-3"><div className="font-black text-sm text-red-700">Thùng rác Sections ({config.deletedSections?.length})</div>{(config.deletedSections || []).map(sec => <div key={sec.id} className="flex items-center justify-between gap-3 bg-red-50/50 border border-red-100 rounded-xl p-3"><div><div className="text-xs font-bold">{sec.internalName || sec.title}</div><div className="text-[10px] text-neutral-500">Xóa mềm · dữ liệu vẫn được giữ</div></div><div className="flex gap-2"><button type="button" onClick={() => { const restored={...sec,deletedAt:undefined,enabled:true,status:'active' as const,order:sortedSections.length+1}; onChange({...config,sections:[...sortedSections,restored],deletedSections:(config.deletedSections||[]).filter(x=>x.id!==sec.id)}); showToast('Đã khôi phục Section.'); }} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-bold">Restore</button><button type="button" onClick={() => onChange({...config,deletedSections:(config.deletedSections||[]).filter(x=>x.id!==sec.id)})} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">Xóa vĩnh viễn</button></div></div>)}</div>}
        </div>
      )}

      {/* 2. HERO COPY & BRAND IDENTITY */}
      {activeTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Type className="w-5 h-5 text-[#0054a6]" />
                  <span>Hero Builder – Chỉnh Sửa Hero Như Một Khối Nội Dung</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Chọn Hero ảnh toàn khối có slideshow tự chạy hoặc Hero ảnh + chữ/form. Có thể tự thêm nhiều ảnh, đổi chiều cao và overlay.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenHeroEditor}
                className="inline-flex items-center justify-center gap-2 bg-[#0054a6] hover:bg-[#004182] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh Sửa Hero</span>
              </button>
            </div>

            {/* Brand Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Tên Thương Hiệu Doanh Nghiệp
                </label>
                <input
                  type="text"
                  value={config.brandName}
                  onChange={(e) => onChange({ ...config, brandName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#0054a6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Chữ Viết Tắt Logo / Huy Hiệu
                </label>
                <input
                  type="text"
                  value={config.brandLogoText}
                  onChange={(e) => onChange({ ...config, brandLogoText: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
                />
              </div>
            </div>

            {/* Header configuration is centralized in Website Settings to prevent conflicting CTA editors.
                Legacy fields remain untouched in saved config and are read by the runtime fallback. */}
            <div className="cms-ui-settings-hub rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Header & CTA chung</h4>
                <p className="text-xs mt-1 text-slate-600">Quản lý tập trung tại Cài đặt Website → Header & Banner, bao gồm URL, Category Page và Section Page. Cấu hình Header cũ vẫn được giữ để tương thích.</p>
              </div>
              <button type="button" onClick={()=>{try{sessionStorage.setItem('cms:website-settings-tab','header')}catch{};onNavigateTab?.('settings')}} className="cms-ui-hub-action shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold">Mở cấu hình Header →</button>
            </div>

            {/* Hero benefits editor */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-emerald-800">Các dòng dấu tích / quyền lợi nhanh trên Hero</h4>
                  <p className="text-[11px] text-neutral-500">Chỉnh sửa trực tiếp từng dòng giống nội dung trong hình mẫu.</p>
                </div>
                <button type="button" onClick={() => onChange({ ...config, heroBenefits: [...heroBenefits, { id: `hb_${Date.now()}`, title: 'Quyền lợi mới:', text: 'Nội dung quyền lợi...' }] })} className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-xl cursor-pointer">+ Thêm dòng</button>
              </div>
              <div className="space-y-2">
                {heroBenefits.map((benefit, idx) => (
                  <div key={benefit.id} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
                    <input type="text" value={benefit.title} onChange={(e) => { const next = [...heroBenefits]; next[idx] = { ...next[idx], title: e.target.value }; onChange({ ...config, heroBenefits: next }); }} placeholder="Tiêu đề in đậm" className="px-2.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold bg-white" />
                    <input type="text" value={benefit.text} onChange={(e) => { const next = [...heroBenefits]; next[idx] = { ...next[idx], text: e.target.value }; onChange({ ...config, heroBenefits: next }); }} placeholder="Nội dung" className="px-2.5 py-2 border border-neutral-300 rounded-lg text-xs bg-white" />
                    <button type="button" onClick={() => onChange({ ...config, heroBenefits: heroBenefits.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer" title="Xóa dòng"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero social proof / trust copy */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><h4 className="text-xs font-black text-amber-800">Trust / Social Proof trên Hero</h4><p className="text-[11px] text-neutral-500">Toàn bộ nội dung trust dưới ảnh Hero được quản lý tại CMS.</p></div>
                <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={config.heroSocialProofEnabled!==false} onChange={e=>onChange({...config,heroSocialProofEnabled:e.target.checked})}/> Hiển thị</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-bold mb-1">Badge trên ảnh</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={config.heroImageBadgeText||''} onChange={e=>onChange({...config,heroImageBadgeText:e.target.value})}/></div>
                <div><label className="block text-[11px] font-bold mb-1">Rating text</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={config.heroRatingText||''} onChange={e=>onChange({...config,heroRatingText:e.target.value})}/></div>
                <div className="sm:col-span-2"><label className="block text-[11px] font-bold mb-1">Social proof text</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={config.heroSocialProofText||''} onChange={e=>onChange({...config,heroSocialProofText:e.target.value})}/></div>
              </div>
            </div>

            {/* Urgency Badge */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Huy Hiệu Đầu Trang (Hero Badge)
              </label>
              <input
                type="text"
                value={config.heroBadge}
                onChange={(e) => onChange({ ...config, heroBadge: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            {/* Headline */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Tiêu Đề Chính (Headline chuyển đổi cao) *
              </label>
              <textarea
                rows={2}
                value={config.headline}
                onChange={(e) => onChange({ ...config, headline: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Tiêu Đề Phụ & Lời Giới Thiệu (Subtitle)
              </label>
              <textarea
                rows={3}
                value={config.subtitle}
                onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            {/* Hero Banner Image */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#0054a6]" />
                    <span>Hình Ảnh Banner Nổi Bật Tại Hero</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tải ảnh trực tiếp từ máy tính hoặc nhập URL ảnh của bạn
                  </p>
                </div>
                {config.heroImage && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...config, heroImage: '' });
                      showToast('Đã xóa ảnh banner Hero.');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Ảnh</span>
                  </button>
                )}
              </div>

              {/* Upload Input & Dropzone */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="url"
                  placeholder="URL hình ảnh (https://...)"
                  value={config.heroImage || ''}
                  onChange={(e) => onChange({ ...config, heroImage: e.target.value })}
                  className="flex-1 w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0054a6]"
                />
                <label className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Từ Máy Tính</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFileUpload(
                          file,
                          (base64) => {
                            onChange({ ...config, heroImage: base64 });
                            showToast('Đã thêm ảnh Hero từ thiết bị thành công!');
                          },
                          (err) => showToast(err)
                        );
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

                <CmsLinkField config={config} id="hero-image-link" label="Nhấn ảnh Hero dẫn đến" value={config.heroImageLink} onChange={v=>onChange({...config,heroImageLink:v})}/>
              {/* Preview */}
              {config.heroImage && (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-white">
                  <img
                    src={config.heroImage}
                    alt="Hero Preview"
                    referrerPolicy="no-referrer"
                    className="h-36 w-full object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Presets */}
          <div className="hidden lg:col-span-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Kho Ảnh Mẫu Chuẩn Bảo Việt (1-Click)</span>
            </h4>
            <p className="text-[11px] text-neutral-500">
              Bấm vào bất kỳ ảnh mẫu nào để chọn làm hình ảnh đại diện Hero ngay tức thì.
            </p>

            <div className="grid grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {BAOVIET_IMAGE_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onChange({ ...config, heroImage: preset.url });
                    showToast(`Đã chọn ảnh: ${preset.name}`);
                  }}
                  className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 cursor-pointer hover:border-[#0054a6] hover:shadow-md transition-all text-left"
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-1.5 bg-white">
                    <p className="text-[10px] font-bold text-neutral-800 truncate">
                      {preset.name}
                    </p>
                    <span className="text-[9px] text-[#0054a6] font-semibold">
                      {preset.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. FORM SETTINGS & COPY */}
      {activeTab === 'formSettings' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs max-w-3xl space-y-5">
          {onNavigateTab && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-blue-900 font-medium">
                Cấu hình trường dữ liệu, tiêu đề & popups đã được hợp nhất trong mục <strong>Biểu Mẫu Tư Vấn (Form Center)</strong>.
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('forms')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                Mở Form Center
              </button>
            </div>
          )}

          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <FileText className="w-5 h-5 text-[#0054a6]" />
            <span>Nội Dung Form Đăng Ký Tư Vấn & Thông Báo Tiếp Nhận</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Tiêu Đề Form *
              </label>
              <input
                type="text"
                value={config.formSettings.title}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, title: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Huy Hiệu Nhấn Mạnh Đầu Form
              </label>
              <input
                type="text"
                value={config.formSettings.badge}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, badge: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              Lời Dẫn Phụ Dưới Tiêu Đề
            </label>
            <textarea
              rows={2}
              value={config.formSettings.subtitle}
              onChange={(e) =>
                onChange({
                  ...config,
                  formSettings: { ...config.formSettings, subtitle: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Chữ Trên Nút Gửi *
              </label>
              <input
                type="text"
                value={config.formSettings.submitButtonText}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, submitButtonText: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold text-[#0054a6] focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Chữ Khi Đang Gửi Dữ Liệu
              </label>
              <input
                type="text"
                value={config.formSettings.submittingText}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, submittingText: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
              />
            </div>
          </div>

          {!contentOnly && (<>
          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Thiết Kế Nút Gửi & Tracking</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[['Màu nền','background','#0054a6'],['Màu hover','hoverBackground','#003f7d'],['Màu chữ','textColor','#ffffff']].map(([label,key,fallback]) => (
                <label key={key} className="text-xs font-bold text-neutral-700">{label}
                  <div className="mt-1 flex gap-2">
                    <input type="color" value={(config.formSettings.submitButtonDesign as any)?.[key] || fallback} onChange={(e) => onChange({...config, formSettings:{...config.formSettings, submitButtonDesign:{...(config.formSettings.submitButtonDesign || {}), [key]:e.target.value}}})} className="w-10 h-10 rounded border"/>
                    <input type="text" value={(config.formSettings.submitButtonDesign as any)?.[key] || fallback} onChange={(e) => onChange({...config, formSettings:{...config.formSettings, submitButtonDesign:{...(config.formSettings.submitButtonDesign || {}), [key]:e.target.value}}})} className="min-w-0 flex-1 px-2 py-2 border rounded-lg font-mono text-xs"/>
                  </div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="text-xs font-bold text-neutral-700">Border Radius (px)<input type="number" min="0" max="50" value={config.formSettings.submitButtonDesign?.borderRadius ?? 12} onChange={(e) => onChange({...config, formSettings:{...config.formSettings, submitButtonDesign:{...(config.formSettings.submitButtonDesign || {}), borderRadius:Number(e.target.value)}}})} className="mt-1 w-full px-3 py-2 border rounded-lg"/></label>
              <label className="text-xs font-bold text-neutral-700">Font Size (px)<input type="number" min="10" max="32" value={config.formSettings.submitButtonDesign?.fontSize ?? 16} onChange={(e) => onChange({...config, formSettings:{...config.formSettings, submitButtonDesign:{...(config.formSettings.submitButtonDesign || {}), fontSize:Number(e.target.value)}}})} className="mt-1 w-full px-3 py-2 border rounded-lg"/></label>
              <label className="text-xs font-bold text-neutral-700">Event Name<input type="text" value={config.formSettings.submitEventName || 'lead_submit'} onChange={(e) => onChange({...config, formSettings:{...config.formSettings, submitEventName:e.target.value}})} className="mt-1 w-full px-3 py-2 border rounded-lg font-mono text-xs"/></label>
            </div>
          </div>

          </>)}

          <div className="pt-4 border-t border-neutral-100 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Thông Điệp Khi Gửi Thành Công
            </h4>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Tiêu Đề Tiếp Nhận
              </label>
              <input
                type="text"
                value={config.formSettings.successHeading}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, successHeading: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Thông Điệp Hướng Dẫn Khách Hàng
              </label>
              <textarea
                rows={3}
                value={config.formSettings.successMessage}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, successMessage: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Cam Kết Bảo Mật Thông Tin Khách Hàng
              </label>
              <input
                type="text"
                value={config.formSettings.privacyDisclaimer}
                onChange={(e) =>
                  onChange({
                    ...config,
                    formSettings: { ...config.formSettings, privacyDisclaimer: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs text-neutral-600 focus:outline-none focus:border-[#0054a6]"
              />
            </div>
          </div>
        </div>
      )}

      {/* HERO BUILDER MODAL */}
      {showHeroEditorModal && editingHero && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[92vh] overflow-y-auto cms-admin-modal-scroll space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-950">Chỉnh Sửa Hero – Hero Builder</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Thiết kế Hero độc lập với các khối nội dung bên dưới. Thay đổi chỉ được đưa lên khách hàng sau khi Lưu Bản Nháp / Xuất Bản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHeroEditorModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg cursor-pointer"
                aria-label="Đóng Hero Builder"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-2">
              {[
                ['general', contentOnly ? 'Nội dung Hero' : 'Thông Tin & Kiểu Hero'],
                ...(!contentOnly ? [['design', 'Layout & Thiết Kế']] : []),
                ['images', `Quản Lý Hình Ảnh (${(editingHero.heroSlides || []).length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHeroEditorTab(key as 'general' | 'design' | 'images')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                    heroEditorTab === key ? 'bg-[#0054a6] text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {key === 'images' && <ImageIcon className="w-3.5 h-3.5" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveHeroEditor} className="space-y-5">
              {heroEditorTab === 'general' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 mb-2">1. Chọn kiểu Hero</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingHero({ ...editingHero, heroLayoutMode: 'split' })}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          (editingHero.heroLayoutMode || 'split') === 'split'
                            ? 'border-[#0054a6] bg-blue-50'
                            : 'border-neutral-200 hover:border-blue-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-5 h-5 text-[#0054a6]" />
                          <span className="font-black text-sm">Ảnh + Chữ / Form</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">
                          Giữ Hero chuyển đổi hiện tại: thương hiệu, badge, tiêu đề, mô tả, ảnh minh họa, CTA và Form tư vấn.
                        </p>
                      </button>

                      <button type="button" onClick={()=>setEditingHero({...editingHero,heroLayoutMode:'cinematic',heroHeightMode:'screen',heroOverlayOpacity:65,heroTitleFontFamily:"'Cormorant Garamond', Georgia, serif",heroSubtitleFontFamily:"'Plus Jakarta Sans', sans-serif",heroTitleColor:'#F9F8F5',heroSubtitleColor:'#B3B0A6',heroPrimaryCta:editingHero.heroPrimaryCta?{...editingHero.heroPrimaryCta,design:{...editingHero.heroPrimaryCta.design,...heritageButton}}:editingHero.heroPrimaryCta})} className={`text-left p-4 rounded-2xl border-2 transition-all ${editingHero.heroLayoutMode==='cinematic'?'border-[#C5A880] bg-amber-50':'border-neutral-200 hover:border-amber-200 bg-white'}`}><div className="font-black text-sm">Điện ảnh · ảnh/video tràn màn hình</div><p className="text-[11px] text-neutral-600 mt-2">Tiêu đề serif, lớp phủ tối, CTA champagne, 3 điểm nhấn cuối Hero. Dùng ảnh/video do bạn chọn; không hiển thị form trong Hero.</p></button>

                      <button
                        type="button"
                        onClick={() => {
                          const slides = editingHero.heroSlides?.length
                            ? editingHero.heroSlides
                            : editingHero.heroImage
                            ? [{ id: `hero_${Date.now()}`, url: editingHero.heroImage, alt: editingHero.heroImageAlt || editingHero.headline }]
                            : [];
                          setEditingHero({ ...editingHero, heroLayoutMode: 'image-form', heroSlides: slides });
                        }}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          (editingHero.heroLayoutMode === 'image-form' || editingHero.heroLayoutMode === 'full-image')
                            ? 'border-[#0054a6] bg-blue-50'
                            : 'border-neutral-200 hover:border-blue-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Columns className="w-5 h-5 text-[#0054a6]" />
                          <span className="font-black text-sm">Ảnh Nửa Khối + Form + Slideshow</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">
                          Ảnh chiếm 1/2 Hero bên trái, Form nhập thông tin nằm bên phải. Có thể thêm nhiều ảnh để ảnh bên trái tự động chạy và lặp liên tục.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Badge Hero</label>
                      <input
                        type="text"
                        value={editingHero.heroBadge || ''}
                        onChange={(e) => setEditingHero({ ...editingHero, heroBadge: e.target.value })}
                        className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Nút CTA chính</label>
                      <input
                        type="text"
                        value={editingHero.heroCtaPrimary || ''}
                        onChange={(e) => setEditingHero({ ...editingHero, heroCtaPrimary: e.target.value, heroPrimaryCta: {...editingHero.heroPrimaryCta, text:e.target.value} })}
                        className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
                      />
                    </div>
                  </div>

                  <div className="cms-ui-editor-panel rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                    <h3 className="font-black text-sm text-slate-800">CTA Hero · 3 đích điều hướng + kiểu nút</h3>
                    <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-3">
                      <div className="font-bold text-xs text-slate-700">CTA chính</div>
                      <ActionEditor config={editingHero} value={editingHero.heroPrimaryCta?.action||{type:'scroll',target:'lead-form-section'}} onChange={action=>setEditingHero({...editingHero,heroPrimaryCta:{...editingHero.heroPrimaryCta,text:editingHero.heroCtaPrimary,action}})}/>
                      <ButtonDesignEditor config={editingHero} value={editingHero.heroPrimaryCta?.design} onChange={design=>setEditingHero({...editingHero,heroPrimaryCta:{...editingHero.heroPrimaryCta,text:editingHero.heroCtaPrimary,design}})}/>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-3">
                      <label className="block text-xs font-bold text-slate-700">CTA phụ<input className="cms-ui-input w-full mt-1 px-3 py-2.5 border border-neutral-300 rounded-xl text-sm" value={editingHero.heroCtaSecondary||''} onChange={e=>setEditingHero({...editingHero,heroCtaSecondary:e.target.value,heroSecondaryCta:{...editingHero.heroSecondaryCta,text:e.target.value}})}/></label>
                      <ActionEditor config={editingHero} value={editingHero.heroSecondaryCta?.action||{type:'scroll',target:'sec_products'}} onChange={action=>setEditingHero({...editingHero,heroSecondaryCta:{...editingHero.heroSecondaryCta,text:editingHero.heroCtaSecondary,action}})}/>
                      <ButtonDesignEditor config={editingHero} value={editingHero.heroSecondaryCta?.design} onChange={design=>setEditingHero({...editingHero,heroSecondaryCta:{...editingHero.heroSecondaryCta,text:editingHero.heroCtaSecondary,design}})}/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">Tiêu Đề Hero *</label>
                    <textarea
                      rows={2}
                      required
                      value={editingHero.headline || ''}
                      onChange={(e) => setEditingHero({ ...editingHero, headline: e.target.value })}
                      className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">Mô Tả Hero</label>
                    <textarea
                      rows={3}
                      value={editingHero.subtitle || ''}
                      onChange={(e) => setEditingHero({ ...editingHero, subtitle: e.target.value })}
                      className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-[#0054a6]"
                    />
                  </div>

                  {!(editingHero.heroLayoutMode === 'image-form' || editingHero.heroLayoutMode === 'full-image') && (
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-xs font-black text-neutral-900">Ảnh minh họa Hero (kiểu Ảnh + Chữ)</p>
                          <p className="text-[11px] text-neutral-500">Ảnh này được dùng trong Hero hiện tại và không ảnh hưởng slideshow toàn khối.</p>
                        </div>
                        {editingHero.heroImage && (
                          <button
                            type="button"
                            onClick={() => setEditingHero({ ...editingHero, heroImage: '' })}
                            className="text-xs text-red-600 font-bold cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={editingHero.heroImage || ''}
                          onChange={(e) => setEditingHero({ ...editingHero, heroImage: e.target.value })}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-[#0054a6]"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer">
                          <Upload className="w-3.5 h-3.5" /> Tải ảnh
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageFileUpload(file, (base64) => setEditingHero({ ...editingHero, heroImage: base64 }), (err) => showToast(err));
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                        <CmsLinkField config={config} id="hero-image-modal-link" label="Nhấn ảnh Hero dẫn đến" value={editingHero.heroImageLink} onChange={v=>setEditingHero({...editingHero,heroImageLink:v})}/>
                    </div>
                  )}
                </div>
              )}

              {heroEditorTab === 'design' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Chiều Cao Hero</label>
                      <select
                        value={editingHero.heroHeightMode || 'large'}
                        onChange={(e) => setEditingHero({ ...editingHero, heroHeightMode: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="compact">Gọn – 360/430px</option>
                        <option value="normal">Tiêu chuẩn – 480/560px</option>
                        <option value="large">Lớn – 560/680px</option>
                        <option value="screen">Gần toàn màn hình</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">Vị trí cắt ảnh</label>
                      <select
                        value={editingHero.heroImageObjectPosition || 'center'}
                        onChange={(e) => setEditingHero({ ...editingHero, heroImageObjectPosition: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="left">Bên trái</option>
                        <option value="center">Ở giữa</option>
                        <option value="right">Bên phải</option>
                      </select>
                    </div>
                  </div>

                  {(editingHero.heroLayoutMode === 'image-form' || editingHero.heroLayoutMode === 'full-image') && (
                    <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-4">
                      <h4 className="text-xs font-black text-neutral-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#0054a6]" /> Slideshow tự động
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 mb-1">Tốc độ chuyển ảnh</label>
                          <select
                            value={editingHero.heroAutoplayMs || 4500}
                            onChange={(e) => setEditingHero({ ...editingHero, heroAutoplayMs: Number(e.target.value) })}
                            className="w-full px-3 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold bg-white"
                          >
                            <option value={2500}>2,5 giây / ảnh</option>
                            <option value={3500}>3,5 giây / ảnh</option>
                            <option value={4500}>4,5 giây / ảnh</option>
                            <option value={6000}>6 giây / ảnh</option>
                            <option value={8000}>8 giây / ảnh</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 mb-1">Lớp phủ tối trên ảnh</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="80"
                              value={editingHero.heroFullImageOverlayOpacity || 0}
                              onChange={(e) => setEditingHero({ ...editingHero, heroFullImageOverlayOpacity: Number(e.target.value) })}
                              className="flex-1"
                            />
                            <span className="w-12 text-right text-xs font-bold">{editingHero.heroFullImageOverlayOpacity || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs font-semibold">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingHero.heroShowArrows !== false}
                            onChange={(e) => setEditingHero({ ...editingHero, heroShowArrows: e.target.checked })}
                            className="rounded"
                          />
                          Hiện nút trái/phải
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingHero.heroShowDots !== false}
                            onChange={(e) => setEditingHero({ ...editingHero, heroShowDots: e.target.checked })}
                            className="rounded"
                          />
                          Hiện chấm điều hướng
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editingHero.heroShowTabs !== false} onChange={(e) => setEditingHero({ ...editingHero, heroShowTabs: e.target.checked })} className="rounded" />
                          Hiện hàng nút chọn ảnh Hero
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/60">
                    <p className="text-xs font-bold text-[#0054a6] mb-1">Cách hoạt động</p>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      <strong>Ảnh Nửa Khối + Form:</strong> ảnh slideshow chiếm 1/2 Hero bên trái, Form nằm bên phải và nhiều ảnh sẽ tự chạy lặp liên tục. <strong>Ảnh + Chữ / Form:</strong> giữ bố cục Hero hiện tại, phù hợp khi cần nội dung bán hàng và Form tư vấn.
                    </p>
                  </div>
                </div>
              )}

              {heroEditorTab === 'images' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-neutral-900">Bộ Ảnh Hero</h4>
                      <p className="text-[11px] text-neutral-500">
                        Thêm/xóa/sắp xếp ảnh từ máy tính hoặc URL. Mỗi ảnh có thể đặt một tên nút; hàng nút ngang phía trên Hero sẽ chuyển trực tiếp tới ảnh tương ứng. Có thể bật tự chạy đồng thời.
                      </p>
                    </div>
                    <label className="inline-flex items-center justify-center gap-2 bg-[#0054a6] hover:bg-[#004182] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Thêm nhiều ảnh từ máy tính
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleHeroMultipleFiles(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <input
                      id="hero-image-url-add"
                      type="url"
                      placeholder="Dán URL ảnh https://..."
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0054a6]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('hero-image-url-add') as HTMLInputElement | null;
                        if (el?.value) {
                          addHeroImageUrl(el.value);
                          el.value = '';
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer"
                    >
                      + Thêm URL
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(editingHero.heroSlides || []).length === 0 && (
                      <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-8 text-center text-xs text-neutral-500">
                        Chưa có ảnh slideshow. Hãy thêm nhiều ảnh để kích hoạt ảnh nửa khối bên trái tự chạy.
                      </div>
                    )}
                    {(editingHero.heroSlides || []).map((slide, idx) => (
                      <div key={slide.id || idx} className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border border-neutral-200 bg-white">
                        <img
                          src={slide.url}
                          alt={slide.alt || `Hero ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full sm:w-40 h-24 object-cover rounded-xl border border-neutral-200 bg-neutral-100 shrink-0"
                        />
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-neutral-900">Ảnh {idx + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const next = [...(editingHero.heroSlides || [])];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  setEditingHero({ ...editingHero, heroSlides: next });
                                }}
                                className="p-1.5 text-neutral-500 hover:text-[#0054a6] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                title="Đưa lên"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === (editingHero.heroSlides || []).length - 1}
                                onClick={() => {
                                  const next = [...(editingHero.heroSlides || [])];
                                  [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                  setEditingHero({ ...editingHero, heroSlides: next });
                                }}
                                className="p-1.5 text-neutral-500 hover:text-[#0054a6] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                title="Đưa xuống"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingHero({ ...editingHero, heroSlides: (editingHero.heroSlides || []).filter((_, i) => i !== idx) })}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Xóa ảnh"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                            <div><label className="block text-[10px] font-bold text-neutral-600 mb-1">Tên nút điều hướng ảnh</label><input type="text" value={slide.tabLabel || ''} onChange={(e) => { const next = [...(editingHero.heroSlides || [])]; next[idx] = { ...next[idx], tabLabel: e.target.value }; setEditingHero({ ...editingHero, heroSlides: next }); }} placeholder={`Ví dụ: Xe cơ giới / Sức khỏe / Ảnh ${idx+1}`} className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-[11px] focus:outline-none focus:border-[#0054a6]" /></div>
                            <label className="flex items-center gap-2 px-2.5 py-2 border rounded-lg bg-neutral-50 text-[11px] font-bold"><input type="checkbox" checked={slide.enabled !== false} onChange={(e) => { const next = [...(editingHero.heroSlides || [])]; next[idx] = { ...next[idx], enabled: e.target.checked }; setEditingHero({ ...editingHero, heroSlides: next }); }} /> Hiển thị</label>
                          </div>
                          <input
                            type="url"
                            value={slide.url}
                            onChange={(e) => {
                              const next = [...(editingHero.heroSlides || [])];
                              next[idx] = { ...next[idx], url: e.target.value };
                              setEditingHero({ ...editingHero, heroSlides: next });
                            }}
                            className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-[11px] font-mono focus:outline-none focus:border-[#0054a6]"
                          />
                          <input
                            type="text"
                            value={slide.alt || ''}
                            onChange={(e) => {
                              const next = [...(editingHero.heroSlides || [])];
                              next[idx] = { ...next[idx], alt: e.target.value };
                              setEditingHero({ ...editingHero, heroSlides: next });
                            }}
                            placeholder="Mô tả ảnh (alt)"
                            className="w-full px-2.5 py-2 border border-neutral-300 rounded-lg text-[11px] focus:outline-none focus:border-[#0054a6]"
                          />
                          <CmsLinkField config={config} id={`hero-slide-${slide.id}`} label="Nhấn ảnh Hero dẫn đến" value={slide.link} onChange={value=>{const next=[...(editingHero.heroSlides||[])];next[idx]={...next[idx],link:value};setEditingHero({...editingHero,heroSlides:next});}}/>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden pt-2 border-t border-neutral-100">
                    <span className="text-[11px] font-bold text-neutral-600 block mb-2">Chèn nhanh ảnh mẫu Bảo Việt:</span>
                    <div className="flex flex-wrap gap-2">
                      {BAOVIET_IMAGE_PRESETS.map((p, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => addHeroImageUrl(p.url, p.name)}
                          className="text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-[#0054a6] px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                <div className="text-[11px] text-neutral-500">
                  {(editingHero.heroLayoutMode === 'image-form' || editingHero.heroLayoutMode === 'full-image')
                    ? `${(editingHero.heroSlides || []).length} ảnh slideshow bên trái + Form bên phải`
                    : 'Hero ảnh + chữ / form'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHeroEditorModal(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0054a6] hover:bg-[#004182] text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu Toàn Bộ Hero
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ADVANCED SECTION EDIT / ADD BUILDER */}
      {showSectionModal && editingSection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto cms-admin-modal-scroll space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-neutral-950">
                  {isNewSection ? 'Thêm Khối Nội Dung Mới' : `Chỉnh Sửa Khối: ${editingSection.title}`}
                </h3>
                <p className="text-xs text-neutral-500">
                  Tùy biến nội dung, layout, màu nền và thêm nhiều hình ảnh theo ý muốn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-2">
              <button
                type="button"
                onClick={() => setModalTab('general')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  modalTab === 'general'
                    ? 'bg-[#0054a6] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Thông Tin Chung
              </button>
              {!contentOnly && editingSection.type !== 'blogPost' && (
              <button
                type="button"
                onClick={() => setModalTab('design')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  modalTab === 'design'
                    ? 'bg-[#0054a6] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Thiết Kế Khối
              </button>
              )}
              {!contentOnly && editingSection.type !== 'blogPost' && (<button type="button" onClick={() => setModalTab('layout')} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${modalTab === 'layout' ? 'bg-[#0054a6] text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>Bố Cục</button>)}

              {!contentOnly && editingSection.type !== 'blogPost' && (<button type="button" onClick={() => setModalTab('action')} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${modalTab === 'action' ? 'bg-[#0054a6] text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>CTA / Action</button>)}

              {!contentOnly && editingSection.type !== 'blogPost' && (<button type="button" onClick={() => setModalTab('responsive')} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${modalTab === 'responsive' ? 'bg-[#0054a6] text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>Responsive</button>)}

              {!contentOnly && editingSection.type !== 'blogPost' && (<button type="button" onClick={() => setModalTab('advanced')} className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${modalTab === 'advanced' ? 'bg-[#0054a6] text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>Nâng Cao</button>)}

              {editingSection.type === 'blogPost' && <button type="button" onClick={() => setModalTab('blog')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${modalTab==='blog'?'bg-[#0054a6] text-white':'text-neutral-600 hover:bg-neutral-100'}`}>Bài viết / Sidebar</button>}
              {!contentOnly && <button type="button" onClick={() => setModalTab('motion')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${modalTab==='motion'?'bg-[#0054a6] text-white':'text-neutral-600 hover:bg-neutral-100'}`}>Motion riêng</button>}

              {editingSection.type !== 'blogPost' && <button
                type="button"
                onClick={() => setModalTab('images')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                  modalTab === 'images'
                    ? 'bg-[#0054a6] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Quản Lý Hình Ảnh ({(editingSection.images || []).length})</span>
              </button>}
              {editingSection.type !== 'blogPost' && <button
                type="button"
                onClick={() => setModalTab('items')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  modalTab === 'items'
                    ? 'bg-[#0054a6] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Mục Con / Thẻ ({(editingSection.items || []).length})
              </button>}
            </div>

            <form onSubmit={handleSaveSectionModal} className="space-y-4">
              {/* TAB 1: GENERAL */}
              {modalTab === 'general' && (
                <div className="space-y-4">
                  {!contentOnly && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Loại Khối Nội Dung *
                    </label>
                    <select
                      value={editingSection.type}
                      onChange={(e) => setEditingSection({ ...editingSection, type: e.target.value as SectionType })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs sm:text-sm font-semibold bg-white focus:outline-none focus:border-[#0054a6]"
                    >
                      {(config.sectionCategories||[]).filter(c=>c.enabled!==false).map(c=><option key={c.id} value={c.type}>{c.name}</option>)}
                      <option value="customContent">Khối tùy biến / trắng</option>
                      <option value="fullImage">Ảnh duy nhất phủ toàn khối</option>
                      <option value="logoMarquee">Icon / Logo đối tác chạy vòng lặp</option>
                      <option value="dualProduct">2 sản phẩm + 4 đặc điểm + CTA</option>
                      <option value="blogPost">Bài viết Blog / Post / Tin tức</option>
                      <option value="embed">Nhúng Website / Video / Landing Page / Khối khác</option>
                      <option value="downloads">Tài Liệu / Link Tải Xuống</option>
                      <option value="textMedia">Text & Media</option>
                    </select>
                    {(config.sectionCategories||[]).length>0 && <div className="mt-2"><label className="block text-[11px] font-bold text-neutral-600 mb-1">Danh mục</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.sectionCategoryId||''} onChange={e=>{const c=(config.sectionCategories||[]).find(x=>x.id===e.target.value);setEditingSection({...editingSection,sectionCategoryId:c?.id,type:c?.type||editingSection.type})}}><option value="">Không gán danh mục</option>{(config.sectionCategories||[]).filter(c=>c.enabled!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
                  </div>
                  )}

                  {!contentOnly && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold text-neutral-800 mb-1">Tên quản trị nội bộ</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" value={editingSection.internalName || ''} onChange={e=>setEditingSection({...editingSection,internalName:e.target.value})} placeholder="vd: Product - Xe cơ giới" /></div>
                    <div><label className="block text-xs font-bold text-neutral-800 mb-1">Section ID / Anchor</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono" value={editingSection.anchorId || ''} onChange={e=>setEditingSection({...editingSection,anchorId:e.target.value.replace(/^#/,'').replace(/\s+/g,'-')})} placeholder="xe-co-gioi" /></div>
                    <div><label className="block text-xs font-bold text-neutral-800 mb-1">Trạng thái</label><select className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white" value={editingSection.status || (editingSection.enabled ? 'active':'inactive')} onChange={e=>setEditingSection({...editingSection,status:e.target.value as any,enabled:e.target.value==='active'})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Tiêu Đề Khối
                    </label>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0054a6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Tiêu Đề Phụ / Mô Tả
                    </label>
                    <textarea
                      rows={2}
                      value={editingSection.subtitle || ''}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, subtitle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#0054a6]"
                    />
                  </div>

                  {editingSection.type === 'fullImage' && (
                    <div className="p-4 rounded-2xl border border-violet-200 bg-violet-50/50 space-y-4">
                      <div><h4 className="text-sm font-black text-violet-950">Khối 1 ảnh duy nhất phủ toàn khối</h4><p className="text-[11px] text-violet-700 mt-1">Ảnh tự giữ đúng tỷ lệ gốc và phủ 100% chiều rộng. Không cần đặt Width/Height thủ công. CTA được cấu hình ở tab CTA / Action.</p></div>
                      <ImageUrlField label="Ảnh duy nhất của khối" value={editingSection.imageUrl} onChange={imageUrl=>setEditingSection({...editingSection,imageUrl})}/>
                      <div><label className="block text-xs font-bold text-neutral-800 mb-1">Alt Text ảnh</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.imageAlt||''} onChange={e=>setEditingSection({...editingSection,imageAlt:e.target.value})} placeholder="Mô tả ảnh cho SEO / Accessibility"/></div>
                      <div><label className="block text-xs font-bold text-neutral-800 mb-1">Chữ nằm trong ảnh</label><textarea rows={3} className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.overlayText||''} onChange={e=>setEditingSection({...editingSection,overlayText:e.target.value})} placeholder="Có thể để trống nếu chỉ muốn ảnh + CTA"/></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div><label className="block text-[11px] font-bold mb-1">Vị trí chữ / CTA</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.overlayPosition||'center'} onChange={e=>setEditingSection({...editingSection,overlayPosition:e.target.value as any})}><option value="top-left">Trên trái</option><option value="top-center">Trên giữa</option><option value="top-right">Trên phải</option><option value="center-left">Giữa trái</option><option value="center">Chính giữa</option><option value="center-right">Giữa phải</option><option value="bottom-left">Dưới trái</option><option value="bottom-center">Dưới giữa</option><option value="bottom-right">Dưới phải</option></select></div>
                        <div><label className="block text-[11px] font-bold mb-1">Font Size px</label><input type="number" min="10" max="120" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.overlayTextStyle?.fontSize??36} onChange={e=>setEditingSection({...editingSection,overlayTextStyle:{...editingSection.overlayTextStyle,fontSize:+e.target.value||36}})}/></div>
                        <div><label className="block text-[11px] font-bold mb-1">Weight</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.overlayTextStyle?.fontWeight||700} onChange={e=>setEditingSection({...editingSection,overlayTextStyle:{...editingSection.overlayTextStyle,fontWeight:+e.target.value}})}>{[300,400,500,600,700,800,900].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
                        <div><label className="block text-[11px] font-bold mb-1">Màu chữ</label><input type="color" className="w-full h-9 border rounded-xl" value={editingSection.overlayTextStyle?.color||'#ffffff'} onChange={e=>setEditingSection({...editingSection,overlayTextStyle:{...editingSection.overlayTextStyle,color:e.target.value}})}/></div>
                      </div>
                      <FontSelector value={editingSection.overlayTextStyle?.fontFamily||''} onChange={fontFamily=>setEditingSection({...editingSection,overlayTextStyle:{...editingSection.overlayTextStyle,fontFamily:fontFamily||undefined}})} label="Font chữ trong ảnh" previewText={editingSection.overlayText||'Chữ trên ảnh'}/>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="block text-[11px] font-bold mb-1">Max Width nội dung (px)</label><input type="number" min="180" max="1400" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.overlayMaxWidth??680} onChange={e=>setEditingSection({...editingSection,overlayMaxWidth:+e.target.value||680})}/></div>
                        <div><label className="block text-[11px] font-bold mb-1">Lớp phủ (%)</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.overlayOpacity??0} onChange={e=>setEditingSection({...editingSection,overlayOpacity:Math.max(0,Math.min(100,+e.target.value||0))})}/></div>
                        <div><label className="block text-[11px] font-bold mb-1">Màu lớp phủ</label><input type="color" className="w-full h-9 border rounded-xl" value={editingSection.overlayColor||'#000000'} onChange={e=>setEditingSection({...editingSection,overlayColor:e.target.value})}/></div>
                      </div>
                    </div>
                  )}

                  {editingSection.type === 'logoMarquee' && (
                    <div className="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/50 space-y-3">
                      <div><h4 className="text-sm font-black text-cyan-950">Logo / Icon đối tác chạy vòng lặp</h4><p className="text-[11px] text-cyan-700 mt-1">Thêm từng đối tác trong tab Mục Con / Thẻ; dùng Desktop / Main Image làm logo. Track được nhân đôi tự động để chạy liên tục.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-[11px] font-bold mb-1">Thời gian 1 vòng (giây)</label><input type="number" min="6" max="120" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.marqueeSpeedSeconds??28} onChange={e=>setEditingSection({...editingSection,marqueeSpeedSeconds:Math.max(6,Math.min(120,+e.target.value||28))})}/></div><div><label className="block text-[11px] font-bold mb-1">Hướng chạy</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.marqueeDirection||'left'} onChange={e=>setEditingSection({...editingSection,marqueeDirection:e.target.value as any})}><option value="left">Phải → Trái</option><option value="right">Trái → Phải</option></select></div><label className="flex items-center gap-2 text-xs font-bold pt-5"><input type="checkbox" checked={editingSection.marqueePauseOnHover!==false} onChange={e=>setEditingSection({...editingSection,marqueePauseOnHover:e.target.checked})}/>Dừng khi hover</label></div>
                    </div>
                  )}

                  {editingSection.type === 'dualProduct' && (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50"><h4 className="text-sm font-black text-emerald-950">Khối 2 sản phẩm</h4><p className="text-[11px] text-emerald-700 mt-1">Khối chỉ lưu/hiển thị tối đa 2 sản phẩm và tối đa 4 đặc điểm mỗi sản phẩm. CTA của từng sản phẩm chỉnh ngay trong tab Mục Con / Thẻ.</p></div>
                  )}

                  {(editingSection.type === 'embed' || editingSection.type === 'downloads') && (
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-4">
                      <div>
                        <h4 className="text-sm font-black text-blue-900">
                          {editingSection.type === 'embed'
                            ? 'Cấu hình Nhúng ở Khối lớn'
                            : 'Cấu hình Tải xuống ở Khối lớn'}
                        </h4>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Đây là nội dung của toàn bộ Section, không cần tạo Mục Con / Thẻ.
                        </p>
                      </div>

                      {editingSection.type === 'embed' ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-neutral-800 mb-1">
                              Nguồn nhúng
                            </label>
                            <select
                              className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
                              value={editingSection.embedSourceType || 'url'}
                              onChange={(e) =>
                                setEditingSection({
                                  ...editingSection,
                                  embedSourceType: e.target.value as any,
                                })
                              }
                            >
                              <option value="url">Link YouTube / Website / Video</option>
                              <option value="landingPage">Landing Page khác</option>
                              <option value="section">Một Khối Nội Dung của Landing Page khác</option>
                            </select>
                          </div>

                          {(editingSection.embedSourceType || 'url') === 'url' ? (
                            <div>
                              <label className="block text-xs font-bold text-neutral-800 mb-1">
                                URL cần nhúng
                              </label>
                              <input
                                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                                value={editingSection.embedUrl || editingSection.videoUrl || ''}
                                onChange={(e) =>
                                  setEditingSection({
                                    ...editingSection,
                                    embedUrl: e.target.value,
                                    videoUrl: e.target.value,
                                  })
                                }
                                placeholder="https://www.youtube.com/watch?v=... hoặc https://example.com"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-neutral-800 mb-1">
                                  URL Landing Page nguồn
                                </label>
                                <input
                                  className="w-full px-3 py-2 border rounded-xl text-xs"
                                  value={editingSection.embedPageUrl || ''}
                                  onChange={(e) =>
                                    setEditingSection({
                                      ...editingSection,
                                      embedPageUrl: e.target.value,
                                    })
                                  }
                                  placeholder="/landing-page-khac"
                                />
                              </div>

                              {editingSection.embedSourceType === 'section' && (
                                <div>
                                  <label className="block text-xs font-bold text-neutral-800 mb-1">
                                    Section ID / Anchor
                                  </label>
                                  <input
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                                    value={editingSection.embedSectionId || ''}
                                    onChange={(e) =>
                                      setEditingSection({
                                        ...editingSection,
                                        embedSectionId: e.target.value.replace(/^#/, ''),
                                      })
                                    }
                                    placeholder="sec_products"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-neutral-800 mb-1">
                                Cách hiển thị
                              </label>
                              <select
                                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white"
                                value={editingSection.embedDisplayMode || 'iframe'}
                                onChange={(e) =>
                                  setEditingSection({
                                    ...editingSection,
                                    embedDisplayMode: e.target.value as any,
                                  })
                                }
                              >
                                <option value="iframe">Hiển thị nội dung nhúng</option>
                                <option value="link">Chỉ hiển thị link</option>
                                <option value="both">Khung nhúng + link</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-neutral-800 mb-1">
                                Chiều cao (px)
                              </label>
                              <input
                                type="number"
                                min="200"
                                max="2000"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                                value={editingSection.embedHeight ?? 600}
                                onChange={(e) =>
                                  setEditingSection({
                                    ...editingSection,
                                    embedHeight: Number(e.target.value) || 600,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-neutral-800 mb-1">
                                Tên link
                              </label>
                              <input
                                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                                value={editingSection.embedLinkText || ''}
                                onChange={(e) =>
                                  setEditingSection({
                                    ...editingSection,
                                    embedLinkText: e.target.value,
                                  })
                                }
                                placeholder="Mở trang trong tab mới"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-neutral-800 mb-1">
                              URL tải xuống
                            </label>
                            <input
                              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                              value={editingSection.downloadUrl || ''}
                              onChange={(e) =>
                                setEditingSection({
                                  ...editingSection,
                                  downloadUrl: e.target.value,
                                })
                              }
                              placeholder="https://example.com/tai-lieu.pdf"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-800 mb-1">
                              Tên file
                            </label>
                            <input
                              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                              value={editingSection.downloadFileName || ''}
                              onChange={(e) =>
                                setEditingSection({
                                  ...editingSection,
                                  downloadFileName: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-800 mb-1">
                              Nội dung nút
                            </label>
                            <input
                              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs"
                              value={editingSection.downloadButtonText || 'Tải xuống'}
                              onChange={(e) =>
                                setEditingSection({
                                  ...editingSection,
                                  downloadButtonText: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Huy Hiệu Nhấn Mạnh (Badge)
                    </label>
                    <input
                      type="text"
                      placeholder="vd: Sản Phẩm Tiêu Biểu"
                      value={editingSection.badge || ''}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, badge: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-[#0054a6]"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'blog' && editingSection.type === 'blogPost' && <BlogPostEditor section={editingSection} config={config} onChange={setEditingSection}/>}
              {modalTab === 'motion' && !contentOnly && <div className="space-y-4 rounded-xl border bg-neutral-50 p-4">
                <label className="block text-xs font-bold">Áp dụng motion cho khối này<select className="mt-1 w-full rounded-lg border p-2" value={editingSection.motion?.mode||'inherit'} onChange={e=>setEditingSection({...editingSection,motion:{...editingSection.motion,mode:e.target.value as any}})}><option value="inherit">Theo cài đặt toàn trang</option><option value="off">Tắt riêng khối này</option><option value="custom">Tùy chỉnh riêng khối này</option></select></label>
                {editingSection.motion?.mode==='custom'&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs">Hiệu ứng<select className="mt-1 w-full rounded-lg border p-2" value={editingSection.motion?.effect||'fade'} onChange={e=>setEditingSection({...editingSection,motion:{...editingSection.motion,effect:e.target.value as any}})}><option value="fade">Hiện dần</option><option value="slide-up">Trượt lên</option><option value="slide-left">Trượt từ trái</option><option value="slide-right">Trượt từ phải</option><option value="zoom">Phóng nhẹ</option><option value="soft-rise">Hiện dần mềm · trượt lên</option></select></label>
                  {([['durationMs','Thời lượng (ms)',200,3000],['delayMs','Độ trễ (ms)',0,2000],['distancePx','Quãng trượt (px)',0,160]] as const).map(([field,label,min,max])=><label key={field} className="text-xs">{label}<input type="number" min={min} max={max} className="mt-1 w-full rounded-lg border p-2" value={editingSection.motion?.[field]??(field==='durationMs'?700:field==='distancePx'?32:0)} onChange={e=>setEditingSection({...editingSection,motion:{...editingSection.motion,[field]:Math.min(max,Math.max(min,Number(e.target.value)))}})}/></label>)}
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editingSection.motion?.once!==false} onChange={e=>setEditingSection({...editingSection,motion:{...editingSection.motion,once:e.target.checked}})}/> Chỉ chạy một lần</label>
                </div>}
              </div>}

              {/* TAB 2: DESIGN & RESPONSIVE */}
              {modalTab === 'design' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4"><label className="block text-xs font-bold mb-2">Phong cách khối nội dung</label><select className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs" value={editingSection.design?.styleVariant||'current'} onChange={e=>setEditingSection(e.target.value.startsWith('editorial-')?heritageSection(editingSection,e.target.value as 'editorial-light'|'editorial-dark'|'editorial-warm'|'editorial-split'):{...editingSection,design:{...editingSection.design,styleVariant:e.target.value as 'current'|'minimal-finance'}})}><option value="current">Theo thiết kế hiện tại</option><option value="minimal-finance">Tối giản — chữ gọn, card thanh mảnh</option><option value="editorial-light">Biên tập sáng — kem & serif</option><option value="editorial-dark">Biên tập tối — than chì & champagne</option><option value="editorial-warm">Di sản ấm — nâu đen</option><option value="editorial-split">Biên tập hai cột — 40/60</option></select><p className="mt-2 text-[11px] text-neutral-500">Chỉ áp dụng cho khối này. Chọn phong cách biên tập sẽ điền các ô màu, font, khoảng cách và bố cục hiện có để bạn tiếp tục chỉnh.</p></div>
                  {editingSection.type !== 'blogPost' && <QuickSectionStyleEditor section={editingSection} onChange={setEditingSection} />}
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
                    <div><h4 className="text-xs font-black text-blue-800">Advanced Design Settings</h4><p className="text-[11px] text-neutral-500">Các giá trị được kiểm soát bằng field; không cho nhập CSS thủ công.</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div><label className="block text-[11px] font-bold mb-1">Loại nền</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.backgroundType || ''} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundType:(e.target.value||undefined) as NonNullable<LandingPageSection['design']>['backgroundType'],backgroundImage:editingSection.design?.backgroundImage || editingSection.bgImageUrl}})}><option value="">Giữ nền hiện tại</option><option value="solid">Màu đơn sắc</option><option value="gradient">Gradient</option><option value="image">Hình ảnh</option><option value="video">Video</option><option value="transparent">Trong suốt</option></select></div>
                      <div><label className="block text-[11px] font-bold mb-1">Accent Color</label><input type="color" value={editingSection.design?.accentColor || '#0054a6'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,accentColor:e.target.value}})} /></div>
                    </div>
                    {editingSection.design?.backgroundType === 'gradient' && <div className="grid grid-cols-2 sm:grid-cols-5 gap-3"><div><label className="block text-[11px] font-bold">Type</label><select className="w-full px-2 py-2 border rounded-lg text-xs" value={editingSection.design.gradient?.type || 'linear'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,gradient:{...editingSection.design?.gradient,type:e.target.value as any}}})}><option>linear</option><option>radial</option></select></div><div><label className="block text-[11px] font-bold">Color 1</label><input type="color" value={editingSection.design.gradient?.color1 || '#003870'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,gradient:{...editingSection.design?.gradient,color1:e.target.value}}})}/></div><div><label className="block text-[11px] font-bold">Color 2</label><input type="color" value={editingSection.design.gradient?.color2 || '#0054a6'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,gradient:{...editingSection.design?.gradient,color2:e.target.value}}})}/></div><div><label className="block text-[11px] font-bold">Direction</label><select className="w-full px-2 py-2 border rounded-lg text-xs" value={editingSection.design.gradient?.direction || 'left-right'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,gradient:{...editingSection.design?.gradient,direction:e.target.value as any}}})}>{['left-right','right-left','top-bottom','bottom-top','custom'].map(v=><option key={v}>{v}</option>)}</select></div><div><label className="block text-[11px] font-bold">Angle</label><input type="number" min="0" max="360" className="w-full px-2 py-2 border rounded-lg text-xs" value={editingSection.design.gradient?.angle ?? 90} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,gradient:{...editingSection.design?.gradient,angle:+e.target.value}}})}/></div></div>}
                    {editingSection.design?.backgroundType === 'image' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ImageUrlField label="Ảnh nền máy tính" value={editingSection.design.backgroundImage || editingSection.bgImageUrl || ''} onChange={v=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundImage:v}})} /><ImageUrlField label="Ảnh nền điện thoại" value={editingSection.design.mobileBackgroundImage || ''} onChange={v=>setEditingSection({...editingSection,design:{...editingSection.design,mobileBackgroundImage:v}})} /></div>}
                    {editingSection.design?.backgroundType === 'video' && <div className="space-y-2"><label className="block text-[11px] font-bold">Background Video</label><div className="flex gap-2"><input className="flex-1 px-3 py-2 border rounded-xl text-xs" value={editingSection.design.backgroundVideo || ''} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundVideo:e.target.value}})} placeholder="URL MP4/WebM hoặc upload"/><label className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer whitespace-nowrap">Upload video<input type="file" accept="video/mp4,video/webm,video/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundVideo:String(r.result||'')}});r.readAsDataURL(f);e.currentTarget.value='';}}/></label>{editingSection.design.backgroundVideo&&<button type="button" className="px-3 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold" onClick={()=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundVideo:''}})}>Xóa</button>}</div><p className="text-[10px] text-neutral-500">Có thể dán URL hoặc tải video riêng. Không có video mẫu mặc định.</p></div>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Bố Cục Cột (Layout)
                      </label>
                      <select
                        value={editingSection.layout || 'grid-3'}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            layout: e.target.value as SectionLayout,
                          })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-[#0054a6]"
                      >
                        <option value="1-col">1 Cột (Căn giữa đơn lẻ)</option>
                        <option value="grid-2">2 Cột (Grid 2)</option>
                        <option value="grid-3">3 Cột (Grid 3 - Tiêu chuẩn)</option>
                        <option value="grid-4">4 Cột (Grid 4 - Thư viện ảnh / Chỉ số)</option>
                        <option value="zigzag">Ziczac (Ảnh xen kẽ chữ)</option>
                        <option value="editorial-split">Editorial Split (Nội dung + media cao cấp)</option>
                        <option value="sticky-story">Sticky Story (Cột ghim + nội dung cuộn)</option>
                        <option value="cinematic-feature">Cinematic Feature (Thẻ ngang cuộn)</option>
                        <option value="architecture-grid">Architecture Grid (4 khối cấu trúc)</option>
                        <option value="advisory-stack">Advisory Stack (Danh sách tư vấn dọc)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-800 mb-1">
                        Khoảng Cách Trên/Dưới (Padding)
                      </label>
                      <select
                        value={editingSection.paddingY || 'normal'}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            paddingY: e.target.value as SectionPaddingY,
                          })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-[#0054a6]"
                      >
                        <option value="compact">Gọn gàng (Ít khoảng trống)</option>
                        <option value="normal">Tiêu chuẩn (Vừa vặn)</option>
                        <option value="spacious">Rộng rãi (Nổi bật, thông thoáng)</option>
                      </select>
                    </div>
                  </div>

                  {/* SIDE LEAD FORM */}
                  <div className="p-4 bg-violet-50/50 rounded-2xl border border-violet-100 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-violet-800">Form đăng ký cạnh khối</h4>
                      <p className="text-[11px] text-neutral-500">Cho phép khách hàng vừa xem nội dung khối vừa nhập thông tin vào form bên cạnh.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer">
                      <input type="checkbox" checked={!!editingSection.showLeadForm} onChange={(e) => setEditingSection({ ...editingSection, showLeadForm: e.target.checked })} className="rounded text-[#0054a6]" />
                      Hiển thị Form Tư Vấn bên cạnh khối này
                    </label>
                    {editingSection.showLeadForm && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select value={editingSection.leadFormPosition || 'right'} onChange={(e) => setEditingSection({ ...editingSection, leadFormPosition: e.target.value as 'left' | 'right' })} className="px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white">
                          <option value="right">Form bên phải – Nội dung bên trái</option>
                          <option value="left">Form bên trái – Nội dung bên phải</option>
                        </select>
                        <select value={editingSection.leadFormWidth || 'normal'} onChange={(e) => setEditingSection({ ...editingSection, leadFormWidth: e.target.value as 'narrow' | 'normal' })} className="px-3 py-2 border border-neutral-300 rounded-xl text-xs font-semibold bg-white">
                          <option value="normal">Form cân đối</option>
                          <option value="narrow">Form gọn</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* VISIBILITY TOGGLES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <input
                        type="checkbox"
                        checked={!!editingSection.hideOnMobile}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            hideOnMobile: e.target.checked,
                          })
                        }
                        className="rounded text-[#0054a6] focus:ring-[#0054a6]"
                      />
                      <span>Ẩn khối này trên điện thoại di động (Mobile)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <input
                        type="checkbox"
                        checked={!!editingSection.hideOnDesktop}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            hideOnDesktop: e.target.checked,
                          })
                        }
                        className="rounded text-[#0054a6] focus:ring-[#0054a6]"
                      />
                      <span>Ẩn khối này trên máy tính (Desktop)</span>
                    </label>
                  </div>
                </div>
              )}

              {modalTab === 'layout' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold mb-1">Width</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.widthMode || 'boxed'} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,widthMode:e.target.value as any}})}><option value="boxed">Boxed Content</option><option value="full">Full Width</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Container Width px</label><input type="number" min="720" max="1920" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.layoutSettings?.containerWidth || 1280} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,containerWidth:+e.target.value}})} /></div>
                    <div><label className="block text-xs font-bold mb-1">Columns</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.columns || 3} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,columns:+e.target.value as any}})}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} Column</option>)}</select></div>
                    <div><label className="block text-xs font-bold mb-1">Column Ratio</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.ratio || 'equal'} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,ratio:e.target.value as any}})}>{['equal','50-50','40-60','60-40','33-67','67-33','25-75','75-25'].map(v=><option key={v}>{v}</option>)}</select></div>
                    <div><label className="block text-xs font-bold mb-1">Image Position</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.mediaPosition || editingSection.imagePosition || 'right'} onChange={e=>setEditingSection({...editingSection,imagePosition:e.target.value==='left'?'left':e.target.value==='right'?'right':'center',layoutSettings:{...editingSection.layoutSettings,mediaPosition:e.target.value as any}})}><option value="left">Image Left / Content Right</option><option value="right">Content Left / Image Right</option><option value="top">Image Top</option><option value="bottom">Image Bottom</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Content Align</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.contentAlign || editingSection.textAlign || 'left'} onChange={e=>setEditingSection({...editingSection,textAlign:e.target.value as any,layoutSettings:{...editingSection.layoutSettings,contentAlign:e.target.value as any}})}><option>left</option><option>center</option><option>right</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Vertical Align</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.verticalAlign || 'center'} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,verticalAlign:e.target.value as any}})}><option>top</option><option>center</option><option>bottom</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Column Gap px</label><input type="number" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.layoutSettings?.columnGap ?? 32} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,columnGap:+e.target.value}})} /></div>
                    <div><label className="block text-xs font-bold mb-1">Row Gap px</label><input type="number" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.layoutSettings?.rowGap ?? 24} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,rowGap:+e.target.value}})} /></div>
                    <div><label className="block text-xs font-bold mb-1">Direction</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.direction||'row'} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,direction:e.target.value as any}})}><option value="row">Row</option><option value="column">Column</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Cards Layout</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.layoutSettings?.cardsLayout||'grid'} onChange={e=>setEditingSection({...editingSection,layoutSettings:{...editingSection.layoutSettings,cardsLayout:e.target.value as any}})}><option value="grid">Cards Grid</option><option value="horizontal">Cards Horizontal</option>{['products','productCards'].includes(editingSection.type)&&<option value="editorial-panel">Danh mục trái · chi tiết phải</option>}</select></div>
                  </div>
                </div>
              )}

              {modalTab === 'action' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold mb-1">Button Text</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.cta?.text ?? editingSection.ctaText ?? ''} onChange={e=>setEditingSection({...editingSection,ctaText:e.target.value,cta:{...editingSection.cta,text:e.target.value}})} /></div>
                    <div><label className="block text-xs font-bold mb-1">Icon</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.cta?.icon || ''} onChange={e=>setEditingSection({...editingSection,cta:{...editingSection.cta,icon:e.target.value}})} placeholder="VD: → / 🚗" /></div>
                    <div><label className="block text-xs font-bold mb-1">Icon Position</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.cta?.iconPosition || 'right'} onChange={e=>setEditingSection({...editingSection,cta:{...editingSection.cta,iconPosition:e.target.value as any}})}><option value="left">Left</option><option value="right">Right</option></select></div>
                  </div>
                  <div className="border border-neutral-200 rounded-2xl p-4"><div className="font-black text-xs uppercase text-neutral-600 mb-3">Action Settings</div><ActionEditor config={config} value={editingSection.cta?.action} onChange={action=>setEditingSection({...editingSection,cta:{...editingSection.cta,action}})} /></div>
                  <div className="border border-neutral-200 rounded-2xl p-4"><div className="font-black text-xs uppercase text-neutral-600 mb-3">Button Design Settings</div><ButtonDesignEditor config={config} value={editingSection.cta?.design} onChange={design=>setEditingSection({...editingSection,cta:{...editingSection.cta,design}})} /></div>
                </div>
              )}

              {modalTab === 'responsive' && (
                <div className="space-y-4">
                  {(['desktop','tablet','mobile'] as const).map(bp=>{
                    const r=editingSection.responsiveSettings?.[bp]||{};
                    const setR=(patch:any)=>setEditingSection({...editingSection,responsiveSettings:{...editingSection.responsiveSettings,[bp]:{...r,...patch}}});
                    return <div key={bp} className="p-4 border rounded-2xl bg-neutral-50 space-y-3">
                      <div className="flex items-center justify-between"><div className="font-black text-xs uppercase text-blue-700">{bp}</div><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={r.visible!==false} onChange={e=>setR({visible:e.target.checked})}/>Show {bp}</label></div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="block text-[11px] font-bold mb-1">Columns</label><select className="w-full px-2 py-2 border rounded-lg text-xs bg-white" value={r.columns|| (bp==='mobile'?1:editingSection.layoutSettings?.columns||3)} onChange={e=>setR({columns:+e.target.value as any})}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></div>
                        <div><label className="block text-[11px] font-bold mb-1">Align</label><select className="w-full px-2 py-2 border rounded-lg text-xs bg-white" value={r.alignment||editingSection.layoutSettings?.contentAlign||'left'} onChange={e=>setR({alignment:e.target.value as any})}><option>left</option><option>center</option><option>right</option></select></div>
                        {(['paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom'] as const).map(k=><div key={k}><label className="block text-[11px] font-bold mb-1">{k} px</label><input type="number" className="w-full px-2 py-2 border rounded-lg text-xs" value={(r as any)[k]??''} onChange={e=>setR({[k]:e.target.value===''?undefined:+e.target.value})}/></div>)}
                        <div><label className="block text-[11px] font-bold mb-1">Image Position</label><select className="w-full px-2 py-2 border rounded-lg text-xs bg-white" value={r.imagePosition||'center'} onChange={e=>setR({imagePosition:e.target.value as any})}>{['left','right','top','bottom','center'].map(v=><option key={v}>{v}</option>)}</select></div>
                        <div><label className="block text-[11px] font-bold mb-1">Image Height px</label><input type="number" className="w-full px-2 py-2 border rounded-lg text-xs" value={r.imageHeight??''} onChange={e=>setR({imageHeight:e.target.value===''?undefined:+e.target.value})}/></div>
                        <div><label className="block text-[11px] font-bold mb-1">Section Height px</label><input type="number" className="w-full px-2 py-2 border rounded-lg text-xs" value={r.sectionHeight??''} onChange={e=>setR({sectionHeight:e.target.value===''?undefined:+e.target.value})}/></div>
                        <div><label className="block text-[11px] font-bold mb-1">Button Width</label><select className="w-full px-2 py-2 border rounded-lg text-xs bg-white" value={r.buttonWidth||'auto'} onChange={e=>setR({buttonWidth:e.target.value as any})}><option value="auto">Auto</option><option value="full">Full Width</option></select></div>
                      </div>
                    </div>
                  })}
                </div>
              )}

              {modalTab === 'advanced' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{(['paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom','minHeight','borderRadius'] as const).map(k=><div key={k}><label className="block text-[11px] font-bold mb-1">{k} px</label><input type="number" min="0" className="w-full px-2 py-2 border rounded-lg text-xs" value={(editingSection.design as any)?.[k] ?? ''} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,[k]:e.target.value===''?undefined:+e.target.value}})} /></div>)}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div><label className="block text-xs font-bold mb-1">Preset</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.presetId||''} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,presetId:e.target.value||undefined}})}><option value="">Custom / Không preset</option>{(config.websiteSettings?.stylePresets||[]).filter(p=>p.target==='section').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <label className="flex items-center gap-2 text-xs font-bold pt-5"><input type="checkbox" checked={editingSection.design?.useGlobal===true} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,useGlobal:e.target.checked}})}/>Use Global Background</label>
                    <div><label className="block text-xs font-bold mb-1">Box Shadow</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.boxShadow||'none'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,boxShadow:e.target.value as any}})}><option>none</option><option>sm</option><option>md</option><option>lg</option><option>xl</option></select></div>
                    <div><label className="block text-xs font-bold mb-1">Image Fit</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.imageFit||'cover'} onChange={e=>setEditingSection({...editingSection,imageFit:e.target.value as any})}><option>cover</option><option>contain</option><option>auto</option></select></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-xs font-bold mb-1">Border Color</label><input type="color" value={editingSection.design?.borderColor||'#e5e7eb'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,borderColor:e.target.value}})}/></div><div><label className="block text-xs font-bold mb-1">Border Width px</label><input type="number" min="0" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.design?.borderWidth??0} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,borderWidth:+e.target.value}})}/></div><div><label className="block text-xs font-bold mb-1">Event Name (Section)</label><input className="w-full px-3 py-2 border rounded-xl text-xs font-mono" value={editingSection.eventName||''} onChange={e=>setEditingSection({...editingSection,eventName:e.target.value})}/></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-xs font-bold mb-1">Background Position</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.backgroundPosition||'center'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundPosition:e.target.value as any}})}>{['left','center','right','top','bottom'].map(v=><option key={v}>{v}</option>)}</select></div><div><label className="block text-xs font-bold mb-1">Background Size</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.backgroundSize||'cover'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundSize:e.target.value as any}})}><option>cover</option><option>contain</option><option>auto</option></select></div><div><label className="block text-xs font-bold mb-1">Background Repeat</label><select className="w-full px-3 py-2 border rounded-xl text-xs bg-white" value={editingSection.design?.backgroundRepeat||'no-repeat'} onChange={e=>setEditingSection({...editingSection,design:{...editingSection.design,backgroundRepeat:e.target.value as any}})}><option>no-repeat</option><option>repeat</option><option>repeat-x</option><option>repeat-y</option></select></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ImageUrlField label="Desktop/Main Image" value={editingSection.imageUrl} onChange={v=>setEditingSection({...editingSection,imageUrl:v})}/><ImageUrlField label="Mobile Image" value={editingSection.mobileImageUrl} onChange={v=>setEditingSection({...editingSection,mobileImageUrl:v})}/></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="block text-xs font-bold mb-1">Alt Text</label><input className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.imageAlt||''} onChange={e=>setEditingSection({...editingSection,imageAlt:e.target.value})}/></div><div><label className="block text-xs font-bold mb-1">Focal X %</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.imageFocalPointX??50} onChange={e=>setEditingSection({...editingSection,imageFocalPointX:+e.target.value})}/></div><div><label className="block text-xs font-bold mb-1">Focal Y %</label><input type="number" min="0" max="100" className="w-full px-3 py-2 border rounded-xl text-xs" value={editingSection.imageFocalPointY??50} onChange={e=>setEditingSection({...editingSection,imageFocalPointY:+e.target.value})}/></div></div>
                  <div className="rounded-2xl border p-4 space-y-3">
                    <h4 className="text-xs font-bold">Kích thước chữ theo thiết bị</h4>
                    <p className="text-[11px] text-neutral-500">Font, màu, độ đậm và cỡ chữ desktop được chỉnh ở tab Thiết Kế Khối.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['heading','body'] as const).map(kind => {
                      const style = editingSection.typographySettings?.[kind] || {};
                      const setSize = (key:'tabletSize'|'mobileSize'|'letterSpacing', value:string) => {
                        const breakpoint = key === 'tabletSize' ? 'tablet' : 'mobile';
                        const sizeKey = kind === 'heading' ? 'headingSize' : 'fontSize';
                        setEditingSection({...editingSection, typographySettings:{...editingSection.typographySettings,useGlobal:false,[kind]:{...style,[key]:value === '' ? undefined : +value}},
                          ...(key !== 'letterSpacing' ? {responsiveSettings:{...editingSection.responsiveSettings,[breakpoint]:{...editingSection.responsiveSettings?.[breakpoint],[sizeKey]:value === '' ? undefined : +value}}} : {})});
                      };
                      return <div key={kind} className="rounded-xl bg-neutral-50 p-3 space-y-2"><b className="text-xs">{kind === 'heading' ? 'Tiêu đề' : 'Nội dung'}</b><div className="grid grid-cols-3 gap-2">{(['tabletSize','mobileSize','letterSpacing'] as const).map(key=><label key={key} className="text-[11px]">{key}<input type="number" className="w-full rounded-lg border px-2 py-1.5 text-xs" value={key === 'letterSpacing' ? (style[key] ?? '') : (editingSection.responsiveSettings?.[key === 'tabletSize' ? 'tablet' : 'mobile']?.[kind === 'heading' ? 'headingSize' : 'fontSize'] ?? style[key] ?? '')} onChange={e=>setSize(key,e.target.value)} placeholder="Theo trang" /></label>)}</div></div>;
                    })}</div>
                  </div>
                </div>
              )}

              {/* TAB: MULTI-IMAGE MANAGEMENT */}
              {modalTab === 'images' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800">
                        Danh Sách Hình Ảnh Của Khối
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Admin có thể thêm nhiều hình ảnh (URL hoặc tải từ máy tính), đặt tiêu đề chú thích cho từng ảnh.
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0054a6] hover:bg-[#004182] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải Ảnh Mới Từ Máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageFileUpload(file, (base64) => {
                              const newImg: SectionImage = {
                                url: base64,
                                caption: file.name.replace(/\.[^/.]+$/, ''),
                                alt: file.name,
                              };
                              setEditingSection({
                                ...editingSection,
                                images: [...(editingSection.images || []), newImg],
                              });
                              showToast('Đã thêm ảnh vào khối!');
                            });
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Add Image via URL or Preset */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="input-add-image-url"
                      placeholder="Dán đường dẫn ảnh URL (https://...)"
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0054a6]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('input-add-image-url') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const newImg: SectionImage = {
                            url: input.value.trim(),
                            caption: 'Hình ảnh bổ sung',
                          };
                          setEditingSection({
                            ...editingSection,
                            images: [...(editingSection.images || []), newImg],
                          });
                          input.value = '';
                          showToast('Đã thêm ảnh vào danh sách!');
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 cursor-pointer"
                    >
                      + Thêm URL
                    </button>
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {(editingSection.images || []).map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex gap-3 items-center group relative"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || 'Preview'}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 object-cover rounded-lg border border-neutral-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            placeholder="Chú thích ảnh..."
                            value={img.caption || ''}
                            onChange={(e) => {
                              const nextImages = [...(editingSection.images || [])];
                              nextImages[imgIdx].caption = e.target.value;
                              setEditingSection({ ...editingSection, images: nextImages });
                            }}
                            className="w-full text-xs font-bold text-neutral-900 bg-white border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-[#0054a6]"
                          />
                          <input
                            type="text"
                            placeholder="Thẻ Alt SEO..."
                            value={img.alt || ''}
                            onChange={(e) => {
                              const nextImages = [...(editingSection.images || [])];
                              nextImages[imgIdx].alt = e.target.value;
                              setEditingSection({ ...editingSection, images: nextImages });
                            }}
                            className="w-full text-[11px] text-neutral-500 bg-white border border-neutral-200 rounded px-2 py-0.5 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextImages = (editingSection.images || []).filter(
                              (_, i) => i !== imgIdx
                            );
                            setEditingSection({ ...editingSection, images: nextImages });
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
                          title="Xóa ảnh này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 1-Click Preset Suggestions */}
                  <div className="hidden pt-2 border-t border-neutral-100">
                    <span className="text-[11px] font-bold text-neutral-600 block mb-2">
                      Gợi ý chèn nhanh ảnh đối tác/bệnh viện mẫu:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {BAOVIET_IMAGE_PRESETS.map((p, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => {
                            const newImg: SectionImage = {
                              url: p.url,
                              caption: p.name,
                              alt: p.name,
                            };
                            setEditingSection({
                              ...editingSection,
                              images: [...(editingSection.images || []), newImg],
                            });
                            showToast(`Đã thêm ảnh: ${p.name}`);
                          }}
                          className="text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-[#0054a6] px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                        >
                          + {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ITEMS / PACKAGES / CARDS */}
              {modalTab === 'items' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800">
                        Danh Sách Thẻ Nội Dung / Gói Bảo Hiểm / Đánh Giá ({(editingSection.items || []).length})
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        {editingSection.type==='logoMarquee' ? 'Mỗi mục là 1 đối tác/logo; tải logo tại Desktop / Main Image.' : editingSection.type==='dualProduct' ? 'Tối đa 2 sản phẩm; mỗi sản phẩm có tối đa 4 đặc điểm và CTA riêng.' : 'Mỗi thẻ có thể có giá, tag nổi bật, ảnh đại diện và các gạch đầu dòng quyền lợi.'}
                      </p>
                    </div>

                    {!contentOnly && (
                    <button
                      type="button"
                      disabled={editingSection.type==='dualProduct' && (editingSection.items||[]).length>=2}
                      onClick={() => {
                        const current = editingSection.items || [];
                        if(editingSection.type==='dualProduct' && current.length>=2) return;
                        const newItem: SectionItem = {
                          id: `item_${Date.now()}`,
                          title: `Mục mới ${current.length + 1}`,
                          description: 'Mô tả quyền lợi chi tiết cho mục này...',
                          price: 'Chỉ từ 500.000đ/năm',
                          tag: 'Mới',
                          features: ['Quyền lợi chi trả viện phí nhanh', 'Hỗ trợ 24/7'],
                          order: current.length + 1,
                          enabled: true,
                        };
                        setEditingSection({
                          ...editingSection,
                          items: [...current, newItem],
                        });
                      }}
                      className="text-xs font-bold text-[#0054a6] bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      {editingSection.type==='dualProduct' && (editingSection.items||[]).length>=2 ? 'Đủ 2 sản phẩm' : '+ Thêm Thẻ Mới'}
                    </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {(editingSection.items || []).map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3.5 border rounded-xl space-y-2 ${item.deletedAt ? 'bg-red-50 border-red-200 opacity-70' : item.enabled === false ? 'bg-amber-50 border-amber-200 opacity-80' : 'bg-neutral-50 border-neutral-200'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Tiêu đề thẻ/sản phẩm"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...(editingSection.items || [])];
                              next[idx].title = e.target.value;
                              setEditingSection({ ...editingSection, items: next });
                            }}
                            className="font-bold text-xs text-neutral-900 bg-white border border-neutral-300 rounded px-2.5 py-1 flex-1 focus:outline-none focus:border-[#0054a6]"
                          />
                          <input
                            type="text"
                            placeholder="Giá / Phí (vd: Từ 1.2M/năm)"
                            value={item.price || ''}
                            onChange={(e) => {
                              const next = [...(editingSection.items || [])];
                              next[idx].price = e.target.value;
                              setEditingSection({ ...editingSection, items: next });
                            }}
                            className="text-xs text-[#0054a6] font-bold bg-white border border-neutral-300 rounded px-2 py-1 w-36 focus:outline-none"
                          />
                          {!contentOnly && (<>
                          <button type="button" disabled={idx===0} onClick={() => { const next=[...(editingSection.items||[])]; if(idx<=0)return; [next[idx-1],next[idx]]=[next[idx],next[idx-1]]; setEditingSection({...editingSection,items:next.map((x,i)=>({...x,order:i+1}))}); }} className="text-neutral-500 hover:bg-white p-1.5 rounded-lg disabled:opacity-25" title="Move Card Up"><ArrowUp className="w-4 h-4"/></button>
                          <button type="button" disabled={idx===(editingSection.items||[]).length-1} onClick={() => { const next=[...(editingSection.items||[])]; if(idx>=next.length-1)return; [next[idx+1],next[idx]]=[next[idx],next[idx+1]]; setEditingSection({...editingSection,items:next.map((x,i)=>({...x,order:i+1}))}); }} className="text-neutral-500 hover:bg-white p-1.5 rounded-lg disabled:opacity-25" title="Move Card Down"><ArrowDown className="w-4 h-4"/></button>
                          <button type="button" onClick={() => { const next=[...(editingSection.items||[])]; const copy={...JSON.parse(JSON.stringify(item)),id:`item_${Date.now()}`,title:`${item.title} (Bản sao)`,deletedAt:undefined,enabled:true}; next.splice(idx+1,0,copy); setEditingSection({...editingSection,items:next.map((x,i)=>({...x,order:i+1}))}); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg" title="Duplicate Card"><Copy className="w-4 h-4"/></button>
                          <button type="button" onClick={() => { const next=[...(editingSection.items||[])]; next[idx]={...next[idx],enabled:item.enabled===false}; setEditingSection({...editingSection,items:next}); }} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg" title="Active/Inactive">{item.enabled===false?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                          <button type="button" onClick={() => { const next=[...(editingSection.items||[])]; next[idx]={...next[idx],deletedAt:item.deletedAt?undefined:new Date().toISOString(),enabled:item.deletedAt?true:false}; setEditingSection({...editingSection,items:next}); }} className={`${item.deletedAt?'text-emerald-600':'text-red-500'} hover:bg-white p-1.5 rounded-lg cursor-pointer`} title={item.deletedAt?'Restore card':'Soft delete card'}>{item.deletedAt?<CheckCircle2 className="w-4 h-4"/>:<Trash2 className="w-4 h-4"/>}</button>
                          {item.deletedAt && <button type="button" onClick={() => { const next=(editingSection.items||[]).filter((_,i)=>i!==idx); setEditingSection({...editingSection,items:next}); }} className="text-red-700 bg-red-100 hover:bg-red-200 p-1.5 rounded-lg cursor-pointer" title="Permanent delete card"><X className="w-4 h-4"/></button>}
                          </>)}
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Mô tả nội dung chi tiết..."
                          value={item.description}
                          onChange={(e) => {
                            const next = [...(editingSection.items || [])];
                            next[idx].description = e.target.value;
                            setEditingSection({ ...editingSection, items: next });
                          }}
                          className="w-full text-xs text-neutral-700 bg-white border border-neutral-200 rounded p-2 focus:outline-none focus:border-[#0054a6]"
                        />

                        {/* Typography riêng cho từng nội dung/card - không tác động Global Font */}
                        <div className="p-3 bg-violet-50/60 border border-violet-100 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-black uppercase text-violet-800">Font riêng cho nội dung này</div>
                              <div className="text-[10px] text-violet-700/80 mt-0.5">Chỉ áp dụng cho Card/Nội dung đang chỉnh sửa, không đổi font toàn trang.</div>
                            </div>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-violet-800 cursor-pointer whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={item.typography?.useGlobal === false}
                                onChange={(e) => {
                                  const next = [...(editingSection.items || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    typography: {
                                      ...(next[idx].typography || {}),
                                      useGlobal: e.target.checked ? false : true,
                                    },
                                  };
                                  setEditingSection({ ...editingSection, items: next });
                                }}
                                className="w-3.5 h-3.5"
                              />
                              Bật font riêng
                            </label>
                          </div>
                          {item.typography?.useGlobal === false && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {(['title', 'body'] as const).map((kind) => {
                                const t = item.typography?.[kind] || {};
                                const patchTypography = (patch: any) => {
                                  const next = [...(editingSection.items || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    typography: {
                                      ...(next[idx].typography || {}),
                                      useGlobal: false,
                                      [kind]: { ...t, ...patch },
                                    },
                                  };
                                  setEditingSection({ ...editingSection, items: next });
                                };
                                const titleMode = kind === 'title';
                                return (
                                  <div key={kind} className="bg-white border border-violet-100 rounded-lg p-3 space-y-2">
                                    <div className="text-[10px] font-black uppercase text-neutral-700">
                                      {titleMode ? 'Font tiêu đề nội dung' : 'Font mô tả nội dung'}
                                    </div>
                                    <FontSelector
                                      value={t.fontFamily || ''}
                                      onChange={(font) => patchTypography({ fontFamily: font })}
                                      label={titleMode ? 'Font tiêu đề' : 'Font nội dung'}
                                      previewText={titleMode ? item.title || 'Tiêu đề mẫu' : item.description || 'Nội dung mẫu'}
                                    />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <div>
                                        <label className="text-[9px] font-bold block mb-1">Size Desktop</label>
                                        <input type="number" min="8" max="96" className="w-full px-2 py-1.5 border rounded-lg text-[11px]" value={t.fontSize ?? ''} onChange={(e) => patchTypography({ fontSize: e.target.value === '' ? undefined : +e.target.value })} />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold block mb-1">Size Mobile</label>
                                        <input type="number" min="8" max="72" className="w-full px-2 py-1.5 border rounded-lg text-[11px]" value={t.mobileSize ?? ''} onChange={(e) => patchTypography({ mobileSize: e.target.value === '' ? undefined : +e.target.value })} />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold block mb-1">Weight</label>
                                        <select className="w-full px-2 py-1.5 border rounded-lg text-[11px] bg-white" value={t.fontWeight || (titleMode ? 700 : 400)} onChange={(e) => patchTypography({ fontWeight: +e.target.value })}>
                                          {[300,400,500,600,700,800,900].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold block mb-1">Màu chữ</label>
                                        <input type="text" className="w-full px-2 py-1.5 border rounded-lg text-[11px]" placeholder="#222222" value={t.color || ''} onChange={(e) => patchTypography({ color: e.target.value })} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Editable check-list / bullet benefits */}
                        <div className="p-2.5 bg-white rounded-lg border border-neutral-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-700">Dấu tích / Quyền lợi</span>
                            <button
                              type="button"
                              disabled={editingSection.type==='dualProduct' && (item.features||[]).length>=4}
                              onClick={() => {
                                if(editingSection.type==='dualProduct' && (item.features||[]).length>=4) return;
                                const next = [...(editingSection.items || [])];
                                next[idx] = { ...next[idx], features: [...(next[idx].features || []), 'Quyền lợi mới'] };
                                setEditingSection({ ...editingSection, items: next });
                              }}
                              className="text-[10px] font-bold text-emerald-700 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >+ Thêm dòng
                            </button>
                          </div>
                          {(editingSection.type==='dualProduct' ? (item.features || []).slice(0,4) : (item.features || [])).map((feature, fi) => (
                            <div key={fi} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const next = [...(editingSection.items || [])];
                                  const features = [...(next[idx].features || [])];
                                  features[fi] = e.target.value;
                                  next[idx] = { ...next[idx], features };
                                  setEditingSection({ ...editingSection, items: next });
                                }}
                                className="flex-1 px-2 py-1.5 border border-neutral-200 rounded-lg text-[11px] focus:outline-none focus:border-[#0054a6]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(editingSection.items || [])];
                                  next[idx] = { ...next[idx], features: (next[idx].features || []).filter((_, i) => i !== fi) };
                                  setEditingSection({ ...editingSection, items: next });
                                }}
                                className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Product/Card image management */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-neutral-200">
                          <ImageUrlField
                            label="Desktop / Main Image"
                            value={item.avatar}
                            onChange={(value) => {
                              const next = [...(editingSection.items || [])];
                              next[idx] = { ...next[idx], avatar: value };
                              setEditingSection({ ...editingSection, items: next });
                            }}
                          />
                          <ImageUrlField
                            label="Mobile Image"
                            value={item.mobileImage}
                            onChange={(value) => {
                              const next = [...(editingSection.items || [])];
                              next[idx] = { ...next[idx], mobileImage: value };
                              setEditingSection({ ...editingSection, items: next });
                            }}
                          />
                          <div><label className="text-[10px] font-bold block mb-1">Image Alt Text</label><input className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.imageAlt || ''} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],imageAlt:e.target.value};setEditingSection({...editingSection,items:next})}} placeholder="Mô tả ảnh cho SEO / Accessibility"/></div>
                          <div><label className="text-[10px] font-bold block mb-1">Card Link / Legacy CTA Link</label><input className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.ctaLink || ''} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],ctaLink:e.target.value};setEditingSection({...editingSection,items:next})}} placeholder="#section hoặc https://..."/></div>
                        </div>

                        {!contentOnly && (
                          <div className="space-y-3">
                            <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase text-neutral-700">Product Card Design</span><label className="flex items-center gap-2 text-[10px] font-bold"><input type="checkbox" checked={item.style?.useGlobal!==false} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,useGlobal:e.target.checked}};setEditingSection({...editingSection,items:next})}}/>Use Global</label></div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div><label className="text-[10px] font-bold block mb-1">Style Preset</label><select className="w-full px-2 py-1.5 border rounded text-[11px] bg-white" value={item.style?.presetId||''} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,presetId:e.target.value||undefined}};setEditingSection({...editingSection,items:next})}}><option value="">Không preset</option>{(config.websiteSettings?.stylePresets||[]).filter(p=>p.target==='card').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold block mb-1">Shadow</label><select className="w-full px-2 py-1.5 border rounded text-[11px] bg-white" value={item.style?.shadow||'sm'} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,shadow:e.target.value as any}};setEditingSection({...editingSection,items:next})}}><option>none</option><option>sm</option><option>md</option><option>lg</option></select></div>
                                <div><label className="text-[10px] font-bold block mb-1">Hover Effect</label><select className="w-full px-2 py-1.5 border rounded text-[11px] bg-white" value={item.style?.hoverEffect||'lift'} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,hoverEffect:e.target.value as any}};setEditingSection({...editingSection,items:next})}}><option>none</option><option>lift</option><option>scale</option><option>glow</option><option value="tilt-3d">Tilt 3D nhẹ (đọc được nội dung)</option></select></div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {[
                                  ['Background','background','#ffffff'],['Text','textColor','#111827'],['Border','borderColor','#e5e7eb'],['Hover BG','hoverBackground','#f8fafc'],['Hover Text','hoverTextColor','#111827']
                                ].map(([label,key,fallback])=><div key={key}><label className="text-[10px] font-bold block mb-1">{label}</label><input type="color" value={(item.style as any)?.[key] || fallback} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,[key]:e.target.value}};setEditingSection({...editingSection,items:next})}} className="w-full h-8 border rounded"/></div>)}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div><label className="text-[10px] font-bold block mb-1">Radius px</label><input type="number" min="0" max="50" className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.style?.borderRadius ?? 16} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,borderRadius:+e.target.value}};setEditingSection({...editingSection,items:next})}}/></div>
                                <div><label className="text-[10px] font-bold block mb-1">Padding px</label><input type="number" min="0" max="80" className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.style?.padding ?? 0} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],style:{...next[idx].style,padding:+e.target.value}};setEditingSection({...editingSection,items:next})}}/></div>
                                <div className="text-[10px] text-neutral-500 flex items-end pb-1">Style chỉ ảnh hưởng giao diện, không thay nội dung Card.</div>
                              </div>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                              <div className="text-[11px] font-black uppercase text-blue-800">Card CTA</div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div><label className="text-[10px] font-bold block mb-1">Button Text</label><input className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.cta?.text || item.ctaText || ''} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],ctaText:e.target.value,cta:{...next[idx].cta,text:e.target.value}};setEditingSection({...editingSection,items:next})}}/></div>
                                <div><label className="text-[10px] font-bold block mb-1">Icon</label><input className="w-full px-2 py-1.5 border rounded text-[11px]" value={item.cta?.icon || ''} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],cta:{...next[idx].cta,icon:e.target.value}};setEditingSection({...editingSection,items:next})}} placeholder="ArrowRight"/></div>
                                <div><label className="text-[10px] font-bold block mb-1">Icon Position</label><select className="w-full px-2 py-1.5 border rounded text-[11px] bg-white" value={item.cta?.iconPosition||'right'} onChange={e=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],cta:{...next[idx].cta,iconPosition:e.target.value as any}};setEditingSection({...editingSection,items:next})}}><option value="left">Left</option><option value="right">Right</option></select></div>
                              </div>
                              <ActionEditor config={config} value={item.cta?.action} onChange={action=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],cta:{...next[idx].cta,action}};setEditingSection({...editingSection,items:next})}}/>
                              <ButtonDesignEditor config={config} value={item.cta?.design} onChange={design=>{const next=[...(editingSection.items||[])];next[idx]={...next[idx],cta:{...next[idx].cta,design}};setEditingSection({...editingSection,items:next})}}/>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                {!contentOnly && !isNewSection ? (
                  <button
                    type="button"
                    onClick={() => {
                      const secRef = editingSection;
                      setShowSectionModal(false);
                      setSectionToDelete(secRef);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Khối Này</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSectionModal(false)}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0054a6] hover:bg-[#004182] text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu Toàn Bộ Khối Nội Dung
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sectionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 max-h-[calc(100vh-2rem)] overflow-y-auto cms-admin-modal-scroll">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-neutral-900 text-center mb-2">
              Xác Nhận Xóa Khối Nội Dung?
            </h4>

            <p className="text-xs text-neutral-600 text-center leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa khối <strong className="text-neutral-900 font-bold">"{sectionToDelete.title}"</strong> (loại: <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{sectionToDelete.type}</span>)? Khối này sẽ bị gỡ hoàn toàn khỏi giao diện Landing Page của khách hàng.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSection}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xác Nhận Xóa Khối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE LANDING PAGE PREVIEW */}
      {showLivePreview && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex flex-col">
          <div className="h-14 shrink-0 bg-neutral-950 text-white flex items-center justify-between px-4 sm:px-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold">Xem trước Landing Page – dữ liệu hiện tại trong CMS</span>
            </div>
            <button type="button" onClick={() => setShowLivePreview(false)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer">
              <X className="w-4 h-4" /> Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <LandingPage config={config} isPreview />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
