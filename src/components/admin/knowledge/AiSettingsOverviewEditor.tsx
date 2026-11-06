import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  Settings,
  Bot,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Copy,
  Download,
  Upload,
  Play,
  Terminal,
  FileJson,
  Layers,
  Eye,
  Type,
  PhoneCall,
  MessageSquare,
  HeartHandshake,
  Search,
  Check,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { AiTrainingConfig, AiChatbotConfig, LandingPageConfig } from '../../../types';
import { MascotLauncherSettings } from './MascotLauncherSettings';
import { DEFAULT_AI_TRAINING_CONFIG, DEFAULT_AI_CHATBOT_CONFIG } from '../../../utils/aiConfigDefaults';
import { getAuthHeaders, authFetch } from '../../../services/api';
import { FontSelector } from '../../common/FontSelector';
import { GeminiApiKeyManagerCard } from './GeminiApiKeyManagerCard';

interface Props {
  role?: string;
  config?: LandingPageConfig;
  onConfigChange?: (newConfig: LandingPageConfig) => void;
  onOpenTestChat?: () => void;
  canEditAI?: boolean;
}

interface AiOverviewResponse {
  success: boolean;
  status: 'ready' | 'missing_key';
  geminiAvailable: boolean;
  apiKeyConfigured: boolean;
  modelName: string;
  fallbackModelName: string;
  temperature: number;
  maxOutputTokens: number;
  topKRetrieval: number;
  useSearchGrounding: boolean;
  strictKnowledgeOnly: boolean;
  systemPromptPrefix: string;
  training: AiTrainingConfig;
  stats: {
    totalKnowledgeItems: number;
    activeKnowledgeItems: number;
    productsCount: number;
    categoriesCount: number;
    componentTypesCount: number;
  };
  serverTime: string;
}

