import React, { useState, useEffect, useRef } from 'react';
import { getAuthHeaders, authFetch } from '../../services/api';
import { subscribeToChatSessionRealtime } from '../../services/firebaseRealtime';
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  Search,
  RefreshCw,
  Send,
  Shield,
  Phone,
  Tag,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Power,
  Zap,
  UserCheck,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ChatSession, ChatMessage, AdminRole } from '../../types';

interface Props {
  role?: AdminRole;
  currentStaffName?: string;
  canTakeover?: boolean;
}

export const ChatHistoryManager: React.FC<Props> = ({
  role = 'superadmin',
  currentStaffName = 'Chuyên viên Tư vấn',
  canTakeover = true,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting_staff' | 'staff_takeover' | 'ai_active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const loadSessions = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await authFetch('/api/ai/chat/sessions', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Không thể tải lịch sử chat.');
      const data: ChatSession[] = await res.json();
      setSessions(data);

      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) setNotice({ text: err.message || 'Lỗi tải phiên chat', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSingleSession = async (id: string) => {
    try {
      const res = await authFetch(`/api/ai/chat/sessions/${id}`, { headers: getAuthHeaders(), cache: 'no-store' });
      if (!res.ok) return;
      const data: ChatSession = await res.json();
      setSelectedSession(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Session list is an API read; only the currently opened conversation gets
    // a realtime Firestore listener. This keeps the listener count bounded.
    void loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    void loadSingleSession(selectedSessionId);
    const unsubscribe = subscribeToChatSessionRealtime(
      selectedSessionId,
      (nextSession) => {
        setSelectedSession((current) => ({
          ...(current || {}),
          ...nextSession,
          id: nextSession.id || selectedSessionId,
        } as ChatSession));
        // Keep the list badges/status in sync without subscribing to the whole collection.
        setSessions((current) => current.map((item) => item.id === selectedSessionId ? ({ ...item, ...nextSession } as ChatSession) : item));
      },
      (error) => console.debug('[Chat realtime] listener unavailable:', error?.message || error),
    );
    return () => unsubscribe();
  }, [selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadSingleSession(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Smart scroll for CMS history: polling must never drag an admin back to the
  // bottom while they are reading older messages.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom <= 80;
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedSessionId]);

  useEffect(() => {
    const count = selectedSession?.messages?.length || 0;
    if (!selectedSession) {
      previousMessageCountRef.current = 0;
      return;
    }
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = count;
    if (previousCount === 0) {
      requestAnimationFrame(() => scrollToBottom('auto'));
      return;
    }
    if (count > previousCount && isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [selectedSession?.id, selectedSession?.messages?.length]);

  // Handle 15s auto-resume countdown
  useEffect(() => {
    if (!selectedSession || !selectedSession.aiResumeTimeoutAt || !selectedSession.aiDropped) {
      setCountdownSeconds(null);
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((selectedSession.aiResumeTimeoutAt! - Date.now()) / 1000));
      setCountdownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        // Call backend timeout trigger
        authFetch(`/api/ai/chat/sessions/${selectedSession.id}/trigger-ai-timeout`, { method: 'POST', headers: getAuthHeaders() })
          .then((r) => r.json())
          .then(() => {
            loadSingleSession(selectedSession.id);
            loadSessions(true);
          })
          .catch(console.error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedSession?.aiResumeTimeoutAt, selectedSession?.aiDropped]);

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const res = await authFetch(`/api/ai/chat/sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: replyText.trim(),
          senderName: currentStaffName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể gửi tin nhắn.');

      setReplyText('');
      setSelectedSession(data.session);
      loadSessions(true);
      setNotice({ text: 'Đã gửi phản hồi và tiếp quản phiên chat.', type: 'success' });
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice({ text: err.message || 'Lỗi gửi tin nhắn', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleToggleAi = async (dropState: boolean) => {
    if (!selectedSessionId) return;
    try {
      const res = await authFetch(`/api/ai/chat/sessions/${selectedSessionId}/toggle-ai`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ aiDropped: dropState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật trạng thái AI');
      setSelectedSession(data.session);
      loadSessions(true);
      setNotice({
        text: dropState ? 'Đã ngắt Trợ lý AI. Chuyên viên đang tiếp quản.' : 'Đã kích hoạt lại Trợ lý AI.',
        type: 'success',
      });
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice({ text: err.message || 'Không thể đổi trạng thái AI', type: 'error' });
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Xóa phiên chat này khỏi hệ thống?')) return;
    try {
      const res = await authFetch(`/api/ai/chat/sessions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Không thể xóa phiên chat.');
      setNotice({ text: 'Đã xóa phiên chat.', type: 'success' });
      setTimeout(() => setNotice(null), 3000);
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setSelectedSession(null);
      }
      loadSessions();
    } catch (err: any) {
      setNotice({ text: err.message || 'Lỗi xóa phiên chat', type: 'error' });
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inName = s.customerName?.toLowerCase().includes(q) || false;
      const inPhone = s.customerPhone?.includes(q) || false;
      const inProduct = s.currentProduct?.toLowerCase().includes(q) || false;
      const inMessages = s.messages.some((m) => m.text.toLowerCase().includes(q));
      return inName || inPhone || inProduct || inMessages;
    }
    return true;
  });

  const waitingCount = sessions.filter((s) => s.status === 'waiting_staff').length;

  return (
    <div className="space-y-4">
      {/* Header Notification */}
      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* Left Column: Sessions List (4 cols) */}
        <div className="lg:col-span-4 border-r border-neutral-200 flex flex-col bg-neutral-50/40">
          {/* Top Bar of List */}
          <div className="p-4 border-b border-neutral-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-neutral-900">Khách Hàng Chat AI</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {waitingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {waitingCount} cần hỗ trợ
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => loadSessions(true)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100/70 border border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Tất cả ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('waiting_staff')}
                className={`px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'waiting_staff' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Chờ NV ({waitingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('staff_takeover')}
                className={`px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'staff_takeover' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                NV tiếp quản
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ai_active')}
                className={`px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'ai_active' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                AI đang chat
              </button>
            </div>
          </div>

          {/* Sessions Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-[580px]">
            {loading && sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">Đang tải lịch sử trò chuyện...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">Chưa có phiên chat nào phù hợp.</div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = s.id === selectedSessionId;
                const lastMsg = s.messages[s.messages.length - 1];
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3.5 transition-colors cursor-pointer text-left relative ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-white bg-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-neutral-900 truncate">
                          {s.customerName || (s.customerPhone ? `Khách (${s.customerPhone})` : 'Khách vãng lai')}
                        </span>
                        {s.unreadByStaff && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      {s.status === 'waiting_staff' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          ⏳ Cần NV phản hồi
                        </span>
                      )}
                      {s.status === 'staff_takeover' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          👤 NV tiếp quản
                        </span>
                      )}
                      {s.status === 'ai_active' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                          🤖 AI tự động
                        </span>
                      )}
                      {s.currentProduct && (
                        <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[120px]">
                          · {s.currentProduct}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-500 line-clamp-1">
                      {lastMsg ? (
                        <>
                          <span className="font-medium text-neutral-700">
                            {lastMsg.role === 'user' ? 'Khách: ' : lastMsg.role === 'staff' ? 'NV: ' : 'AI: '}
                          </span>
                          {lastMsg.text}
                        </>
                      ) : (
                        'Chưa có tin nhắn'
                      )}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Conversation Details (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white">
          {selectedSession ? (
            <>
              {/* Header Bar */}
              <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-neutral-900">
                      {selectedSession.customerName || 'Khách hàng tư vấn Landing Page'}
                    </h4>
                    {selectedSession.customerPhone && (
                      <a
                        href={`tel:${selectedSession.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold hover:bg-blue-100"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedSession.customerPhone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                    <span>Sản phẩm: <strong className="text-neutral-700">{selectedSession.currentProduct || 'Chung'}</strong></span>
                    <span>·</span>
                    <span>Trang: <strong className="text-neutral-700">{selectedSession.pageTitle || '/'}</strong></span>
                  </div>
                </div>

                {/* Takeover Actions */}
                <div className="flex items-center gap-2">
                  {selectedSession.aiDropped ? (
                    <button
                      type="button"
                      onClick={() => handleToggleAi(false)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Bật lại AI tự động trả lời"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Bật Lại AI</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleAi(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Tạm ngắt AI để nhân viên trực tiếp chat"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Ngắt AI (Tiếp Quản)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Xóa phiên trò chuyện"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 15-Second Timeout Live Banner */}
              {selectedSession.aiDropped && countdownSeconds !== null && countdownSeconds > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Chuyên viên đang tiếp quản. Nếu sau <strong>{countdownSeconds}s</strong> chưa có nhân viên hoạt động/phản hồi, <strong>Trợ lý AI sẽ tự động tiếp tục giải đáp</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      authFetch(`/api/ai/chat/sessions/${selectedSession.id}/trigger-ai-timeout`, { method: 'POST', headers: getAuthHeaders() })
                        .then(() => loadSingleSession(selectedSession.id));
                    }}
                    className="underline text-amber-800 hover:text-amber-950 font-bold ml-2 shrink-0 cursor-pointer"
                  >
                    AI trả lời ngay
                  </button>
                </div>
              )}

              {/* Messages Container */}
              <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[460px] bg-neutral-50/20">
                {selectedSession.messages.map((m) => {
                  const isCustomer = m.role === 'user';
                  const isStaff = m.role === 'staff';
                  const isAi = m.role === 'model';

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 max-w-[85%] ${
                        isCustomer ? 'mr-auto' : isStaff ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isCustomer
                            ? 'bg-neutral-200 text-neutral-700'
                            : isStaff
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isCustomer ? <User className="w-3.5 h-3.5" /> : isStaff ? <UserCheck className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-1.5 text-[10px] text-neutral-400 ${isStaff ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-bold text-neutral-600">
                            {isCustomer ? (selectedSession.customerName || 'Khách hàng') : isStaff ? (m.senderName || 'Chuyên viên tư vấn') : 'Trợ lý AI Bảo Việt'}
                          </span>
                          <span>·</span>
                          <span>{m.timestamp}</span>
                        </div>

                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isCustomer
                              ? 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-xs shadow-xs'
                              : isStaff
                              ? 'bg-emerald-700 text-white rounded-tr-xs shadow-xs'
                              : 'bg-blue-50 border border-blue-100 text-blue-950 rounded-tl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          {m.sources && m.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-blue-100/70 text-[10px] text-blue-700">
                              <span className="font-bold">Trích nguồn tri thức:</span> {m.sources.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Reply Presets */}
              <div className="px-4 py-2 border-t border-neutral-100 bg-white flex items-center gap-2 overflow-x-auto text-[11px]">
                <span className="text-neutral-400 font-bold whitespace-nowrap text-[10px]">Phản hồi nhanh:</span>
                <button
                  type="button"
                  onClick={() => setReplyText('Dạ Bảo Việt xin chào Quý khách! Em là chuyên viên tư vấn hỗ trợ trực tiếp ạ.')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 whitespace-nowrap font-medium transition-colors"
                >
                  👋 Lời chào chuyên viên
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText('Dạ Quý khách cho em xin số điện thoại để em gửi bảng minh họa quyền lợi chi tiết qua Zalo nhé ạ!')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 whitespace-nowrap font-medium transition-colors"
                >
                  📲 Xin SĐT gửi bảng phí
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText('Dạ quyền lợi này bên em bồi thường trực tiếp trong 24h và bảo lãnh viện phí tại hơn 300 bệnh viện quốc tế ạ.')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 whitespace-nowrap font-medium transition-colors"
                >
                  🏥 Cam kết bồi thường 24h
                </button>
              </div>

              {/* Staff Input Area */}
              <form onSubmit={handleSendStaffReply} className="p-3.5 border-t border-neutral-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn tư vấn gửi khách hàng... (Enter để gửi)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-neutral-50/50 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <MessageSquare className="w-12 h-12 stroke-1 mb-3 text-neutral-300" />
              <h4 className="font-bold text-sm text-neutral-700">Chọn một phiên chat bên trái</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Xem toàn bộ lịch sử tư vấn giữa khách hàng và Trợ lý AI, hỗ trợ nhân viên can thiệp trả lời trực tiếp bất kỳ lúc nào.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
