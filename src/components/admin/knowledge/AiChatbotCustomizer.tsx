import React, { useState } from 'react';
import {
  Palette,
  Bot,
  Shield,
  Sparkles,
  Headphones,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Move,
  Layout,
  MessageSquare,
  Mic,
  Volume2,
  Globe,
  Phone,
  Plus,
  Trash2,
  Sliders,
  Eye,
  Send,
  X,
  Type,
} from 'lucide-react';
import { AiChatbotConfig } from '../../../types';
import { DEFAULT_AI_CHATBOT_CONFIG } from '../../../utils/aiConfigDefaults';
import { FontSelector } from '../../common/FontSelector';
import { MascotLauncherSettings } from './MascotLauncherSettings';
import { mascotBubbleStyle, mascotSheets } from '../../../utils/mascotCatalog';
import { PageMascot } from '../../chat/PageMascot';
import { chatbotBadgeTextShadow, chatbotMascotSize, chatbotSideMargin } from '../../../utils/chatbotLauncherStyle';

interface Props {
  config?: AiChatbotConfig;
  onChange: (newConfig: AiChatbotConfig) => void;
  canEditAI?: boolean;
}

const COLOR_THEME_PRESETS = [
  {
    name: 'thương hiệu của bạn Xanh Chuẩn',
    primary: '#005baa',
    start: '#005baa',
    end: '#003e75',
    userBg: '#005baa',
    userText: '#ffffff',
  },
  {
    name: 'Xanh Navy Hoàng Gia',
    primary: '#1e3a8a',
    start: '#1e3a8a',
    end: '#0f172a',
    userBg: '#1e3a8a',
    userText: '#ffffff',
  },
  {
    name: 'Xanh Ngọc Lục Bảo (Emerald)',
    primary: '#059669',
    start: '#059669',
    end: '#064e3b',
    userBg: '#059669',
    userText: '#ffffff',
  },
  {
    name: 'Xanh Cyan Hiện Đại',
    primary: '#0891b2',
    start: '#0891b2',
    end: '#164e63',
    userBg: '#0891b2',
    userText: '#ffffff',
  },
  {
    name: 'Tím Doanh Nghiệp (Indigo)',
    primary: '#4f46e5',
    start: '#4f46e5',
    end: '#312e81',
    userBg: '#4f46e5',
    userText: '#ffffff',
  },
];

