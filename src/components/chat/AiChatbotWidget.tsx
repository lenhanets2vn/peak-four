import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Globe,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  Clock,
  Headphones,
  UserCheck,
} from 'lucide-react';
import { ChatMessage, KnowledgeItem, AiChatbotConfig } from '../../types';
import { loadGoogleFont } from '../../utils/fontPresets';
import { PageMascot } from './PageMascot';
import { mascotBubbleStyle, mascotId, mascotLabel, mascotSheets } from '../../utils/mascotCatalog';
import { allowedMascots, resolveVisitMascot, storeVisitMascot, visitorSessionStorage } from '../../utils/mascotVisit';
import { chatbotBadgeTextShadow, chatbotMascotSize, chatbotSideMargin } from '../../utils/chatbotLauncherStyle';

interface Props {
  config?: AiChatbotConfig;
  pageTitle?: string;
  brandName?: string;
  hotline?: string;
  previewMode?: boolean;
}

export const AiChatbotWidget: React.FC<Props> = ({
  config,
  pageTitle = 'Landing Page thương hiệu của bạn',
  brandName = 'Trang web',
  hotline = '1900 55 88 99',
  previewMode = false,
}) => {
  if (config?.enabled === false) {
    return null;
  }

  const botName = config?.botName || 'Trợ lý AI thương hiệu của bạn';
  const useMascot = config?.launcherVisual === 'mascot';
  const mascotPool = allowedMascots(config);
  const poolKey = mascotPool.join(',');
  const [selectedMascot, setSelectedMascot] = useState(() => previewMode || typeof window === 'undefined'
    ? mascotId(config?.mascotId) : resolveVisitMascot(config, visitorSessionStorage()));
  const [mascotPickerOpen, setMascotPickerOpen] = useState(false);
  const canChangeMascot = useMascot && config?.mascotAllowVisitorChange !== false && mascotPool.length > 1;
  useEffect(() => {
    setMascotPickerOpen(false);
    setSelectedMascot(previewMode ? mascotId(config?.mascotId) : resolveVisitMascot(config, visitorSessionStorage()));
  }, [useMascot, config?.mascotId, config?.mascotRandomPerVisit, config?.mascotAllowVisitorChange, poolKey, previewMode]);
  const mascotSize = chatbotMascotSize(config);
  const botSubtitle = config?.botSubtitle || 'Hỗ trợ thông tin 24/7';
  const primaryColor = config?.primaryColor || '#005baa';
  const headerStart = config?.headerGradientStart || primaryColor;
  const headerEnd = config?.headerGradientEnd || '#003e75';
  const isLeft = config?.floatingPosition === 'bottom-left';
  const marginBottom = config?.floatingMarginBottom ?? 20;
  const marginSide = chatbotSideMargin(config);
  const chatWindowBottom = marginBottom + (useMascot ? mascotSize + 16 : 65) + (canChangeMascot ? 40 : 0);
  const windowWidth = config?.chatWindowWidth ?? 420;
  const windowHeight = config?.chatWindowHeight ?? 580;
  const botBubbleBg = config?.botBubbleBgColor || '#ffffff';
  const botBubbleText = config?.botBubbleTextColor || '#1e293b';
  const userBubbleBg = config?.userBubbleBgColor || primaryColor;
  const userBubbleText = config?.userBubbleTextColor || '#ffffff';
  const configuredHotline = (config?.supportPhone || hotline || '1900 55 88 99').trim();

  const defaultWelcome = config?.welcomeMessage || `Xin chào Quý khách! Tôi là **${botName}**. Quý khách có thể hỏi về nội dung, sản phẩm hoặc dịch vụ đã được đăng tải trên website.`;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: defaultWelcome,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // A page reload starts a fresh customer-facing conversation. The server/CMS keeps
  // the previous flow for history, but the visitor UI must not restore it after F5.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiDropped, setAiDropped] = useState(false);
  const [waitingForStaff, setWaitingForStaff] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(config?.suggestedQuestions || []);
  const [productOptions, setProductOptions] = useState<Array<{id:string;name:string}>>([]);
  const [taxonomyProducts, setTaxonomyProducts] = useState<any[]>([]);
  // Product flow is session-scoped. Empty means no product has been confirmed by the customer.
  const [activeChatProduct, setActiveChatProduct] = useState('');
  const [productSwitcherOpen, setProductSwitcherOpen] = useState(false);
  const [productSwitcherQuery, setProductSwitcherQuery] = useState('');

  // Voice Recognition (STT)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Audio Playback (TTS)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // In-chat Lead Form state
  const [showLeadCard, setShowLeadCard] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);

  // Load Google Font for Chatbot if configured
  useEffect(() => {
    if (config?.fontFamily) {
      loadGoogleFont(config.fontFamily);
    }
  }, [config?.fontFamily]);

  // Track whether the visitor is reading near the latest message.
  // If they scroll up, never force them back to the bottom.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom <= 80;
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  // Only scroll for new content when the visitor is already near the bottom.
  // This preserves their position when they intentionally scroll up to read older messages.
  useEffect(() => {
    if (!isOpen) {
      hasInitializedScrollRef.current = false;
      return;
    }

    if (!hasInitializedScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        isNearBottomRef.current = true;
        hasInitializedScrollRef.current = true;
      });
      return;
    }

    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
  }, [messages.length, isOpen]);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Fetch initial suggested questions based on current product
  useEffect(() => {
    const loadQuickQuestions = async () => {
      try {
        const res = await fetch(`/api/ai/suggest-questions?product=${encodeURIComponent(activeChatProduct)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuickReplies(data.questions.slice(0, 4));
        } else {
          setQuickReplies([
            'Biểu phí và ưu đãi mới nhất',
            'Thông tin sản phẩm và dịch vụ',
            'Thời gian chờ và điểm loại trừ',
            'Thủ tục hồ sơ bồi thường cần gì?',
          ]);
        }
      } catch {
        setQuickReplies([
          'Biểu phí và ưu đãi mới nhất',
          'Thông tin sản phẩm và dịch vụ',
          'Thời gian chờ và điểm loại trừ',
        ]);
      }
    };
    loadQuickQuestions();
  }, [activeChatProduct]);

  // Keep the public widget synchronized with the server-side chat session so staff takeover
  // messages and AI resume state are actually visible to the customer.
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;
    const syncSession = async () => {
      try {
        const res = await fetch(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}/sync?_ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) {if([403,404].includes(res.status) && !cancelled)setSessionId(null);return;}
        const data = await res.json();
        if (cancelled || !data.success) return;

        setAiDropped(!!data.aiDropped);
        setWaitingForStaff(data.status === 'waiting_staff');

        if (Array.isArray(data.messages)) {
          setMessages((current) => {
            // IMPORTANT: never re-sort messages during polling. Local optimistic messages can
            // exist for a moment without the same server timestamp/id. Sorting the merged list
            // made an already rendered customer question jump above/below older messages.
            // Keep the visual order immutable and only append genuinely new server messages.
            const next = [...current];
            const idIndex = new Map(next.map((m, index) => [m.id, index]));
            const signature = (m: ChatMessage) => `${m.role}|${String(m.text || '').trim()}`;
            const signatures = new Set(next.map(signature));

            for (const msg of data.messages as ChatMessage[]) {
              const existingIndex = idIndex.get(msg.id);
              if (existingIndex !== undefined) {
                // Update server metadata/content in place without changing the bubble position.
                next[existingIndex] = { ...next[existingIndex], ...msg };
                signatures.add(signature(next[existingIndex]));
                continue;
              }
              // The server may assign a different id to the optimistic user/bot message.
              // Do not append a duplicate with identical role+text, because that also causes
              // apparent reordering/flicker when the 2.5s sync arrives.
              const sig = signature(msg);
              if (signatures.has(sig)) continue;
              idIndex.set(msg.id, next.length);
              signatures.add(sig);
              next.push(msg);
            }
            return next;
          });
        }

        if (data.aiResumeTimeoutAt && Number(data.aiResumeTimeoutAt) <= Date.now()) {
          const resumeRes = await fetch(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}/trigger-ai-timeout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (resumeRes.ok && !cancelled) {
            const resumeData = await resumeRes.json();
            if (resumeData?.success) {
              setAiDropped(false);
              setWaitingForStaff(false);
            }
          }
        }
      } catch {
        // A transient sync failure must not interrupt the customer's chat.
      }
    };

    syncSession();
    const timer = window.setInterval(syncSession, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, sessionId]);

  useEffect(() => {
    fetch('/api/ai/taxonomy').then(r => r.ok ? r.json() : null).then(d => d?.products && setTaxonomyProducts(d.products)).catch(() => {});
  }, []);

  // Intentionally do not persist chat session/message state in localStorage/sessionStorage.
  // sessionId lives only for this mounted page flow; CMS persistence is server-side.

  // Voice toggle
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Speech start error:', err);
      }
    }
  };

  // Play Speech (TTS)
  const handlePlayTTS = async (messageId: string, text: string) => {
    if (playingAudioId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      }
      return;
    }

    try {
      setPlayingAudioId(messageId);
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.onerror = () => setPlayingAudioId(null);
        await audio.play();
      } else {
        // Fallback to browser SpeechSynthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.slice(0, 250));
          utterance.lang = 'vi-VN';
          utterance.onend = () => setPlayingAudioId(null);
          utterance.onerror = () => setPlayingAudioId(null);
          window.speechSynthesis.speak(utterance);
        } else {
          setPlayingAudioId(null);
        }
      }
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingAudioId(null);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, options?: { selectedProductId?: string }) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.role === 'model' ? ('model' as const) : ('user' as const),
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          sessionId: sessionId || undefined,
          selectedProductId: options?.selectedProductId || undefined,
          customerName: leadName.trim() || undefined,
          customerPhone: leadPhone.trim() || undefined,
          productFilter: activeChatProduct || undefined,
          useSearchGrounding: config?.enableGoogleSearch !== false && useSearchGrounding,
          pageContext: {
            pageTitle,
            currentProduct: activeChatProduct || '',
            brandName,
            phone: configuredHotline,
            clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
          },
          trainingConfig: config?.training,
          botName,
        }),
      });

      const data = await res.json();
      if(res.status===403)setSessionId(null);
      if (data.success) {
        if (data.sessionId) setSessionId(data.sessionId)
        // `currentProduct: null` is meaningful: the server may have switched from
        // a deep product flow to a category-selection flow. Clear stale UI state
        // so typed category answers and suggestion clicks render identically.
        if (Object.prototype.hasOwnProperty.call(data, 'currentProduct')) {
          setActiveChatProduct(data.currentProduct ? String(data.currentProduct) : '');
        }
        if (Array.isArray(data.productOptions)) setProductOptions(data.productOptions);
        else if (data.currentProduct) setProductOptions([]);
        setAiDropped(!!data.aiDropped);
        setWaitingForStaff(!!data.waitingForStaff || data.sessionStatus === 'waiting_staff');

        const botMsg: ChatMessage = {
          id: data.messageId ? String(data.messageId) : `msg_${Date.now()}_bot`,
          role: 'model',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Number(data.messageCreatedAt || Date.now()),
        };
        setMessages((prev) => {
          // The session-sync request can race the direct POST response. If sync
          // already appended this canonical server message, update it in place
          // instead of adding a visually duplicated AI bubble.
          const byId = prev.findIndex((m) => m.id === botMsg.id);
          if (byId >= 0) {
            const next = [...prev];
            next[byId] = { ...next[byId], ...botMsg };
            return next;
          }
          return [...prev, botMsg];
        });

        // An empty array is also authoritative. Clear stale suggestions from the
        // previous topic so a product/category switch cannot keep showing pricing
        // chips that no longer belong to the current flow.
        if (Array.isArray(data.quickReplies)) {
          setQuickReplies(data.quickReplies);
        }

        // Check if lead was captured automatically
        if (data.capturedLead) {
          setLeadSubmitted(true);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}_error`,
            role: 'model',
            text: data.error || `Dạ hiện hệ thống tư vấn AI đang bận. Quý khách vui lòng gọi Hotline ${configuredHotline} để được hỗ trợ nhanh nhất ạ.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          role: 'model',
          text: 'Không thể kết nối đến máy chủ AI. Quý khách vui lòng thử lại sau giây lát.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSwitch = (product: { id: string; name: string }) => {
    if (!product?.name || loading || product.name === activeChatProduct) return;
    // Reuse the exact same canonical path as a taxonomy suggestion click: the
    // canonical product name is sent as the next customer turn, allowing the
    // server orchestrator to reset stale component/intent context and switch the
    // authoritative product flow. Do not mutate activeChatProduct optimistically;
    // wait for the server response so the banner can never drift from session state.
    setProductSwitcherOpen(false);
    setProductSwitcherQuery('');
    void handleSendMessage(product.name, { selectedProductId: product.id });
  };

  // Submit lead from chat card
  const handleQuickLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadPhone.trim() || leadSubmitting) return;

    setLeadSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName.trim() || 'Khách hàng tư vấn AI Chatbot',
          phone: leadPhone.trim(),
          tracking: {
            utmSource: 'ai_chatbot',
            page: pageTitle,
            product: activeChatProduct,
            formId: 'ai_chatbot',
          },
          customResponses: {
            interestedProduct: activeChatProduct,
            notes: 'Khách hàng để lại thông tin qua Form Chatbot AI trên Landing Page',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeadSubmitted(true);
        setShowLeadCard(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_lead_ack_${Date.now()}`,
            role: 'model',
            text: `Dạ em đã ghi nhận thông tin của Quý khách (**${leadName || 'Quý khách'}** - SĐT: **${leadPhone}**). Chuyên viên tư vấn thương hiệu của bạn phụ trách gói **${activeChatProduct || 'sản phẩm Quý khách quan tâm'}** sẽ liên hệ hỗ trợ trong ít phút tới ạ!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        alert(data.error || 'Không thể gửi thông tin.');
      }
    } catch (err) {
      alert('Lỗi khi gửi thông tin liên hệ.');
    } finally {
      setLeadSubmitting(false);
    }
  };

  const renderAvatarIcon = (sizeClass = 'w-5 h-5') => {
    if (config?.customAvatarUrl) {
      return (
        <img
          src={config.customAvatarUrl}
          alt={botName}
          className={`${sizeClass} rounded-full object-cover`}
          referrerPolicy="no-referrer"
        />
      );
    }
    switch (config?.botAvatarType) {
      case 'shield':
        return <Shield className={sizeClass} />;
      case 'sparkles':
        return <Sparkles className={sizeClass} />;
      case 'headphones':
        return <Headphones className={sizeClass} />;
      case 'userCheck':
        return <UserCheck className={sizeClass} />;
      default:
        return <Bot className={sizeClass} />;
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div
        className="fixed z-40 flex flex-col pointer-events-auto transition-all"
        style={{
          zIndex: mascotPickerOpen ? 60 : 40,
          bottom: `${marginBottom}px`,
          ...(isLeft ? { left: `calc(${marginSide}px + env(safe-area-inset-left, 0px))`, alignItems: 'flex-start' } : { right: `calc(${marginSide}px + env(safe-area-inset-right, 0px))`, alignItems: 'flex-end' }),
          fontFamily: config?.fontFamily || undefined,
        }}
      >
        {canChangeMascot && <div className="relative mb-2">
          <button type="button" className="rounded-full bg-white border border-neutral-200 shadow-sm px-3 py-1.5 text-xs font-semibold text-neutral-700" aria-expanded={mascotPickerOpen} aria-controls="visitor-mascot-picker" onClick={() => setMascotPickerOpen(!mascotPickerOpen)}>Đổi nhân vật</button>
          {mascotPickerOpen && <div id="visitor-mascot-picker" role="dialog" aria-label="Chọn nhân vật" onKeyDown={event => { if (event.key === 'Escape') setMascotPickerOpen(false); }} className="absolute bottom-full mb-2 rounded-xl border border-neutral-200 bg-white shadow-xl p-3" style={{width:'min(300px, calc(100vw - 80px))',...(isLeft?{left:0}:{right:0})}}>
            <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold text-neutral-900">Chọn nhân vật</span><button autoFocus type="button" aria-label="Đóng chọn nhân vật" onClick={()=>setMascotPickerOpen(false)}><X className="w-4 h-4"/></button></div>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {mascotPool.map(id => <button key={id} type="button" aria-pressed={selectedMascot===id} className={`rounded-lg border p-2 text-[10px] text-neutral-800 ${selectedMascot===id?'border-blue-600 bg-blue-50':'border-neutral-200 hover:bg-neutral-50'}`} onClick={()=>{setSelectedMascot(id);if(!previewMode)storeVisitMascot(id,visitorSessionStorage());setMascotPickerOpen(false);}}>
                <span aria-hidden="true" className="block w-12 h-12 mx-auto" style={{backgroundImage:`url(${mascotSheets(id).directions})`,backgroundSize:'300% 300%',backgroundPosition:'50% 50%',backgroundRepeat:'no-repeat'}}/>{mascotLabel(id)}
              </button>)}
            </div>
          </div>}
        </div>}
        {!isOpen && config?.showFloatingBadge !== false && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border text-xs text-neutral-800 animate-bounce cursor-pointer hover:shadow-lg transition-all mb-2"
            style={{ borderColor: `${primaryColor}33`, ...(useMascot ? {...mascotBubbleStyle(config), backdropFilter: (config?.mascotBubbleOpacity ?? 0) === 0 ? 'none' : undefined} : {}) }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold" style={{ textShadow: chatbotBadgeTextShadow(config) }}>{config?.floatingBadgeText || `AI Tư vấn ${brandName}`}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={botName}
          className={`min-h-14 rounded-2xl active:scale-95 shadow-xl flex items-center justify-center gap-2 transition-all duration-300 relative group cursor-pointer border-2 border-white hover:brightness-110 ${useMascot ? 'px-2 text-neutral-900' : 'px-4 sm:px-5 text-white'}`}
          style={{ backgroundColor: primaryColor, minWidth: useMascot ? mascotSize + 88 : isOpen ? 112 : 138, ...(useMascot ? mascotBubbleStyle(config) : {}) }}
        >
          {useMascot ? (
            <>
              <PageMascot key={selectedMascot} {...mascotSheets(selectedMascot)} size={mascotSize} />
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: primaryColor }}>{isOpen ? 'Đóng' : config?.launcherText || 'Trợ lý AI'}</span>
            </>
          ) : isOpen ? (
            <>
              <X className="w-5 h-5 transition-transform group-hover:rotate-90 shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap">Đóng</span>
            </>
          ) : (
            <>
              <span className="relative shrink-0">
                {renderAvatarIcon('w-6 h-6')}
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
              </span>
              <span className="text-sm font-bold whitespace-nowrap">{config?.launcherText || 'Trợ lý AI'}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{
            bottom: `${chatWindowBottom}px`,
            ...(isLeft ? { left: `calc(${marginSide}px + env(safe-area-inset-left, 0px))` } : { right: `calc(${marginSide}px + env(safe-area-inset-right, 0px))` }),
            width: `min(${windowWidth}px, calc(100vw - ${marginSide * 2 + 16}px))`,
            height: `min(${windowHeight}px, calc(100dvh - ${chatWindowBottom + 16}px))`,
            fontFamily: config?.fontFamily || undefined,
          }}
          role="dialog"
          aria-modal="true"
          aria-label={botName}
        >
          {/* Header */}
          <div
            className="text-white p-3.5 flex items-center justify-between shadow-xs shrink-0"
            style={{ background: `linear-gradient(135deg, ${headerStart}, ${headerEnd})` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                {renderAvatarIcon('w-5 h-5')}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold leading-none">{botName}</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[10px] text-white/80 font-medium truncate max-w-[200px] mt-0.5">
                  {botSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Google Search Grounding toggle */}
              {config?.enableGoogleSearch !== false && (
                <button
                  type="button"
                  onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    useSearchGrounding ? 'bg-amber-400 text-neutral-900 font-bold' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={useSearchGrounding ? 'Đang bật tìm kiếm thông tin thị trường' : 'Bật Google Search Grounding'}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">{useSearchGrounding ? 'Search On' : 'Search'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Product Pill Banner - shows only the product explicitly resolved in this chat session. */}
          {activeChatProduct && (
            <>
              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-800 shrink-0">
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  <Shield className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="truncate font-semibold">Tư vấn chính hãng: {activeChatProduct}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setProductSwitcherOpen((open) => !open); setProductSwitcherQuery(''); }}
                    disabled={loading || taxonomyProducts.length === 0}
                    aria-expanded={productSwitcherOpen}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Đổi sang nội dung khác"
                  >
                    Đổi sản phẩm
                    <ChevronDown className={`w-3 h-3 transition-transform ${productSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {config?.showQuickCallbackForm !== false && !leadSubmitted && (
                    <button
                      type="button"
                      onClick={() => setShowLeadCard(!showLeadCard)}
                      className="text-blue-700 hover:text-blue-900 font-bold underline text-[10px] cursor-pointer"
                    >
                      {showLeadCard ? 'Đóng form' : 'Yêu cầu gọi lại'}
                    </button>
                  )}
                </div>
              </div>

              {productSwitcherOpen && (
                <div className="border-b border-blue-100 bg-white px-3 py-2.5 shrink-0 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Chuyển sang sản phẩm khác</div>
                      <div className="text-[10px] text-slate-500">Chọn sản phẩm để chatbot đổi toàn bộ ngữ cảnh và flow tư vấn.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setProductSwitcherOpen(false); setProductSwitcherQuery(''); }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Đóng danh sách đổi sản phẩm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="search"
                    value={productSwitcherQuery}
                    onChange={(e) => setProductSwitcherQuery(e.target.value)}
                    placeholder="Tìm tên sản phẩm..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                  />
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 cms-no-scrollbar">
                    {taxonomyProducts
                      .filter((p:any) => p?.active !== false && p?.name)
                      .filter((p:any) => {
                        const q = productSwitcherQuery.trim().toLocaleLowerCase('vi');
                        if (!q) return true;
                        return [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])]
                          .filter(Boolean)
                          .some((value:any) => String(value).toLocaleLowerCase('vi').includes(q));
                      })
                      .sort((a:any, b:any) => String(a.name).localeCompare(String(b.name), 'vi'))
                      .map((p:any) => {
                        const current = String(p.name) === activeChatProduct;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={current || loading}
                            onClick={() => handleProductSwitch({ id: String(p.id), name: String(p.name) })}
                            className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${
                              current
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 cursor-default'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{p.name}</span>
                              {current && <span className="text-[9px] font-bold uppercase tracking-wide">Đang tư vấn</span>}
                            </div>
                          </button>
                        );
                      })}
                    {taxonomyProducts.filter((p:any) => {
                      const q = productSwitcherQuery.trim().toLocaleLowerCase('vi');
                      if (!q || !p?.name) return false;
                      return [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])]
                        .filter(Boolean)
                        .some((value:any) => String(value).toLocaleLowerCase('vi').includes(q));
                    }).length === 0 && productSwitcherQuery.trim() && (
                      <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Lead Form Drawer (Collapsible) */}
          {showLeadCard && !leadSubmitted && config?.showQuickCallbackForm !== false && (
            <form
              onSubmit={handleQuickLeadSubmit}
              className="bg-amber-50/90 border-b border-amber-200 p-3 space-y-2 text-xs animate-in slide-in-from-top-2 shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-[11px]">
                  Để lại SĐT để nhận bảng tính phí chính xác & ưu đãi:
                </span>
                <button
                  type="button"
                  onClick={() => setShowLeadCard(false)}
                  className="text-amber-700 hover:text-amber-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Họ tên của bạn"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs focus:outline-none focus:border-blue-600"
                />
                <input
                  type="tel"
                  required
                  placeholder="Số điện thoại *"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={leadSubmitting || !leadPhone.trim()}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {leadSubmitting ? 'Đang gửi thông tin...' : 'Gửi cho Chuyên viên thương hiệu của bạn tư vấn'}
              </button>
            </form>
          )}

          {waitingForStaff && (
            <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[10px] font-semibold text-amber-800 shrink-0">
              Chuyên viên đang hỗ trợ trực tiếp. AI sẽ tự động tiếp tục khi hết thời gian chờ.
            </div>
          )}

          {/* Message List */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-neutral-50/50 text-xs"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'staff' && (
                  <span className="mb-1 text-[10px] font-bold text-blue-700">{msg.senderName || 'Chuyên viên tư vấn'}</span>
                )}
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs shadow-xs ${
                    msg.role === 'user' ? 'rounded-tr-xs' : 'border border-neutral-200 rounded-tl-xs'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: userBubbleBg, color: userBubbleText }
                      : { backgroundColor: botBubbleBg, color: botBubbleText }
                  }
                >
                  {/* Markdown renderer: render common Markdown instead of exposing raw ** / * / # syntax. */}
                  <div className="whitespace-pre-wrap font-sans space-y-1">
                    {msg.text.split('\n').map((line, lIdx) => {
                      const renderInlineMarkdown = (value: string) => {
                        const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g);
                        return parts.map((part, pIdx) => {
                          if (/^\*\*[^*]+\*\*$/.test(part)) {
                            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                          }
                          if (/^`[^`]+`$/.test(part)) {
                            return <code key={pIdx} className="px-1 py-0.5 rounded bg-neutral-100 text-[0.95em]">{part.slice(1, -1)}</code>;
                          }
                          const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
                          if (linkMatch) {
                            return <a key={pIdx} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{linkMatch[1]}</a>;
                          }
                          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                        });
                      };

                      if (/^#{1,3}\s+/.test(line)) {
                        return (
                          <h4 key={lIdx} className="font-bold text-xs mt-1 opacity-90">
                            {renderInlineMarkdown(line.replace(/^#{1,3}\s+/, ''))}
                          </h4>
                        );
                      }
                      if (/^[-*]\s+/.test(line)) {
                        return (
                          <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                            <span className="font-bold opacity-70">•</span>
                            <span>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</span>
                          </div>
                        );
                      }
                      if (/^\d+[.)]\s+/.test(line)) {
                        const numberMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
                        return (
                          <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                            <span className="font-semibold opacity-80 min-w-[1.1rem]">{numberMatch?.[1]}.</span>
                            <span>{renderInlineMarkdown(numberMatch?.[2] || '')}</span>
                          </div>
                        );
                      }
                      return <p key={lIdx}>{renderInlineMarkdown(line)}</p>;
                    })}
                  </div>

                  {/* TTS Speaker icon on Bot messages */}
                  {msg.role === 'model' && config?.enableVoiceOutput !== false && (
                    <div className="mt-1.5 pt-1 border-t border-neutral-100/60 flex items-center justify-between text-[10px] opacity-75">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handlePlayTTS(msg.id, msg.text)}
                        className="flex items-center gap-1 font-semibold cursor-pointer hover:opacity-100"
                        title="Nghe phát âm nội dung này"
                      >
                        {playingAudioId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-600 animate-pulse" />
                            <span className="text-rose-600">Đang đọc...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Nghe giọng đọc</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-2 text-neutral-500 text-xs">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>AI đang tra cứu tài liệu sản phẩm và soạn thảo...</span>
              </div>
            )}

          </div>


          {/* Product selector returned by taxonomy router */}
          {productOptions.length > 0 && !loading && (
            <div className="px-3 py-2 bg-white border-t border-blue-100 shrink-0">
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Chọn sản phẩm:</div>
              <div className="flex gap-1.5 overflow-x-auto cms-no-scrollbar">
                {productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProductOptions([]); handleSendMessage(p.name); }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 shrink-0"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick reply suggestions bar */}
          {quickReplies.length > 0 && !loading && (
            <div className="px-3 py-1.5 bg-white border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto cms-no-scrollbar shrink-0">
              <span className="text-[10px] font-semibold text-neutral-400 shrink-0">Gợi ý:</span>
              {quickReplies.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 hover:bg-blue-50 hover:text-blue-700 text-neutral-700 border border-neutral-200 shrink-0 cursor-pointer transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Voice Listening Active indicator */}
          {isListening && (
            <div className="bg-rose-50 border-t border-rose-200 px-3 py-1.5 flex items-center justify-between text-xs text-rose-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span className="font-semibold text-[11px]">Đang lắng nghe giọng nói... Hãy nói câu hỏi!</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-rose-700 font-bold underline text-[10px]"
              >
                Dừng mic
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-2.5 bg-white border-t border-neutral-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Voice recognition button */}
              {speechSupported && config?.enableVoiceInput !== false && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                  title={isListening ? 'Dừng nhận diện giọng nói' : 'Bấm để nói bằng giọng nói (Microphone)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? 'Đang nhận diện giọng nói...' : (config?.placeholderText || (activeChatProduct ? `Hỏi AI về ${activeChatProduct}...` : 'Nhập câu hỏi của Quý khách...'))}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-blue-600 bg-neutral-50/50"
              />

              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="p-2 rounded-xl text-white shadow-xs transition-all cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