export const AiSettingsOverviewEditor: React.FC<Props> = ({
  role = 'admin',
  config,
  onConfigChange,
  onOpenTestChat,
  canEditAI = true,
}) => {
  const isReadOnly = role === 'viewer' || !canEditAI;

  // Active section tab
  const [activeTab, setActiveTab] = useState<'overview' | 'model' | 'persona' | 'playbooks' | 'widget' | 'json'>('overview');

  // Server overview state
  const [overview, setOverview] = useState<AiOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form edit state for AI Training & Model settings
  const [formData, setFormData] = useState<AiTrainingConfig | null>(null);

  // Widget settings
  const [chatbotSettings, setChatbotSettings] = useState<AiChatbotConfig | null>(null);

  // Ping test state
  const [testPrompt, setTestPrompt] = useState('Bảo hiểm ô tô Bảo Việt có những quyền lợi gì và thời gian bồi thường bao lâu?');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ reply: string; durationMs: number; modelUsed: string } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // JSON import/export modal or block
  const [jsonText, setJsonText] = useState('');
  const [jsonCopied, setJsonCopied] = useState(false);

  // Load current overview from server
  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/config/overview', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setOverview(data);
        setFormData(data.training || config?.aiChatbot?.training || {} as AiTrainingConfig);
        setChatbotSettings(config?.aiChatbot || {} as AiChatbotConfig);
      }
    } catch (err) {
      console.warn('Error loading AI config overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Keep JSON string in sync
  useEffect(() => {
    if (!formData || !chatbotSettings) return;
    const fullConfig = {
      modelParameters: {
        modelName: formData.modelName || 'gemini-3.8-flash',
        fallbackModelName: formData.fallbackModelName || 'gemini-3.1-flash-lite',
        temperature: formData.temperature ?? 0.4,
        maxOutputTokens: formData.maxOutputTokens || 2048,
        topKRetrieval: formData.topKRetrieval || 5,
        useSearchGrounding: formData.useSearchGrounding ?? true,
        strictKnowledgeOnly: formData.strictKnowledgeOnly ?? false,
        systemPromptPrefix: formData.systemPromptPrefix || '',
      },
      personaAndEtiquette: {
        botName: formData.botName || 'Trợ lý AI Bảo Việt',
        aiPronoun: formData.aiPronoun || 'Em',
        customerPronoun: formData.customerPronoun || 'Quý khách',
        conversationTone: formData.conversationTone || 'advisor',
        politenessLevel: formData.politenessLevel || 'warm_polite',
        responseLength: formData.responseLength || 'balanced',
        useEmoji: formData.useEmoji || 'subtle',
        useBulletPoints: formData.useBulletPoints ?? true,
        openingGreeting: formData.openingGreeting || '',
        closingWish: formData.closingWish || '',
      },
      playbooks: {
        leadCaptureTrigger: formData.leadCaptureTrigger || '',
        pricingPlaybook: formData.pricingPlaybook || '',
        claimPlaybook: formData.claimPlaybook || '',
        hesitationPlaybook: formData.hesitationPlaybook || '',
        complaintEtiquette: formData.complaintEtiquette || '',
        outOfScopeResponse: formData.outOfScopeResponse || '',
      },
      chatbotWidget: chatbotSettings,
    };
    setJsonText(JSON.stringify(fullConfig, null, 2));
  }, [formData, chatbotSettings]);

  // Update helper
  const updateForm = (patch: Partial<AiTrainingConfig>) => {
    setFormData((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateChatbot = (patch: Partial<AiChatbotConfig>) => {
    setChatbotSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Save changes
  const handleSaveAll = async () => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      // 1. Save to server AI training state
      const res = await authFetch('/api/ai/config/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi lưu cấu hình AI trên máy chủ');
      }

      // 2. Sync with landing page config
      if (onConfigChange && config) {
        const mergedChatbot: AiChatbotConfig = {
          ...chatbotSettings,
          botName: formData.botName || chatbotSettings.botName,
          enableGoogleSearch: formData.useSearchGrounding ?? chatbotSettings.enableGoogleSearch,
          training: formData,
        };
        onConfigChange({
          ...config,
          aiChatbot: mergedChatbot,
        });
      }

      setNotice({
        text: 'Đã lưu và đồng bộ toàn bộ cấu hình AI thành công!',
        type: 'success',
      });
      loadOverview();
    } catch (err: any) {
      setNotice({
        text: err?.message || 'Có lỗi xảy ra khi lưu cấu hình AI',
        type: 'error',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Reset to default
  const handleResetDefaults = async () => {
    if (isReadOnly) return;
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ tham số mô hình & cấu hình AI về mặc định của Bảo Việt?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/ai/knowledge/training/reset', { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setFormData(DEFAULT_AI_TRAINING_CONFIG);
        setChatbotSettings(DEFAULT_AI_CHATBOT_CONFIG);
        if (onConfigChange && config) {
          onConfigChange({
            ...config,
            aiChatbot: DEFAULT_AI_CHATBOT_CONFIG,
          });
        }
        setNotice({ text: 'Đã khôi phục cấu hình AI chuẩn mực mặc định.', type: 'success' });
        loadOverview();
      }
    } catch (err) {
      setNotice({ text: 'Lỗi khi khôi phục cấu hình mặc định.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Run ping test
  const handleRunPingTest = async () => {
    if (!testPrompt.trim()) return;
    setTestRunning(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await authFetch('/api/ai/config/test-ping', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          prompt: testPrompt,
          modelName: formData.modelName || 'gemini-3.8-flash',
          temperature: formData.temperature ?? 0.4,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          reply: data.reply,
          durationMs: data.durationMs,
          modelUsed: data.modelUsed,
        });
      } else {
        setTestError(data.error || 'Lỗi khi kiểm tra kết nối với AI');
      }
    } catch (err: any) {
      setTestError(err?.message || 'Không thể gửi yêu cầu thử nghiệm tới máy chủ');
    } finally {
      setTestRunning(false);
    }
  };

  // Copy JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  // Download JSON
  const handleDownloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baoviet-ai-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.personaAndEtiquette || parsed.modelParameters) {
        setFormData((prev) => ({
          ...prev,
          ...(parsed.modelParameters || {}),
          ...(parsed.personaAndEtiquette || {}),
          ...(parsed.playbooks || {}),
        }));
      }
      if (parsed.chatbotWidget) {
        setChatbotSettings(parsed.chatbotWidget);
      }
      setNotice({ text: 'Đã nạp dữ liệu từ JSON thành công. Nhấn "Lưu Cấu Hình" để áp dụng!', type: 'info' });
    } catch (err) {
      alert('Định dạng JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc cú pháp.');
    }
  };

  if (loading || !overview || !formData || !chatbotSettings) {
    return <div className="min-h-[320px] flex flex-col items-center justify-center text-neutral-500"><RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2"/><p className="text-sm font-semibold">Đang tải cấu hình AI...</p><p className="text-xs text-neutral-400 mt-1">Chưa hiển thị cấu hình mặc định trong lúc tải.</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-xs transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notice.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-neutral-400 hover:text-neutral-700 text-xs px-2 py-1 rounded-lg"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header Banner & Realtime Status Summary */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-bold text-neutral-900">
                  Cấu Hình & Thiết Lập Hệ Thống AI Hiện Tại
                </h3>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                    overview?.geminiAvailable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      overview?.geminiAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {overview?.geminiAvailable ? 'AI Sẵn Sàng Hoạt Động (Online)' : 'Chưa cấu hình API Key'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Model: {formData.modelName || 'gemini-3.8-flash'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 max-w-3xl">
                Bảng điều khiển toàn diện: Xem và chỉnh sửa các tham số mô hình Gemini, nhiệt độ sáng tạo (Temperature),
                ngữ cảnh tri thức RAG, phong cách xưng hô, kịch bản tư vấn và phễu thu thập khách hàng tiềm năng.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving || isReadOnly}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Khôi phục toàn bộ cấu hình về chuẩn mực ban đầu"
            >
              <RotateCcw className="w-4 h-4 text-neutral-500" />
              <span>Khôi Phục Mặc Định</span>
            </button>

            {onOpenTestChat && (
              <button
                type="button"
                onClick={onOpenTestChat}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Thử Nghiệm Chatbot</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || isReadOnly}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình AI'}</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards - Current Setup Telemetry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/60 space-y-1">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Mô hình AI Active</span>
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="font-bold text-neutral-900 text-sm truncate">
              {formData.modelName || 'gemini-3.8-flash'}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Dự phòng: {formData.fallbackModelName || 'gemini-3.1-flash-lite'}
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/60 space-y-1">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Nhiệt độ (Temperature)</span>
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="font-bold text-neutral-900 text-sm">
              {formData.temperature ?? 0.4} / 1.0
            </div>
            <div className="text-[10px] text-neutral-400">
              {(formData.temperature ?? 0.4) <= 0.4
                ? 'Độ chính xác cao & trung thực'
                : 'Linh hoạt & sáng tạo'}
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/60 space-y-1">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Kho Tri Thức Kết Nối</span>
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-neutral-900 text-sm">
              {overview?.stats.activeKnowledgeItems ?? 0} / {overview?.stats.totalKnowledgeItems ?? 0} mục
            </div>
            <div className="text-[10px] text-neutral-400">
              RAG trích xuất: Top {formData.topKRetrieval || 5} đoạn liên quan
            </div>
          </div>

          <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/60 space-y-1">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Xưng hô & Giọng điệu</span>
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="font-bold text-neutral-900 text-sm truncate">
              {formData.aiPronoun || 'Em'} ➔ {formData.customerPronoun || 'Quý khách'}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Tông giọng: {formData.conversationTone || 'advisor'} | Lịch sự: {formData.politenessLevel || 'warm_polite'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs for Configuration Sections */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-100/90 rounded-2xl border border-neutral-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Eye className="w-4 h-4 text-blue-600" />
          <span>Tổng Quan Thiết Lập Hiện Tại</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('model')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'model'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>Mô Hình & Tham Số AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('persona')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'persona'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-rose-500" />
          <span>Nhận Diện, Xưng Hô & Lịch Sự</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('playbooks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'playbooks'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-amber-600" />
          <span>Kịch Bản Báo Phí & Chốt Lead</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('widget')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'widget'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Bot className="w-4 h-4 text-purple-600" />
          <span>Widget Chatbot & Font Chữ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'json'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <FileJson className="w-4 h-4 text-neutral-600" />
          <span>Xem & Xuất/Nhập JSON</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW SUMMARY & INTERACTIVE TEST */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Gemini API Key Management Card */}
          <GeminiApiKeyManagerCard canEdit={!isReadOnly} onKeyUpdated={loadOverview} />

          {/* Detailed Config Table Grid */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-neutral-900">
                  Bảng Tổng Hợp Chi Tiết Thiết Lập AI Đang Hoạt Động
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">Được đồng bộ tự động với máy chủ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Group 1 */}
              <div className="p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/60 space-y-2.5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  1. Tham số Mô hình AI
                </span>
                <div className="space-y-1.5 text-xs text-neutral-700">
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Mô hình chính:</span>
                    <span className="font-semibold text-neutral-900">{formData.modelName || 'gemini-3.8-flash'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Mô hình dự phòng:</span>
                    <span className="font-medium text-neutral-800">{formData.fallbackModelName || 'gemini-3.1-flash-lite'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Nhiệt độ (Temperature):</span>
                    <span className="font-semibold text-neutral-900">{formData.temperature ?? 0.4}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Giới hạn Output Tokens:</span>
                    <span className="font-medium text-neutral-800">{formData.maxOutputTokens || 2048} tokens</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Tìm kiếm Google Search:</span>
                    <span className={`font-semibold ${formData.useSearchGrounding ? 'text-emerald-600' : 'text-neutral-400'}`}>
                      {formData.useSearchGrounding ? 'Đang Bật' : 'Tắt'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 2 */}
              <div className="p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/60 space-y-2.5">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  2. Ngữ Cảnh & Cơ Sở Tri Thức (RAG)
                </span>
                <div className="space-y-1.5 text-xs text-neutral-700">
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Số đoạn RAG trích xuất:</span>
                    <span className="font-semibold text-neutral-900">Top {formData.topKRetrieval || 5} mục</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Chế độ Strict Knowledge:</span>
                    <span className={`font-semibold ${formData.strictKnowledgeOnly ? 'text-amber-600' : 'text-neutral-500'}`}>
                      {formData.strictKnowledgeOnly ? 'Nghiêm ngặt (Chỉ tài liệu)' : 'Linh hoạt'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Tổng mục tri thức nạp:</span>
                    <span className="font-semibold text-neutral-900">{overview?.stats.totalKnowledgeItems || 0} mục</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Sản phẩm bảo hiểm:</span>
                    <span className="font-medium text-neutral-800">{overview?.stats.productsCount || 0} sản phẩm</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Phân loại nghiệp vụ:</span>
                    <span className="font-medium text-neutral-800">{overview?.stats.categoriesCount || 0} danh mục</span>
                  </div>
                </div>
              </div>

              {/* Group 3 */}
              <div className="p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/60 space-y-2.5">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  3. Nhân Diện & Giao Tiếp
                </span>
                <div className="space-y-1.5 text-xs text-neutral-700">
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Tên trợ lý:</span>
                    <span className="font-semibold text-neutral-900">{formData.botName || 'Trợ lý AI Bảo Việt'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">AI tự xưng:</span>
                    <span className="font-semibold text-blue-600">{formData.aiPronoun || 'Em'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Cách gọi khách:</span>
                    <span className="font-semibold text-blue-600">{formData.customerPronoun || 'Quý khách'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/40">
                    <span className="text-neutral-500">Độ dài câu trả lời:</span>
                    <span className="font-medium text-neutral-800">{formData.responseLength || 'balanced'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Font chữ Chatbot:</span>
                    <span className="font-medium text-neutral-800">{chatbotSettings.fontFamily || 'Mặc định giao diện'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('model')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Chỉnh sửa các thiết lập này</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Ping / Response Tester */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold text-neutral-900">
                  Kiểm Tra Phản Hồi Trực Tiếp Với Cấu Hình Đang Chọn
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">Đo lường độ trễ (Latency) & phong thái phản hồi</span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Nhập câu hỏi thử nghiệm gửi đến AI..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
                <button
                  type="button"
                  onClick={handleRunPingTest}
                  disabled={testRunning || !testPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                >
                  {testRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>{testRunning ? 'Đang Phân Tích...' : 'Gửi Thử Nghiệm'}</span>
                </button>
              </div>

              {/* Sample Quick Questions */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                <span>Gợi ý thử nhanh:</span>
                {[
                  'Bảo hiểm ô tô Bảo Việt bồi thường mất cắp không?',
                  'Phí bảo hiểm sức khỏe Bảo Việt An Gia khoảng bao nhiêu?',
                  'Số điện thoại của tôi là 0912345678, tư vấn giúp tôi.',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTestPrompt(sample)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>

              {/* Response Display */}
              {testResult && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-blue-900 border-b border-blue-200/60 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Phản hồi từ mô hình {testResult.modelUsed}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Độ trễ: {testResult.durationMs} ms
                    </span>
                  </div>
                  <div className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {testResult.reply}
                  </div>
                </div>
              )}

              {testError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 mt-3">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Không thể nhận phản hồi thử nghiệm:</p>
                    <p className="text-[11px] mt-0.5 text-rose-700">{testError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODEL & INFERENCE PARAMETERS */}
      {activeTab === 'model' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                Thiết Lập Mô Hình AI & Tham Số Suy Luận (Inference Engine)
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tùy chỉnh mô hình ngôn ngữ lớn (LLM), nhiệt độ sáng tạo và giới hạn an toàn thương hiệu.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Gemini GenAI SDK
            </span>
          </div>

          <div className="space-y-6">
            {/* Gemini API Key Management */}
            <GeminiApiKeyManagerCard canEdit={!isReadOnly} onKeyUpdated={loadOverview} />

            {/* 1. Primary Model Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-800 block">
                1. Mô Hình Ngôn Ngữ Chính (Primary Model)
              </label>
              <input type="text" value={formData.modelName || ''} onChange={e => updateForm({ modelName:e.target.value.trim() })} disabled={isReadOnly}
                placeholder="Ví dụ: gemini-3.5-flash-lite" spellCheck={false}
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono bg-white outline-none focus:ring-2 focus:ring-blue-500/20" />
              <p className="text-[11px] text-neutral-500">Nhập model ID được cấp cho project; dùng nút kiểm tra bên dưới trước khi lưu. CMS không giới hạn vào danh sách model cố định.</p>
            </div>

            {/* 2. Fallback Model */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 block">
                2. Mô Hình Dự Phòng (Fallback Model khi mạng gián đoạn hoặc quá tải)
              </label>
              <input type="text"
                value={formData.fallbackModelName ?? ''}
                onChange={(e) => updateForm({ fallbackModelName: e.target.value })}
                disabled={isReadOnly}
                placeholder="Model ID dự phòng; có thể để trống" spellCheck={false}
                className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono bg-white text-neutral-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" />
            </div>

            {/* 3. Temperature Slider */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-neutral-900 block">
                    3. Độ Sáng Tạo & Chính Xác (Temperature): {formData.temperature ?? 0.4}
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    Giá trị thấp (0.1 - 0.4) giúp câu trả lời chuẩn xác từng số liệu; giá trị cao (0.6 - 1.0) cho câu trả lời đa dạng hơn.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {(formData.temperature ?? 0.4) <= 0.3
                    ? 'Tuyệt đối chuẩn xác'
                    : (formData.temperature ?? 0.4) <= 0.5
                    ? 'Khuyến nghị Bảo Việt'
                    : 'Giao tiếp linh hoạt'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.temperature ?? 0.4}
                onChange={(e) => updateForm({ temperature: parseFloat(e.target.value) })}
                disabled={isReadOnly}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                <span>0.0 (Chính xác số liệu)</span>
                <span>0.4 (Chuẩn mực tư vấn)</span>
                <span>1.0 (Sáng tạo tối đa)</span>
              </div>
            </div>

            {/* 4. RAG Retrieval & Strict Knowledge Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top K Chunks */}
              <div className="space-y-2 p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60">
                <label className="text-xs font-bold text-neutral-900 block">
                  4. Số Đoạn Tri Thức Trích Xuất (Top-K RAG): {formData.topKRetrieval || 5} đoạn
                </label>
                <p className="text-[11px] text-neutral-500">
                  Số tài liệu tri thức liên quan nhất được trích xuất nạp vào ngữ cảnh để AI đọc trước khi trả lời.
                </p>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={formData.topKRetrieval || 5}
                  onChange={(e) => updateForm({ topKRetrieval: parseInt(e.target.value, 10) })}
                  disabled={isReadOnly}
                  className="w-full accent-blue-600 cursor-pointer mt-2"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>2 đoạn</span>
                  <span>5 đoạn (Chuẩn)</span>
                  <span>12 đoạn</span>
                </div>
              </div>

              {/* Strict Knowledge Only Toggle */}
              <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-900 block">
                      5. Chế Độ Nghiêm Ngặt (Strict Knowledge Only)
                    </label>
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => {}}
                      disabled={true}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    Khi bật, AI CHỈ ĐƯỢC PHÉP trả lời dựa trên tài liệu đã nạp. Tuyệt đối không phỏng đoán hay tự bịa số liệu ra ngoài quy định.
                  </p>
                </div>
                <span
                  className={`mt-2 text-[10px] font-bold ${
                    formData.strictKnowledgeOnly ? 'text-amber-600' : 'text-neutral-400'
                  }`}
                >
                  ● Luôn kích hoạt — chỉ dữ liệu từ Kho Tri Thức được phép dùng
                </span>
              </div>
            </div>

            {/* 5. Google Search Grounding */}
            <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">
                  6. Tìm Kiếm Bổ Sung Trực Tuyến (Google Search Grounding)
                </span>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Đã khóa khi chatbot tư vấn sản phẩm: AI không được dùng Google Search hay nguồn ngoài Kho Tri Thức.
                </p>
              </div>
              <input
                type="checkbox"
                checked={false}
                onChange={() => {}}
                disabled={true}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
            </div>

            {/* 6. System Prompt Prefix */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 block">
                7. Chỉ Thị Hệ Thống Tối Cao (Master System Prompt Prefix - Tùy chọn)
              </label>
              <p className="text-[11px] text-neutral-500">
                Chỉ thị này sẽ được đặt ở đầu cùng của prompt chỉ dẫn để AI luôn tuân thủ nguyên tắc riêng biệt của doanh nghiệp.
              </p>
              <textarea
                rows={3}
                value={formData.systemPromptPrefix || ''}
                onChange={(e) => updateForm({ systemPromptPrefix: e.target.value })}
                disabled={isReadOnly}
                placeholder="Ví dụ: Luôn ưu tiên giải thích quyền lợi bảo hiểm vật chất xe trước, sau đó mới đến các điều khoản bổ sung..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONA, PRONOUNS & POLITENESS */}
      {activeTab === 'persona' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                Nhận Diện Trợ Lý, Đại Từ Xưng Hô & Khuôn Mẫu Lịch Sự
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Thiết lập phong thái xưng hô, chuẩn mực dạ/thưa và văn hóa giao tiếp Bảo Việt.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Bot Name & Pronouns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Tên Trợ Lý AI</label>
                <input
                  type="text"
                  value={formData.botName || 'Trợ lý AI Bảo Việt'}
                  onChange={(e) => updateForm({ botName: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Đại Từ AI Tự Xưng</label>
                <input
                  type="text"
                  value={formData.aiPronoun || 'Em'}
                  onChange={(e) => updateForm({ aiPronoun: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Em, Tôi, Chuyên viên..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Cách Gọi Khách Hàng</label>
                <input
                  type="text"
                  value={formData.customerPronoun || 'Quý khách'}
                  onChange={(e) => updateForm({ customerPronoun: e.target.value })}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Quý khách, Anh/Chị, Quý đối tác..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Politeness & Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Khuôn Mẫu Lễ Phép</label>
                <select
                  value={formData.politenessLevel || 'warm_polite'}
                  onChange={(e) => updateForm({ politenessLevel: e.target.value as any })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                >
                  <option value="warm_polite">Lịch sự, ấm áp & chu đáo (Khuyên dùng)</option>
                  <option value="formal">Trang trọng tuyệt đối, sử dụng Dạ/Thưa/Kính gửi</option>
                  <option value="expert_respectful">Chuyên gia điềm đạm, minh bạch từng số liệu</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Tông Giọng Trò Chuyện (Tone)</label>
                <select
                  value={formData.conversationTone || 'advisor'}
                  onChange={(e) => updateForm({ conversationTone: e.target.value as any })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                >
                  <option value="advisor">Chuyên gia tư vấn giải pháp tối ưu (Advisor)</option>
                  <option value="enthusiastic">Nhiệt tình, truyền cảm hứng an tâm</option>
                  <option value="professional">Chuyên nghiệp, chuẩn mực pháp lý hợp đồng</option>
                  <option value="empathetic">Thấu cảm, ân cần và đồng hành cùng nỗi lo</option>
                  <option value="concise">Ngắn gọn, súc tích, trực diện vào câu hỏi</option>
                </select>
              </div>
            </div>

            {/* Length, Emoji & Bullet Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Độ Dài Câu Trả Lời</label>
                <select
                  value={formData.responseLength || 'balanced'}
                  onChange={(e) => updateForm({ responseLength: e.target.value as any })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                >
                  <option value="concise">Ngắn gọn (Dưới 120 từ)</option>
                  <option value="balanced">Vừa phải, đầy đủ thông tin (150-280 từ)</option>
                  <option value="detailed">Cặn kẽ, giải thích chi tiết điều khoản (300+ từ)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Sử Dụng Emoji (Biểu Tượng)</label>
                <select
                  value={formData.useEmoji || 'subtle'}
                  onChange={(e) => updateForm({ useEmoji: e.target.value as any })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                >
                  <option value="subtle">Tinh tế, chừng mực (1-3 biểu tượng: 🛡️, 📋)</option>
                  <option value="none">Không dùng bất kỳ Emoji nào</option>
                  <option value="lively">Sinh động, nổi bật</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">Định Dạng Gạch Đầu Dòng</span>
                  <span className="text-[10px] text-neutral-500">Tối ưu đọc trên di động</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.useBulletPoints ?? true}
                  onChange={(e) => updateForm({ useBulletPoints: e.target.checked })}
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Greetings & Wishes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Lời Chào Mở Đầu Chuẩn</label>
                <textarea
                  rows={2}
                  value={formData.openingGreeting || ''}
                  onChange={(e) => updateForm({ openingGreeting: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Lời Chúc Kết Thúc Chuẩn</label>
                <textarea
                  rows={2}
                  value={formData.closingWish || ''}
                  onChange={(e) => updateForm({ closingWish: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLAYBOOKS & LEAD CAPTURE */}
      {activeTab === 'playbooks' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                Kịch Bản Phản Hồi Tình Huống & Phễu Thu Thập Khách Hàng (Playbooks)
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Hướng dẫn cách thức AI xử lý khi khách hỏi phí, đòi bồi thường, do dự hoặc gửi số điện thoại.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Lời Dẫn Xin Số Điện Thoại & Báo Phí Ưu Đãi (Lead Capture Trigger)</span>
              </label>
              <textarea
                rows={2}
                value={formData.leadCaptureTrigger || ''}
                onChange={(e) => updateForm({ leadCaptureTrigger: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                2. Kịch Bản Khi Khách Hỏi Giá / Tính Phí Bảo Hiểm (Pricing Playbook)
              </label>
              <textarea
                rows={2}
                value={formData.pricingPlaybook || ''}
                onChange={(e) => updateForm({ pricingPlaybook: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                3. Kịch Bản Giải Thích Thủ Tục & Cam Kết Bồi Thường (Claim Playbook)
              </label>
              <textarea
                rows={2}
                value={formData.claimPlaybook || ''}
                onChange={(e) => updateForm({ claimPlaybook: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 block">
                4. Kịch Bản Khi Khách Hàng Do Dự / Muốn Cân Nhắc Thêm (Hesitation Playbook)
              </label>
              <textarea
                rows={2}
                value={formData.hesitationPlaybook || ''}
                onChange={(e) => updateForm({ hesitationPlaybook: e.target.value })}
                disabled={isReadOnly}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 block">
                  5. Ứng Xử Khi Khách Bức Xúc / Khiếu Nại (Complaint Etiquette)
                </label>
                <textarea
                  rows={2}
                  value={formData.complaintEtiquette || ''}
                  onChange={(e) => updateForm({ complaintEtiquette: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 block">
                  6. Từ Chối Lịch Sự Khi Ngoài Phạm Vi (Out of Scope)
                </label>
                <textarea
                  rows={2}
                  value={formData.outOfScopeResponse || ''}
                  onChange={(e) => updateForm({ outOfScopeResponse: e.target.value })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WIDGET & FONT CHATBOT */}
      {activeTab === 'widget' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                Thiết Lập Widget Chatbot Nổi & Font Chữ Hiển Thị
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Tùy chỉnh giao diện cửa sổ chat hiển thị trực tiếp cho khách hàng trên Landing Page.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Toggle Enabled & Position */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Hiển Thị Trên Landing Page</span>
                  <span className="text-[10px] text-neutral-500">Bật/tắt widget chatbot</span>
                </div>
                <input
                  type="checkbox"
                  checked={chatbotSettings.enabled !== false}
                  onChange={(e) => updateChatbot({ enabled: e.target.checked })}
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800">Vị Trí Nút Nổi</label>
                <select
                  value={chatbotSettings.floatingPosition || 'bottom-right'}
                  onChange={(e) => updateChatbot({ floatingPosition: e.target.value as any })}
                  disabled={isReadOnly}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none"
                >
                  <option value="bottom-right">Góc dưới bên phải (Chuẩn)</option>
                  <option value="bottom-left">Góc dưới bên trái</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Huy Hiệu Động Nổi Bật</span>
                  <span className="text-[10px] text-neutral-500">Thu hút khách nhấn chat</span>
                </div>
                <input
                  type="checkbox"
                  checked={chatbotSettings.showFloatingBadge !== false}
                  onChange={(e) => updateChatbot({ showFloatingBadge: e.target.checked })}
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            </div>

            <MascotLauncherSettings config={chatbotSettings} onChange={updateChatbot} disabled={isReadOnly} />

            {chatbotSettings.showFloatingBadge !== false && <label className="flex items-center gap-3 text-xs font-bold text-neutral-800">Màu bóng đổ chữ huy hiệu
              <input type="color" value={chatbotSettings.floatingBadgeTextShadowColor || '#005baa'} onChange={e=>updateChatbot({floatingBadgeTextShadowColor:e.target.value})} disabled={isReadOnly} className="h-9 w-16 rounded border bg-white" />
            </label>}

            {/* Official chatbot support phone */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 space-y-2">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-neutral-900">SĐT / Hotline chính thức của Chatbot</span>
              </div>
              <p className="text-[10px] text-neutral-500">Đây là số điện thoại chatbot sử dụng khi hướng dẫn khách hàng liên hệ. AI không tự suy đoán số khác.</p>
              <input
                type="text"
                value={chatbotSettings.supportPhone || ''}
                onChange={(e) => updateChatbot({ supportPhone: e.target.value })}
                disabled={isReadOnly}
                placeholder="Ví dụ: 1900 55 88 99"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Font Selector for Chatbot */}
            <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/60 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200/50">
                <Type className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Kiểu Chữ (Font Family) Riêng Cho Chatbot
                </span>
              </div>
              <FontSelector
                value={chatbotSettings.fontFamily || ''}
                onChange={(f) => updateChatbot({ fontFamily: f })}
                label="Font chữ cho cửa sổ chat & bong bóng tin nhắn"
                description="Font chữ áp dụng đồng bộ cho toàn bộ hội thoại và lời chào."
                placeholder="Chọn font chuẩn tiếng Việt (Inter, Be Vietnam Pro, Plus Jakarta Sans...)"
                previewText="Bảo hiểm Bảo Việt – Trợ lý AI tư vấn quyền lợi & biểu phí 24/7"
              />
            </div>

            {/* Voice Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Nhập Giọng Nói (Microphone STT)</span>
                  <span className="text-[10px] text-neutral-500">Khách nói trực tiếp vào micro</span>
                </div>
                <input
                  type="checkbox"
                  checked={chatbotSettings.enableVoiceInput !== false}
                  onChange={(e) => updateChatbot({ enableVoiceInput: e.target.checked })}
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Đọc To Câu Trả Lời (Voice TTS)</span>
                  <span className="text-[10px] text-neutral-500">Tự động phát âm thanh giải thích</span>
                </div>
                <input
                  type="checkbox"
                  checked={chatbotSettings.enableVoiceOutput !== false}
                  onChange={(e) => updateChatbot({ enableVoiceOutput: e.target.checked })}
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RAW JSON INSPECTOR & IMPORT/EXPORT */}
      {activeTab === 'json' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                Cấu Trúc Cấu Hình Đầy Đủ (Raw JSON Inspector)
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Toàn bộ cấu hình hệ thống AI hiện tại. Bạn có thể sao chép, tải về hoặc nhập từ file khác.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 flex items-center gap-1.5 cursor-pointer"
              >
                {jsonCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{jsonCopied ? 'Đã Sao Chép!' : 'Sao Chép JSON'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Xuống (.json)</span>
              </button>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Áp Dụng JSON Này</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={18}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={isReadOnly}
              className="w-full p-4 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs leading-relaxed outline-none border border-neutral-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