export const AiChatbotCustomizer: React.FC<Props> = ({ config: propConfig, onChange, canEditAI = true }) => {
  const [cfg, setCfg] = useState<AiChatbotConfig>({
    ...DEFAULT_AI_CHATBOT_CONFIG,
    ...(propConfig || {}),
  });

  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);

  const update = (patch: Partial<AiChatbotConfig>) => {
    const updated = { ...cfg, ...patch };
    setCfg(updated);
    onChange(updated);
  };

  const handleApplyPreset = (preset: typeof COLOR_THEME_PRESETS[0]) => {
    update({
      primaryColor: preset.primary,
      headerGradientStart: preset.start,
      headerGradientEnd: preset.end,
      userBubbleBgColor: preset.userBg,
      userBubbleTextColor: preset.userText,
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    const current = cfg.suggestedQuestions || [];
    update({ suggestedQuestions: [...current, newQuestion.trim()] });
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    const current = [...(cfg.suggestedQuestions || [])];
    current.splice(index, 1);
    update({ suggestedQuestions: current });
  };

  const handleResetDefaults = () => {
    if (!confirm('Bạn có chắc muốn khôi phục toàn bộ giao diện Chatbot AI về mặc định?')) return;
    setCfg(DEFAULT_AI_CHATBOT_CONFIG);
    onChange(DEFAULT_AI_CHATBOT_CONFIG);
    setNotice({ text: 'Đã khôi phục giao diện mặc định!', type: 'success' });
    setTimeout(() => setNotice(null), 3000);
  };

  const renderAvatarPreview = (type?: string, url?: string, size = 'w-5 h-5') => {
    if (url) {
      return <img src={url} alt="avatar" className={`${size} rounded-full object-cover`} />;
    }
    switch (type) {
      case 'shield':
        return <Shield className={size} />;
      case 'sparkles':
        return <Sparkles className={size} />;
      case 'headphones':
        return <Headphones className={size} />;
      case 'userCheck':
        return <UserCheck className={size} />;
      default:
        return <Bot className={size} />;
    }
  };

  return (
    <fieldset disabled={!canEditAI} className="space-y-6 min-w-0">
      {!canEditAI && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
          Bạn chỉ có quyền Xem AI. Các thiết lập giao diện Chatbot đang ở chế độ chỉ đọc.
        </div>
      )}
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Tùy Chỉnh Toàn Diện Giao Diện Chatbot AI Landing Page
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Thay đổi tên bot, vị trí nút nổi (trái/phải, khoảng cách lề), màu sắc gradient, avatar, kích thước cửa sổ chat và câu hỏi gợi ý.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {/* Main Grid: Left Controls, Right Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SETTINGS (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Bật/Tắt & Danh tính Bot */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                1. Trạng Thái & Danh Tính Chatbot
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled !== false}
                  onChange={(e) => update({ enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-neutral-800">
                  {cfg.enabled !== false ? 'Đang Bật Trên Landing Page' : 'Đang Tắt'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tên Trợ Lý AI (Bot Name)</label>
                <input
                  type="text"
                  value={cfg.botName || ''}
                  onChange={(e) => update({ botName: e.target.value })}
                  placeholder="VD: Trợ lý AI thương hiệu của bạn..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Phụ Đề Dưới Tên (Subtitle)</label>
                <input
                  type="text"
                  value={cfg.botSubtitle || ''}
                  onChange={(e) => update({ botSubtitle: e.target.value })}
                  placeholder="VD: Tư vấn nghiệp vụ & biểu phí 24/7..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Chữ trên nút mở Chatbot</label>
                <input
                  type="text"
                  value={cfg.launcherText || 'Trợ lý AI'}
                  onChange={(e) => update({ launcherText: e.target.value })}
                  placeholder="Trợ lý AI"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <MascotLauncherSettings config={cfg} onChange={update} />

            {/* Avatar picker */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">Biểu Tượng Đại Diện (Avatar)</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { type: 'bot', label: 'Robot AI', icon: <Bot className="w-4 h-4" /> },
                  { type: 'shield', label: 'Khiên thương hiệu của bạn', icon: <Shield className="w-4 h-4" /> },
                  { type: 'sparkles', label: 'Ngôi sao', icon: <Sparkles className="w-4 h-4" /> },
                  { type: 'headphones', label: 'Tai nghe CSKH', icon: <Headphones className="w-4 h-4" /> },
                  { type: 'userCheck', label: 'Chuyên viên', icon: <UserCheck className="w-4 h-4" /> },
                  { type: 'custom', label: 'Ảnh URL', icon: <Palette className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => update({ botAvatarType: item.type as any })}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      cfg.botAvatarType === item.type
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                        : 'bg-neutral-50/70 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>

              {cfg.botAvatarType === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={cfg.customAvatarUrl || ''}
                    onChange={(e) => update({ customAvatarUrl: e.target.value })}
                    placeholder="Nhập đường link ảnh đại diện (https://...)"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Vị Trí Đặt Icon Nổi Landing Page */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Move className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                2. Vị Trí Đặt Icon Nổi Trên Landing Page
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Vị Trí Góc Màn Hình</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update({ floatingPosition: 'bottom-right' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      cfg.floatingPosition !== 'bottom-left'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    Góc Dưới Phải
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ floatingPosition: 'bottom-left' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      cfg.floatingPosition === 'bottom-left'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    Góc Dưới Trái
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Lề Đáy (Bottom px)</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={cfg.floatingMarginBottom ?? 20}
                    onChange={(e) => update({ floatingMarginBottom: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Lề Bên (Side px)</label>
                  <input
                    type="number"
                    min={40}
                    max={160}
                    value={chatbotSideMargin(cfg)}
                    onChange={(e) => update({ floatingMarginSide: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Floating Badge banner */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-neutral-800">
                  Hiển thị Huy hiệu nổi mời tư vấn trên nút tròn
                </span>
                <input
                  type="checkbox"
                  checked={cfg.showFloatingBadge !== false}
                  onChange={(e) => update({ showFloatingBadge: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              {cfg.showFloatingBadge !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <label className="block text-[11px] font-semibold text-neutral-600">Nội Dung Huy Hiệu
                  <input
                    type="text"
                    value={cfg.floatingBadgeText || ''}
                    onChange={(e) => update({ floatingBadgeText: e.target.value })}
                    placeholder="VD: AI Tư vấn Báo phí ngay..."
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-600"
                  />
                  </label>
                  <label className="text-[11px] font-semibold text-neutral-600">Màu bóng đổ chữ
                    <input type="color" value={cfg.floatingBadgeTextShadowColor || '#005baa'} onChange={e=>update({floatingBadgeTextShadowColor:e.target.value})} className="mt-1 block w-full h-8 rounded border bg-white" />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 3. Màu Sắc & Bảng Màu Thương Hiệu */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                3. Bảng Màu & Gradient
              </h4>
              <span className="text-[10px] text-neutral-400">Tùy biến nhận diện thương hiệu</span>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">Mẫu Phối Màu Nhanh:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_THEME_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-white text-[11px] font-medium text-neutral-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Màu Chủ Đạo (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.primaryColor || '#005baa'}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.primaryColor || '#005baa'}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Header Gradient Bắt Đầu</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.headerGradientStart || '#005baa'}
                    onChange={(e) => update({ headerGradientStart: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.headerGradientStart || '#005baa'}
                    onChange={(e) => update({ headerGradientStart: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Header Gradient Kết Thúc</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.headerGradientEnd || '#003e75'}
                    onChange={(e) => update({ headerGradientEnd: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.headerGradientEnd || '#003e75'}
                    onChange={(e) => update({ headerGradientEnd: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Màu Bóng Chat Người Dùng</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.userBubbleBgColor || '#005baa'}
                    onChange={(e) => update({ userBubbleBgColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.userBubbleBgColor || '#005baa'}
                    onChange={(e) => update({ userBubbleBgColor: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Màu Bóng Chat AI Trả Lời</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.botBubbleBgColor || '#ffffff'}
                    onChange={(e) => update({ botBubbleBgColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={cfg.botBubbleBgColor || '#ffffff'}
                    onChange={(e) => update({ botBubbleBgColor: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Kích Thước & Lời Chào Khởi Đầu */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Layout className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                4. Kích Thước Khung Chat & Tin Nhắn Mở Đầu
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Chiều Rộng Cửa Sổ (Width: {cfg.chatWindowWidth ?? 420}px)
                </label>
                <input
                  type="range"
                  min={360}
                  max={520}
                  step={10}
                  value={cfg.chatWindowWidth ?? 420}
                  onChange={(e) => update({ chatWindowWidth: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Chiều Cao Cửa Sổ (Height: {cfg.chatWindowHeight ?? 580}px)
                </label>
                <input
                  type="range"
                  min={480}
                  max={720}
                  step={10}
                  value={cfg.chatWindowHeight ?? 580}
                  onChange={(e) => update({ chatWindowHeight: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Tin Nhắn Chào Mừng Mặc Định</label>
              <textarea
                rows={2}
                value={cfg.welcomeMessage || ''}
                onChange={(e) => update({ welcomeMessage: e.target.value })}
                placeholder="Xin chào Quý khách! Tôi là Trợ lý AI thương hiệu của bạn..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Gợi Ý Ô Nhập (Placeholder)</label>
              <input
                type="text"
                value={cfg.placeholderText || ''}
                onChange={(e) => update({ placeholderText: e.target.value })}
                placeholder="VD: Nhập câu hỏi của Quý khách..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* 5. Tùy Chọn Font Chữ Chatbot */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  5. Tùy Chọn Font Chữ Chatbot
                </h4>
              </div>
              <span className="text-[10px] text-neutral-400">Tối ưu hiển thị tiếng Việt & thương hiệu</span>
            </div>

            <FontSelector
              value={cfg.fontFamily || ''}
              onChange={(f) => update({ fontFamily: f })}
              label="Kiểu chữ hiển thị cho Chatbot"
              description="Font chữ áp dụng đồng bộ cho toàn bộ cửa sổ chat, lời chào và tin nhắn tư vấn."
              placeholder="Chọn font chuẩn tiếng Việt (Inter, Be Vietnam Pro, Plus Jakarta Sans...)"
              previewText="Trợ lý AI – Hỗ trợ thông tin 24/7"
            />
          </div>

          {/* 6. Tính Năng & Câu Hỏi Gợi Ý Nhanh */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                6. Tiện Ích Tương Tác & Câu Hỏi Gợi Ý Nhanh
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'enableVoiceInput', label: 'Mic Giọng Nói', icon: <Mic className="w-3.5 h-3.5" /> },
                { key: 'enableVoiceOutput', label: 'Đọc Âm Thanh TTS', icon: <Volume2 className="w-3.5 h-3.5" /> },
                { key: 'enableGoogleSearch', label: 'Tìm Kiếm Grounding', icon: <Globe className="w-3.5 h-3.5" /> },
                { key: 'showQuickCallbackForm', label: 'Form Gọi Lại', icon: <Phone className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <label
                  key={item.key}
                  className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between cursor-pointer hover:bg-neutral-100"
                >
                  <div className="flex items-center gap-1.5 text-neutral-700 text-xs font-semibold">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(cfg as any)[item.key] !== false}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            {/* Suggested quick questions */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-neutral-700">
                Danh Sách Câu Hỏi Gợi Ý Nhanh (Quick Replies)
              </label>
              <div className="space-y-1.5">
                {(cfg.suggestedQuestions || []).map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800"
                  >
                    <span>{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-neutral-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Thêm câu hỏi gợi ý mới..."
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUAL PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-xl border border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Xem Trước Trực Quan Thời Gian Thực</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="text-[11px] font-semibold text-blue-400 hover:underline cursor-pointer"
              >
                {previewOpen ? 'Thu gọn xem trước' : 'Mở rộng xem trước'}
              </button>
            </div>

            {/* Mock Landing Canvas */}
            <div className="relative mt-4 bg-slate-100 rounded-xl p-4 h-[560px] overflow-hidden border border-neutral-700 flex flex-col justify-between">
              {/* Fake web content header */}
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg shadow-2xs flex items-center justify-between text-[11px] text-neutral-600">
                <span className="font-bold text-blue-900">Trang web • Landing Page</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                  Demo Preview
                </span>
              </div>

              {/* Chat window preview (simulated) */}
              {previewOpen && (
                <div
                  className="bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden text-neutral-900 mx-auto"
                  style={{
                    width: '94%',
                    height: '420px',
                    fontFamily: cfg.fontFamily || undefined,
                  }}
                >
                  {/* Header */}
                  <div
                    className="p-3 text-white flex items-center justify-between shadow-xs shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${cfg.headerGradientStart || cfg.primaryColor || '#005baa'}, ${cfg.headerGradientEnd || '#003e75'})`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                        {renderAvatarPreview(cfg.botAvatarType, cfg.customAvatarUrl, 'w-4 h-4')}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold leading-tight">{cfg.botName || 'Trợ lý AI'}</p>
                        <p className="text-[9px] text-white/80">{cfg.botSubtitle || 'Tư vấn 24/7'}</p>
                      </div>
                    </div>
                    <X className="w-3.5 h-3.5 text-white/70" />
                  </div>

                  {/* Sub-bar */}
                  <div className="bg-slate-50 px-2.5 py-1 border-b border-slate-100 text-[10px] text-slate-700 flex items-center justify-between">
                    <span className="font-semibold truncate">Tư vấn chính hãng thương hiệu của bạn</span>
                    {cfg.showQuickCallbackForm !== false && (
                      <span className="text-blue-700 font-bold underline">Yêu cầu gọi lại</span>
                    )}
                  </div>

                  {/* Chat bubbles */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto bg-slate-50/50 text-[11px]">
                    <div className="flex flex-col items-start">
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2 shadow-2xs border border-neutral-200 rounded-tl-xs"
                        style={{
                          backgroundColor: cfg.botBubbleBgColor || '#ffffff',
                          color: cfg.botBubbleTextColor || '#1e293b',
                        }}
                      >
                        {cfg.welcomeMessage || 'Xin chào Quý khách! Em sẵn sàng tư vấn quyền lợi & biểu phí.'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2 shadow-2xs rounded-tr-xs"
                        style={{
                          backgroundColor: cfg.userBubbleBgColor || cfg.primaryColor || '#005baa',
                          color: cfg.userBubbleTextColor || '#ffffff',
                        }}
                      >
                        Sản phẩm này có những đặc điểm gì?
                      </div>
                    </div>

                    <div className="flex flex-col items-start">
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2 shadow-2xs border border-neutral-200 rounded-tl-xs"
                        style={{
                          backgroundColor: cfg.botBubbleBgColor || '#ffffff',
                          color: cfg.botBubbleTextColor || '#1e293b',
                        }}
                      >
                        Dạ có ạ! thương hiệu của bạn bảo lãnh viện phí trực tiếp tại hơn 300 bệnh viện quốc tế & công lập trên toàn quốc.
                      </div>
                    </div>
                  </div>

                  {/* Quick replies */}
                  {cfg.suggestedQuestions && cfg.suggestedQuestions.length > 0 && (
                    <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center gap-1 overflow-x-auto text-[10px]">
                      {cfg.suggestedQuestions.slice(0, 2).map((q, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[140px]"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input bar */}
                  <div className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5 text-[11px]">
                    {cfg.enableVoiceInput !== false && <Mic className="w-3.5 h-3.5 text-slate-400 ml-1" />}
                    <div className="flex-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-400 truncate text-[10px]">
                      {cfg.placeholderText || 'Nhập câu hỏi...'}
                    </div>
                    <div
                      className="w-7 h-7 rounded-lg text-white flex items-center justify-center"
                      style={{ backgroundColor: cfg.primaryColor || '#005baa' }}
                    >
                      <Send className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )}

              {/* Floating button simulated */}
              <div
                className={`absolute z-10 flex flex-col ${
                  cfg.floatingPosition === 'bottom-left' ? 'items-start' : 'items-end'
                }`}
                style={{
                  bottom: `${Math.max(8, Math.min(80, cfg.floatingMarginBottom ?? 20)) / 4}px`,
                  ...(cfg.floatingPosition === 'bottom-left'
                    ? { left: `${chatbotSideMargin(cfg) / 4}px` }
                    : { right: `${chatbotSideMargin(cfg) / 4}px` }),
                }}
              >
                {cfg.showFloatingBadge !== false && (
                  <div className={`mb-1.5 px-2.5 py-1 rounded-full shadow-md text-[10px] font-bold text-neutral-800 flex items-center gap-1.5 ${cfg.launcherVisual === 'mascot' ? '' : 'bg-white border border-slate-200'}`} style={cfg.launcherVisual === 'mascot' ? mascotBubbleStyle(cfg) : undefined}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span style={{textShadow:chatbotBadgeTextShadow(cfg)}}>{cfg.floatingBadgeText || 'AI Tư vấn Báo phí ngay'}</span>
                  </div>
                )}

                <div
                  className={`rounded-xl text-white shadow-xl flex items-center justify-center border-2 border-white cursor-pointer ${cfg.launcherVisual === 'mascot' ? 'gap-1 px-1' : 'w-12 h-12'}`}
                  style={{ backgroundColor: cfg.primaryColor || '#005baa', ...(cfg.launcherVisual === 'mascot' ? mascotBubbleStyle(cfg) : {}) }}
                >
                  {cfg.launcherVisual === 'mascot' ? <PageMascot {...mascotSheets(cfg.mascotId)} size={Math.min(90, Math.round(chatbotMascotSize(cfg) / 2))} /> : renderAvatarPreview(cfg.botAvatarType, cfg.customAvatarUrl, 'w-6 h-6')}
                  {cfg.launcherVisual === 'mascot' && <span className="text-[10px] font-bold whitespace-nowrap" style={{color:cfg.primaryColor || '#005baa'}}>{cfg.launcherText || 'Trợ lý AI'}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};
