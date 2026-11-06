import {
  KnowledgeTaxonomyData,
  AiTrainingConfig,
  AiChatbotConfig,
  TaxonomyProduct,
  TaxonomyCategory,
  TaxonomyComponentType,
} from '../types';

export const DEFAULT_TAXONOMY_CATEGORIES: TaxonomyCategory[] = [];

// No bundled/sample products. Products must come from CMS/Firestore taxonomy.
export const DEFAULT_TAXONOMY_PRODUCTS: TaxonomyProduct[] = [];

export const DEFAULT_TAXONOMY_COMPONENT_TYPES: TaxonomyComponentType[] = [
  {
    id: 'overview',
    code: 'overview',
    label: 'Tổng quan & Đối tượng',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Mô tả chung, điều kiện tham gia, độ tuổi và phạm vi bảo hiểm cơ bản',
    isDefault: true,
  },
  {
    id: 'benefits',
    code: 'benefits',
    label: 'Quyền lợi & Chi trả',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Bảng hạn mức bồi thường, quyền lợi chính và các gói bổ sung nâng cao',
    isDefault: true,
  },
  {
    id: 'pricing_rules',
    code: 'pricing_rules',
    label: 'Biểu phí & Tính phí',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Công thức tính phí, biểu tỷ lệ %, mức khấu trừ, chiết khấu và ưu đãi',
    isDefault: true,
  },
  {
    id: 'exclusions',
    code: 'exclusions',
    label: 'Điểm loại trừ & Thời gian chờ',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Trường hợp không chi trả, thời gian chờ bệnh đặc biệt, điểm loại trừ chung',
    isDefault: true,
  },
  {
    id: 'claim_procedure',
    code: 'claim_procedure',
    label: 'Quy trình Bồi thường',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Hồ sơ yêu cầu thanh toán, các bước thông báo tai nạn, thời hạn giải quyết',
    isDefault: true,
  },
  {
    id: 'hospitals_garages',
    code: 'hospitals_garages',
    label: 'Bệnh viện & Gara liên kết',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    desc: 'Mạng lưới bảo lãnh viện phí trực tiếp, xưởng gara sửa chữa chính hãng',
    isDefault: true,
  },
  {
    id: 'faq',
    code: 'faq',
    label: 'Câu hỏi thường gặp (FAQ)',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Giải đáp thắc mắc phổ biến của khách hàng khi tham gia bảo hiểm',
    isDefault: true,
  },
  {
    id: 'sales_pitch',
    code: 'sales_pitch',
    label: 'Kịch bản & Thế mạnh tư vấn',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    desc: 'Lợi thế vượt trội của Bảo Việt so với thị trường, điểm độc đáo sản phẩm',
    isDefault: true,
  },
  {
    id: 'custom',
    code: 'custom',
    label: 'Tài liệu bổ trợ khác',
    color: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    desc: 'Quyết định ban hành, thông tư quy định và phụ lục nghiệp vụ',
    isDefault: true,
  },
];

export const DEFAULT_TAXONOMY_DATA: KnowledgeTaxonomyData = {
  products: DEFAULT_TAXONOMY_PRODUCTS,
  categories: DEFAULT_TAXONOMY_CATEGORIES,
  componentTypes: DEFAULT_TAXONOMY_COMPONENT_TYPES,
};

export const DEFAULT_AI_TRAINING_CONFIG: AiTrainingConfig = {
  botName: '',
  modelName: 'gemini-3.8-flash',
  fallbackModelName: 'gemini-3.1-flash-lite',
  temperature: 0.4,
  maxOutputTokens: 2048,
  topKRetrieval: 5,
  // Product facts are always grounded in the approved Knowledge Base.
  useSearchGrounding: true,
  strictKnowledgeOnly: true,
  systemPromptPrefix: '',
  politenessLevel: 'warm_polite',
  openingGreeting: '',
  closingWish: '',
  complaintEtiquette: '',
  outOfScopeResponse: '',
  aiPronoun: 'Em',
  customerPronoun: 'Quý khách',
  conversationTone: 'advisor',
  responseLength: 'balanced',
  useBulletPoints: true,
  useEmoji: 'subtle',
  pricingPlaybook: '',
  claimPlaybook: '',
  hesitationPlaybook: '',
  leadCaptureTrigger: '',
  customBehaviorPrompt: '',
};

export const DEFAULT_AI_CHATBOT_CONFIG: AiChatbotConfig = {
  enabled: false,
  botName: '',
  botSubtitle: '',
  botAvatarType: 'bot',
  launcherVisual: 'icon',
  mascotId: 'fox',
  mascotRandomPerVisit: true,
  mascotAllowVisitorChange: true,
  mascotSize: 54,
  mascotBubbleColor: '#ffffff',
  mascotBubbleOpacity: 0,
  supportPhone: '',
  welcomeMessage: '',
  placeholderText: 'Nhập câu hỏi của Quý khách...',
  floatingPosition: 'bottom-right',
  floatingMarginBottom: 20,
  floatingMarginSide: 40,
  chatWindowWidth: 420,
  chatWindowHeight: 580,
  primaryColor: '#005baa',
  headerGradientStart: '#005baa',
  headerGradientEnd: '#003e75',
  botBubbleBgColor: '#ffffff',
  botBubbleTextColor: '#1e293b',
  userBubbleBgColor: '#005baa',
  userBubbleTextColor: '#ffffff',
  showFloatingBadge: false,
  floatingBadgeText: '',
  floatingBadgeTextShadowColor: '#005baa',
  launcherText: 'Trợ lý AI',
  enableVoiceInput: true,
  enableVoiceOutput: true,
  enableGoogleSearch: true,
  showQuickCallbackForm: true,
  suggestedQuestions: [],
  training: DEFAULT_AI_TRAINING_CONFIG,
};

export function normalizeAiChatbotConfig(raw?: Partial<AiChatbotConfig> | null): AiChatbotConfig {
  if (!raw) return { ...DEFAULT_AI_CHATBOT_CONFIG };
  return {
    ...DEFAULT_AI_CHATBOT_CONFIG,
    ...raw,
    training: {
      ...DEFAULT_AI_TRAINING_CONFIG,
      ...(raw.training || {}),
    },
  };
}
