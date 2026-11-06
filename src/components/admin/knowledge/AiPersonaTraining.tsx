import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  MessageSquare,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Smile,
  Sliders,
  Award,
  Zap,
  PhoneCall,
  FileQuestion,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { AiTrainingConfig } from '../../../types';
import { DEFAULT_AI_TRAINING_CONFIG } from '../../../utils/aiConfigDefaults';
import { getAuthHeaders, authFetch } from '../../../services/api';
import { GeminiApiKeyManagerCard } from './GeminiApiKeyManagerCard';

interface Props {
  initialConfig?: AiTrainingConfig;
  onConfigChange?: (config: AiTrainingConfig) => void;
  canViewAI?: boolean;
  canEditAI?: boolean;
}

export const AiPersonaTraining: React.FC<Props> = ({ initialConfig, onConfigChange, canViewAI = true, canEditAI = true }) => {
  const [config, setConfig] = useState<AiTrainingConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // Fetch training config from backend
  const fetchTrainingConfig = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/knowledge/training', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.training) {
        setConfig(data.training);
        setLoadError(null);
        if (onConfigChange) onConfigChange(data.training);
      }
    } catch (err: any) {
      console.error('Failed to fetch training config:', err);
      setLoadError(err?.message || 'Không thể tải cấu hình huấn luyện AI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await authFetch('/api/ai/knowledge/training', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice({ text: 'Đã lưu cấu hình huấn luyện AI phong cách & lịch sự thành công!', type: 'success' });
        if (onConfigChange) onConfigChange(config);
      } else {
        setNotice({ text: data.error || 'Lưu cấu hình thất bại', type: 'error' });
      }
    } catch (err: any) {
      setNotice({ text: 'Lỗi kết nối khi lưu cấu hình huấn luyện', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleReset = async () => {
    if (!confirm('Bạn có chắc muốn khôi phục toàn bộ phong cách huấn luyện AI về khuôn mẫu chuẩn Bảo Việt?')) {
      return;
    }
    setConfig(DEFAULT_AI_TRAINING_CONFIG);
    setSaving(true);
    try {
      const res = await authFetch('/api/ai/knowledge/training/reset', { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.training) {
        setConfig(data.training);
        setLoadError(null);
        setNotice({ text: 'Đã khôi phục khuôn mẫu lịch sự chuẩn!', type: 'success' });
        if (onConfigChange) onConfigChange(data.training);
      }
    } catch (err) {
      setNotice({ text: 'Không thể khôi phục mặc định', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  if (loading) {
    return <div className="min-h-[320px] flex flex-col items-center justify-center text-neutral-500"><RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2"/><p className="text-sm font-semibold">Đang tải cấu hình huấn luyện AI...</p><p className="text-xs text-neutral-400 mt-1">Chưa hiển thị dữ liệu mẫu.</p></div>;
  }
  if (loadError || !config) {
    return <div className="min-h-[320px] flex flex-col items-center justify-center text-neutral-500"><AlertCircle className="w-7 h-7 text-rose-500 mb-2"/><p className="text-sm font-semibold">Không thể tải cấu hình huấn luyện AI.</p><p className="text-xs text-neutral-400 mt-1">{loadError || 'Chưa có dữ liệu cấu hình.'}</p><button type="button" onClick={fetchTrainingConfig} className="mt-3 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">Thử lại</button></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-blue-600" />
            Huấn Luyện AI: Khuôn Mẫu Lịch Sự & Cách Nói Chuyện, Xưng Hô
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Thiết lập phong cách giao tiếp chuẩn mực, đại từ xưng hô, thái độ khi tiếp nhận khiếu nại và các kịch bản phản hồi theo ngữ cảnh khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={!canEditAI || saving}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục chuẩn
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEditAI || saving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Đang lưu...' : 'Lưu Huấn Luyện AI'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Gemini API Key Management */}
      <GeminiApiKeyManagerCard canEdit={canEditAI} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: KHUÔN MẪU LỊCH SỰ */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Award className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              1. Khuôn Mẫu Lịch Sự & Chuẩn Mực Doanh Nghiệp
            </h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Cấp Độ Lịch Sự Của AI</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'formal', label: 'Trang trọng chuẩn mực', desc: 'Dành cho văn kiện, tổ chức lớn' },
                { key: 'warm_polite', label: 'Ấm áp & Lịch thiệp', desc: 'Thân thiện, tôn trọng, tự nhiên (Khuyên dùng)' },
                { key: 'expert_respectful', label: 'Chuyên gia tận tâm', desc: 'Tập trung chuyên môn sâu & thấu cảm' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setConfig({ ...config, politenessLevel: item.key as any })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    config.politenessLevel === item.key
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                      : 'bg-neutral-50/70 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Lời Chào Mở Đầu Chuẩn Mực (Opening Greeting)
            </label>
            <textarea
              rows={2}
              value={config.openingGreeting}
              onChange={(e) => setConfig({ ...config, openingGreeting: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Lời Chúc & Lời Cảm Ơn Khi Kết Thúc (Closing Wish)
            </label>
            <textarea
              rows={2}
              value={config.closingWish}
              onChange={(e) => setConfig({ ...config, closingWish: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Quy Tắc Xử Lý Khi Khách Hàng Khiếu Nại / Bức Xúc (Complaint Etiquette)
            </label>
            <textarea
              rows={3}
              value={config.complaintEtiquette}
              onChange={(e) => setConfig({ ...config, complaintEtiquette: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              AI sẽ luôn tuân thủ nguyên tắc đồng cảm, không đổ lỗi, giải thích trên căn cứ điều khoản minh bạch.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Lời Từ Chối Lịch Sự Khi Câu Hỏi Nằm Ngoài Nghiệp Vụ (Out-of-Scope Response)
            </label>
            <textarea
              rows={2}
              value={config.outOfScopeResponse}
              onChange={(e) => setConfig({ ...config, outOfScopeResponse: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>
        </div>

        {/* SECTION 2: CÁCH NÓI CHUYỆN & CÁCH XƯNG HÔ */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              2. Cách Nói Chuyện, Cách Xưng Hô & Tông Giọng
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">AI Tự Xưng Là (AI Pronoun)</label>
              <input
                type="text"
                value={config.aiPronoun}
                onChange={(e) => setConfig({ ...config, aiPronoun: e.target.value })}
                placeholder="VD: Em, Tôi, Trợ lý Bảo Việt..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {['Em', 'Tôi', 'Trợ lý AI Bảo Việt', 'Chuyên viên'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setConfig({ ...config, aiPronoun: s })}
                    className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Gọi Khách Hàng Là (Customer Pronoun)
              </label>
              <input
                type="text"
                value={config.customerPronoun}
                onChange={(e) => setConfig({ ...config, customerPronoun: e.target.value })}
                placeholder="VD: Quý khách, Anh/Chị..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {['Quý khách', 'Anh/Chị', 'Quý đối tác', 'Bác/Cô/Chú'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setConfig({ ...config, customerPronoun: s })}
                    className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Tông Giọng Hội Thoại (Conversation Tone)</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'advisor', label: 'Cố vấn tin cậy (Advisor)', desc: 'Điềm tĩnh, am hiểu sâu, đưa ra lời khuyên khách quan' },
                { key: 'enthusiastic', label: 'Nhiệt tình & Niềm nở', desc: 'Tràn đầy năng lượng, tích cực, khuyến khích' },
                { key: 'professional', label: 'Chuyên nghiệp & Gãy gọn', desc: 'Đi thẳng trọng tâm, số liệu minh bạch, chuẩn xác' },
                { key: 'empathetic', label: 'Thấu cảm & Ân cần', desc: 'Lắng nghe nhu cầu, chăm sóc nhẹ nhàng, chu đáo' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setConfig({ ...config, conversationTone: item.key as any })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    config.conversationTone === item.key
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                      : 'bg-neutral-50/70 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Độ Dài Câu Trả Lời</label>
              <select
                value={config.responseLength}
                onChange={(e) => setConfig({ ...config, responseLength: e.target.value as any })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="concise">Ngắn gọn, súc tích (1-2 đoạn)</option>
                <option value="balanced">Cân đối, đầy đủ trọng tâm (Khuyên dùng)</option>
                <option value="detailed">Chi tiết, phân tích thấu đáo từng điều khoản</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Biểu Tượng Cảm Xúc (Emoji)</label>
              <select
                value={config.useEmoji}
                onChange={(e) => setConfig({ ...config, useEmoji: e.target.value as any })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="none">Không sử dụng Emoji (Tuyệt đối nghiêm túc)</option>
                <option value="subtle">Sử dụng tinh tế, vừa phải (Khuyên dùng)</option>
                <option value="lively">Sinh động, thân thiện</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.useBulletPoints}
                onChange={(e) => setConfig({ ...config, useBulletPoints: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-neutral-800">
                Ưu tiên trình bày quyền lợi & điều khoản bằng danh sách gạch đầu dòng (Dễ đọc trên điện thoại)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 3: KỊCH BẢN PHẢN HỒI THEO TÌNH HUỐNG (PLAYBOOKS) */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <Zap className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            3. Huấn Luyện Cách Phản Hồi Theo Tình Huống Cụ Thể (Playbooks)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span>Kịch Bản Khi Khách Hỏi Giá & Biểu Phí</span>
              <span className="text-[10px] text-neutral-400 font-normal">Quy tắc & ưu đãi</span>
            </label>
            <textarea
              rows={3}
              value={config.pricingPlaybook || ''}
              onChange={(e) => setConfig({ ...config, pricingPlaybook: e.target.value })}
              placeholder="Cách AI giải thích giá, so sánh các gói và mời để lại thông tin..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span>Kịch Bản Giải Thích Thủ Tục Bồi Thường & Cam Kết</span>
              <span className="text-[10px] text-neutral-400 font-normal">Minh bạch & an tâm</span>
            </label>
            <textarea
              rows={3}
              value={config.claimPlaybook || ''}
              onChange={(e) => setConfig({ ...config, claimPlaybook: e.target.value })}
              placeholder="Cách hướng dẫn thủ tục bồi thường, thời hạn chi trả và cam kết của Bảo Việt..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span>Kịch Bản Khi Khách Hàng Do Dự / Chưa Muốn Mua</span>
              <span className="text-[10px] text-neutral-400 font-normal">Thuyết phục khéo léo</span>
            </label>
            <textarea
              rows={3}
              value={config.hesitationPlaybook || ''}
              onChange={(e) => setConfig({ ...config, hesitationPlaybook: e.target.value })}
              placeholder="Cách đồng cảm, tôn trọng sự cân nhắc và nhắc lại 3 giá trị bảo vệ thiết thực..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span>Câu Dẫn Khéo Léo Mời Để Lại Số Điện Thoại (Lead Capture)</span>
              <span className="text-[10px] text-neutral-400 font-normal">Chuyển đổi khách hàng</span>
            </label>
            <textarea
              rows={3}
              value={config.leadCaptureTrigger || ''}
              onChange={(e) => setConfig({ ...config, leadCaptureTrigger: e.target.value })}
              placeholder="Câu nói tự nhiên để khách vui lòng chia sẻ SĐT nhận bảng báo phí chi tiết..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">
            Chỉ Thị Hành Vi Tùy Biến Bổ Sung (Custom Behavior Prompt)
          </label>
          <textarea
            rows={3}
            value={config.customBehaviorPrompt || ''}
            onChange={(e) => setConfig({ ...config, customBehaviorPrompt: e.target.value })}
            placeholder="Bạn có thể bổ sung bất kỳ quy tắc đặc thù nào khác (ví dụ: 'Khi khách hỏi về bảo hiểm xe điện VinFast, hãy lưu ý thêm về bảo hiểm pin và cứu hộ miễn phí 24/7...')"
            className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-neutral-50/50"
          />
        </div>
      </div>
    </div>
  );
};
