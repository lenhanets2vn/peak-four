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
    label: 'Tổng quan',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Mô tả tổng quan, đối tượng sử dụng và phạm vi sản phẩm hoặc dịch vụ',
    isDefault: true,
  },
  {
    id: 'benefits',
    code: 'benefits',
    label: 'Thông tin và lợi ích',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Thông tin chi tiết, lợi ích và tùy chọn bổ sung',
    isDefault: true,
  },
  {
    id: 'pricing_rules',
    code: 'pricing_rules',
    label: 'Giá và chính sách',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Bảng giá, ưu đãi và điều kiện áp dụng',
    isDefault: true,
  },
  {
    id: 'exclusions',
    code: 'exclusions',
    label: 'Giới hạn và lưu ý',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Trường hợp ngoại lệ, giới hạn sử dụng và các lưu ý',
    isDefault: true,
  },
  {
    id: 'claim_procedure',
    code: 'claim_procedure',
    label: 'Quy trình hỗ trợ',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Các bước liên hệ hỗ trợ và thời gian xử lý',
    isDefault: true,
  },
  {
    id: 'hospitals_garages',
    code: 'hospitals_garages',
    label: 'Đối tác và liên kết',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    desc: 'Danh sách đối tác, địa chỉ và kênh liên hệ được công bố',
    isDefault: true,
  },
  {
    id: 'faq',
    code: 'faq',
    label: 'Câu hỏi thường gặp (FAQ)',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Giải đáp câu hỏi phổ biến của khách hàng',
    isDefault: true,
  },
  {
    id: 'sales_pitch',
    code: 'sales_pitch',
    label: 'Kịch bản tư vấn',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    desc: 'Lợi thế vượt trội của thương hiệu đang cấu hình so với thị trường, điểm độc đáo sản phẩm',
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
  botName: 'Trợ lý AI',
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
  openingGreeting: 'Xin chào! Tôi có thể hỗ trợ thông tin nào cho bạn?',
  closingWish: 'Kính chúc Quý khách và gia đình luôn dồi dào sức khỏe, vạn dặm bình an và thịnh vượng!',
  complaintEtiquette: 'Luôn giữ bình tĩnh, đồng cảm và chân thành xin lỗi vì sự bất tiện của Quý khách. Tuyệt đối không tranh cãi hay đổ lỗi, lắng nghe vấn đề và giải thích căn cứ trên điều khoản minh bạch, đồng thời hướng dẫn kênh giải quyết ưu tiên.',
  outOfScopeResponse: 'Dạ thưa Quý khách, nội dung này nằm ngoài phạm vi thông tin đã được xác minh. Em có thể ghi nhận để chuyển chuyên viên hỗ trợ theo thông tin liên hệ mà quản trị viên thiết lập.',
  aiPronoun: 'Em',
  customerPronoun: 'Quý khách',
  conversationTone: 'advisor',
  responseLength: 'balanced',
  useBulletPoints: true,
  useEmoji: 'subtle',
  pricingPlaybook: 'Chỉ cung cấp giá và điều kiện đã được quản trị viên xác nhận trong kho nội dung. Không tự suy đoán thông tin chưa được công bố.',
  claimPlaybook: 'Chỉ mô tả các quy trình và cam kết khi có tài liệu đã được quản trị viên xác minh.',
  hesitationPlaybook: 'Lắng nghe nỗi băn khoăn của Quý khách, tôn trọng quyết định cân nhắc, tóm tắt lại 3 giá trị bảo vệ thiết thực nhất và mời Quý khách lưu lại tài liệu hoặc Hotline để liên hệ bất kỳ lúc nào.',
  leadCaptureTrigger: 'Bạn có thể để lại thông tin liên hệ nếu muốn được nhân viên hỗ trợ thêm.',
  customBehaviorPrompt: '',
};

export const DEFAULT_AI_CHATBOT_CONFIG: AiChatbotConfig = {
  enabled: false,
  botName: 'Trợ lý AI',
  botSubtitle: 'Hỗ trợ thông tin 24/7',
  botAvatarType: 'bot',
  launcherVisual: 'icon',
  mascotId: 'fox',
  mascotRandomPerVisit: true,
  mascotAllowVisitorChange: true,
  mascotSize: 54,
  mascotBubbleColor: '#ffffff',
  mascotBubbleOpacity: 0,
  supportPhone: '',
  welcomeMessage: 'Xin chào! Tôi là **Trợ lý AI**, sẵn sàng hỗ trợ tra cứu thông tin đã được đăng trên website.',
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
  showFloatingBadge: true,
  floatingBadgeText: 'Trợ lý AI trực tuyến',
  floatingBadgeTextShadowColor: '#005baa',
  launcherText: 'Trợ lý AI',
  enableVoiceInput: true,
  enableVoiceOutput: true,
  enableGoogleSearch: true,
  showQuickCallbackForm: true,
  suggestedQuestions: [
    'Thông tin và cập nhật mới nhất',
    'Thông tin sản phẩm và dịch vụ',
    'Chính sách và điều khoản',
    'Cách liên hệ bộ phận hỗ trợ?',
  ],
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
