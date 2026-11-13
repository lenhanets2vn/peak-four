import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Trash2,
  Zap,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Server,
  Layers,
  Sparkles,
  Key,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { getAuthHeaders, authFetch } from '../../../services/api';
import {
  GeminiApiErrorRecord,
  ActiveQuotaExceededState,
  GeminiChatCacheEntry,
  GeminiHealthSummary,
} from '../../../types';

interface Props {
  role?: string;
  canEdit?: boolean;
}

export const AiHealthAndCacheDashboard: React.FC<Props> = ({ role, canEdit = true }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<GeminiHealthSummary | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | '503' | '404' | '429' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHealthSummary = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await authFetch('/api/ai/health-summary', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.health) {
        setHealthData(data.health);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu sức khỏe AI:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthSummary();
    const interval = setInterval(() => fetchHealthSummary(false), 20000);
    return () => clearInterval(interval);
  }, []);

  const handleClearErrorLogs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử lỗi gọi API?')) return;
    setActionLoading('clearLogs');
    try {
      const res = await authFetch('/api/ai/clear-error-logs', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: 'Đã xóa toàn bộ lịch sử lỗi API.', type: 'success' });
        await fetchHealthSummary();
      } else {
        setActionNotice({ text: data.error || 'Xóa thất bại', type: 'error' });
      }
    } catch (err: any) {
      setActionNotice({ text: err?.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetQuotaAlert = async () => {
    setActionLoading('resetQuota');
    try {
      const res = await authFetch('/api/ai/reset-quota-alert', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: 'Đã thiết lập lại cảnh báo giới hạn Quota.', type: 'success' });
        await fetchHealthSummary();
      } else {
        setActionNotice({ text: data.error || 'Thiết lập lại thất bại', type: 'error' });
      }
    } catch (err: any) {
      setActionNotice({ text: err?.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearChatCache = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bộ nhớ đệm (Cache) chat từ Redis / RAM? Các câu hỏi sau sẽ gọi API trực tiếp để lấy câu trả lời mới nhất.')) return;
    setActionLoading('clearCache');
    try {
      const res = await authFetch('/api/ai/clear-chat-cache', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({ text: 'Đã xóa bộ nhớ đệm (Cache) phản hồi chat thành công.', type: 'success' });
        await fetchHealthSummary();
      } else {
        setActionNotice({ text: data.error || 'Xóa cache thất bại', type: 'error' });
      }
    } catch (err: any) {
      setActionNotice({ text: err?.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const errorLogs = healthData?.errorLogs || [];
  const quotaState = healthData?.quotaState;
  const cacheStats = healthData?.cacheStats;
  const apiKeyInfo = healthData?.apiKeyInfo;

  const filteredLogs = errorLogs.filter((log) => {
    const codeStr = String(log.statusCode);
    const matchesFilter =
      errorFilter === 'all'
        ? true
        : errorFilter === '503'
        ? codeStr === '503' || log.errorType === 'HIGH_DEMAND_503'
        : errorFilter === '404'
        ? codeStr === '404' || log.errorType === 'NOT_FOUND_404'
        : errorFilter === '429'
        ? codeStr === '429' || log.errorType === 'QUOTA_EXCEEDED_429'
        : codeStr !== '503' && codeStr !== '404' && codeStr !== '429';

    const matchesSearch =
      !searchQuery ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.queryPreview && log.queryPreview.toLowerCase().includes(searchQuery.toLowerCase())) ||
      codeStr.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  const count503 = errorLogs.filter((l) => String(l.statusCode) === '503' || l.errorType === 'HIGH_DEMAND_503').length;
  const count404 = errorLogs.filter((l) => String(l.statusCode) === '404' || l.errorType === 'NOT_FOUND_404').length;
  const count429 = errorLogs.filter((l) => String(l.statusCode) === '429' || l.errorType === 'QUOTA_EXCEEDED_429').length;
  const countRecovered = errorLogs.filter((l) => l.recoveredViaFallback).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-600">Đang kiểm tra tình trạng sức khỏe Gemini API & Cache...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ACTION NOTICES */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. CRITICAL QUOTA EXCEEDED ALERT (IF ACTIVE) */}
      {quotaState?.active && (
        <div className="bg-rose-50 border-2 border-rose-400 p-5 rounded-2xl shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-rose-900">CẢNH BÁO: GEMINI API KEY ĐẠT GIỚI HẠN QUOTA (429)</h3>
                  <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
                    HTTP 429 RESOURCE_EXHAUSTED
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Google Gemini API đã từ chối yêu cầu do tài khoản hoặc khóa API hiện tại đã sử dụng hết hạn mức (RPM/RPD/Token Quota).
                </p>
                <div className="text-[11px] text-rose-700 bg-rose-100/70 p-2.5 rounded-lg border border-rose-200 font-mono mt-1">
                  Mô hình ghi nhận: <strong>{quotaState.model || 'Tất cả'}</strong> | Thời điểm phát hiện: <strong>{new Date(quotaState.detectedAt || '').toLocaleString('vi-VN')}</strong>
                  {quotaState.message && <div className="mt-1 line-clamp-2">{quotaState.message}</div>}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleResetQuotaAlert}
                  disabled={actionLoading === 'resetQuota'}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === 'resetQuota' ? 'animate-spin' : ''}`} />
                  <span>Xác Nhận Đã Đổi Key / Reset Cảnh Báo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. OVERVIEW KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: API Key Status */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Khóa API Gemini</span>
            <Key className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                apiKeyInfo?.configured
                  ? quotaState?.active
                    ? 'bg-rose-500 animate-ping'
                    : 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-base font-bold text-neutral-900">
              {apiKeyInfo?.configured ? (quotaState?.active ? 'Chạm Hạn Mức Quota' : 'Khả Dụng & Sẵn Sàng') : 'Chưa Cấu Hình'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono">
            {apiKeyInfo?.configured ? 'Đã cấu hình tại backend' : 'Chưa cấu hình'} (Nguồn: {apiKeyInfo?.source || 'none'})
          </p>
        </div>

        {/* Card 2: 503 & 404 Error Count */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Lỗi 503 & 404 Đã Ghi</span>
            <Server className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-neutral-900">{count503 + count404}</span>
            <span className="text-xs text-neutral-500">
              (503: <strong>{count503}</strong> | 404: <strong>{count404}</strong>)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã tự động cứu cánh qua fallback: <strong>{countRecovered}</strong> lần</span>
          </p>
        </div>

        {/* Card 3: Redis Chat Cache Hits */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bộ nhớ đệm Redis / RAM</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{cacheStats?.totalHits || 0}</span>
            <span className="text-xs text-neutral-500">lần truy xuất (Hits)</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Lưu trữ: <strong>{cacheStats?.totalEntries || 0}</strong> câu hỏi | Tiết kiệm: <strong>{cacheStats?.savedApiCalls || 0}</strong> lượt gọi API
          </p>
        </div>

        {/* Card 4: Model In Action */}
        <div className="bg-white p-4.5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Mô Hình Đang Phục Vụ</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-neutral-900 truncate">
              Chính: <span className="text-blue-600">{healthData?.activeModel || 'gemini-3.8-flash'}</span>
            </div>
            <div className="text-xs text-neutral-500 truncate">
              Dự phòng: <span className="text-neutral-700">{healthData?.fallbackModel || 'gemini-3.1-flash-lite'}</span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400">
            Hỗ trợ tự động chuyển model khi 503
          </div>
        </div>
      </div>

      {/* 3. REDIS CHAT CACHE SECTION */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-neutral-900">Bộ Nhớ Đệm Phản Hồi Gemini Trên Redis (Chat Caching)</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full">
                Redis V2
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tự động lưu các câu trả lời đủ điều kiện trên Redis theo TTL riêng 24 giờ và nhận diện câu hỏi trùng lặp hoặc tương tự ngữ nghĩa (từ 88% trở lên), giúp giảm lượt gọi Gemini và token. Cache được vô hiệu hóa khi Knowledge, Taxonomy hoặc cấu hình AI thay đổi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchHealthSummary(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200/70 transition-all cursor-pointer"
              title="Làm mới trạng thái"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {canEdit && (cacheStats?.totalEntries || 0) > 0 && (
              <button
                type="button"
                onClick={handleClearChatCache}
                disabled={actionLoading === 'clearCache'}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Bộ Nhớ Cache</span>
              </button>
            )}
          </div>
        </div>

        {/* Cache Entries List */}
        {(!cacheStats?.entries || cacheStats.entries.length === 0) ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Chưa có mục nào được lưu trong bộ nhớ đệm. Khi khách hàng trò chuyện, các câu trả lời chuẩn xác sẽ tự động được ghi cache.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
            {cacheStats.entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-3.5 sm:px-5 hover:bg-neutral-50/60 transition-colors space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 shrink-0">
                      {entry.product || 'Chung'}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      "{entry.rawQuery}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Đã phục vụ: {entry.hitCount} lượt
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(entry.lastAccessedAt || entry.createdAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 line-clamp-1 italic">
                  "{entry.reply}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. API ERROR HISTORY SECTION (503 / 404 / 429) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden space-y-4">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-neutral-900">Lịch Sử Gọi API Lỗi & Giám Sát Sức Khỏe (503 / 404 / 429)</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                  {errorLogs.length} lỗi ghi nhận
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Theo dõi chi tiết các lần Google phản hồi 503 (High Demand), 404 (Không tìm thấy model) hoặc 429 (Hết hạn mức Quota) để kịp thời đổi key hoặc tinh chỉnh model.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canEdit && errorLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearErrorLogs}
                  disabled={actionLoading === 'clearLogs'}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 border border-neutral-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Lịch Sử Lỗi</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setErrorFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  errorFilter === 'all'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Tất cả ({errorLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setErrorFilter('503')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  errorFilter === '503'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                503 Quá tải ({count503})
              </button>
              <button
                type="button"
                onClick={() => setErrorFilter('429')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  errorFilter === '429'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                429 Quota Exceeded ({count429})
              </button>
              <button
                type="button"
                onClick={() => setErrorFilter('404')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  errorFilter === '404'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                404 Not Found ({count404})
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo model, câu hỏi, mã lỗi..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Logs Table / Cards */}
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-neutral-900">
              {errorLogs.length === 0
                ? 'Không có lỗi nào được ghi nhận!'
                : 'Không tìm thấy lỗi khớp với bộ lọc hiện tại.'}
            </div>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Hệ thống kết nối Gemini API hoạt động ổn định. Bộ định tuyến tự động chuyển đổi mô hình (Resilience Router) và Cache Redis đang bảo vệ lưu lượng mượt mà.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto px-4 pb-4">
            {filteredLogs.map((log) => {
              const is503 = String(log.statusCode) === '503';
              const is429 = String(log.statusCode) === '429';
              const is404 = String(log.statusCode) === '404';
              const isExpanded = expandedLogId === log.id;

              return (
                <div key={log.id} className="py-3 hover:bg-neutral-50/60 rounded-xl px-2.5 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide border ${
                          is429
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : is503
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : is404
                            ? 'bg-orange-50 text-orange-700 border-orange-300'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                        }`}
                      >
                        HTTP {log.statusCode}
                      </span>

                      <span className="text-xs font-bold text-neutral-900 font-mono">
                        {log.model}
                      </span>

                      <span className="text-[11px] text-neutral-400">
                        {log.endpoint}
                      </span>

                      {log.recoveredViaFallback && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã tự hồi phục qua {log.fallbackModelUsed || 'model phụ'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 self-end sm:self-auto">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-neutral-500 hover:text-neutral-900 p-0.5 cursor-pointer ml-1"
                        title="Xem chi tiết"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {log.queryPreview && (
                    <div className="text-xs text-neutral-700 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100">
                      <span className="text-neutral-400 font-medium">Câu hỏi khách hàng: </span>
                      <span className="font-semibold text-neutral-900">"{log.queryPreview}"</span>
                    </div>
                  )}

                  {/* Expandable error message */}
                  <div
                    className={`text-xs text-neutral-600 font-mono bg-neutral-950 text-neutral-200 p-2.5 rounded-xl border border-neutral-800 overflow-x-auto transition-all ${
                      isExpanded ? 'max-h-96' : 'line-clamp-2'
                    }`}
                  >
                    {log.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
