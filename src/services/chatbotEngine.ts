import type { KnowledgeItem, KnowledgeTaxonomyData } from '../types';
import type { ChatRouterResult } from './chatbotTaxonomyRouter';
import { runGeminiChat, type ChatResponseResult } from './geminiServer';
import { analyzeConversationMessage, type ConversationReasoningResult } from './chatbotConversationReasoner';

export interface ChatbotEngineParams {
  message: string;
  history?: Array<{role:'user'|'model'; text:string}>;
  router: ChatRouterResult;
  taxonomy: KnowledgeTaxonomyData;
  knowledgeItems: KnowledgeItem[];
  activeProductId?: string;
  activeProductName?: string;
  activeProductNames?: string[];
  conversationMode?: 'KEEP' | 'SWITCH' | 'MULTI_PRODUCT' | 'NONE';
  activeCategoryId?: string;
  activeComponentId?: string;
  trainingConfig?: any;
  pageContext?: any;
  botName?: string;
  useSearchGrounding?: boolean;
  conversationReasoning?: ConversationReasoningResult;
  orchestrationContext?: string;
}

function taxonomyContextItems(taxonomy: KnowledgeTaxonomyData, router: ChatRouterResult): KnowledgeItem[] {
  // Synthetic taxonomy items must be stable across identical requests. Runtime
  // timestamps previously changed the Gemini cache fingerprint on every turn.
  const stableTimestamp = '1970-01-01T00:00:00.000Z';
  const products = taxonomy.products
    .filter((p:any) => p.active !== false)
    .sort((a:any,b:any) => (a.order ?? 9999) - (b.order ?? 9999));
  const categories = taxonomy.categories
    .filter((c:any) => c.active !== false)
    .sort((a:any,b:any) => (a.order ?? 9999) - (b.order ?? 9999));

  const productLines = products.map((p:any, i:number) => {
    const c = categories.find((x:any) => x.id === p.categoryId);
    return `${i + 1}. ${p.name}${c?.name ? ` — Danh mục: ${c.name}` : ''}`;
  });
  const categoryLines = categories.map((c:any, i:number) => {
    const count = products.filter((p:any) => p.categoryId === c.id).length;
    return `${i + 1}. ${c.name} — ${count} sản phẩm`;
  });

  const items: KnowledgeItem[] = [{
    id: '__taxonomy_catalog__',
    title: 'Danh mục sản phẩm đang hoạt động trong CMS',
    product: '',
    category: 'Taxonomy CMS',
    topic: 'Danh sách sản phẩm và danh mục',
    componentType: 'overview',
    content: `Danh sách sản phẩm nghiệp vụ đang hoạt động trong CMS:\n${productLines.join('\n')}\n\nDanh mục nghiệp vụ:\n${categoryLines.join('\n')}`,
    tags: ['sản phẩm','danh sách sản phẩm','danh mục','taxonomy','cms'],
    active: true,
    createdAt: stableTimestamp,
    updatedAt: stableTimestamp,
  }];

  if (router.product) {
    const p:any = products.find((x:any) => x.id === router.product!.id) || router.product;
    const c:any = categories.find((x:any) => x.id === p?.categoryId);
    items.push({
      id: `__taxonomy_product_${p?.id || 'selected'}__`,
      title: `Thông tin định tuyến sản phẩm ${p?.name || ''}`,
      product: p?.name || '',
      productId: p?.id,
      category: c?.name || '',
      categoryId: c?.id,
      topic: 'Định tuyến sản phẩm',
      componentType: 'overview',
      content: `Sản phẩm đã được hệ thống định tuyến: ${p?.name || ''}.${c?.name ? ` Danh mục: ${c.name}.` : ''}`,
      tags: [p?.name || '', c?.name || '', 'sản phẩm đang hỏi'].filter(Boolean),
      active: true,
      createdAt: stableTimestamp,
      updatedAt: stableTimestamp,
    });
  }

  if (router.category) {
    const c:any = categories.find((x:any) => x.id === router.category!.id) || router.category;
    const categoryProducts = products.filter((p:any) => p.categoryId === c?.id);
    items.push({
      id: `__taxonomy_category_${c?.id || 'selected'}__`,
      title: `Danh mục ${c?.name || ''}`,
      product: '',
      category: c?.name || '',
      categoryId: c?.id,
      topic: 'Sản phẩm theo danh mục',
      componentType: 'overview',
      content: `Danh mục ${c?.name || ''} có ${categoryProducts.length} sản phẩm đang hoạt động:\n${categoryProducts.map((p:any,i:number)=>`${i+1}. ${p.name}`).join('\n')}`,
      tags: [c?.name || '', 'danh mục', 'sản phẩm'].filter(Boolean),
      active: true,
      createdAt: stableTimestamp,
      updatedAt: stableTimestamp,
    });
  }
  return items;
}

const normalize = (value: string) => String(value || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function source(item: KnowledgeItem) {
  return { id:item.id, title:item.title, product:item.product, topic:item.topic, componentType:item.componentType };
}


function directQuickReplies(intent?: string): string[] {
  switch (String(intent || '')) {
    case 'PRODUCT_ELIGIBILITY':
    case 'PRODUCT_PARTICIPANT':
      return ['Độ tuổi tham gia là bao nhiêu?', 'Điều kiện tham gia gồm những gì?', 'Quy trình tham gia thế nào?'];
    case 'PRODUCT_PROCEDURE':
      return ['Hồ sơ cần chuẩn bị gì?', 'Điều kiện tham gia là gì?', 'Quyền lợi chính là gì?'];
    case 'PRODUCT_BENEFIT':
      return ['Điều kiện tham gia là gì?', 'Loại trừ gồm những gì?', 'Quy trình bồi thường thế nào?'];
    case 'PRODUCT_CLAIM':
      return ['Hồ sơ bồi thường cần gì?', 'Quyền lợi được chi trả là gì?', 'Điều kiện tham gia là gì?'];
    default:
      return ['Quyền lợi sản phẩm là gì?', 'Điều kiện tham gia là gì?', 'Quy trình tham gia thế nào?'];
  }
}

// Only deliver a CMS entry without AI when the requested topic has one unambiguous,
// concise answer. Longer tables, conditional clauses and comparisons need reasoning.
function directKnowledgeAnswer(params: ChatbotEngineParams): ChatResponseResult | null {
  if (!params.activeProductId || params.conversationMode === 'MULTI_PRODUCT') return null;
  const q = normalize(params.message);
  const nonPricingIntent = new Set([
    'PRODUCT_BENEFIT','PRODUCT_EXCLUSION','PRODUCT_ELIGIBILITY','PRODUCT_PARTICIPANT',
    'PRODUCT_RENEWAL','PRODUCT_PROCEDURE','PRODUCT_CLAIM','PRODUCT_LIABILITY','PRODUCT_RULE','PRODUCT_TERM',
  ]).has(String(params.router.intent || ''));
  // Pricing must be requested by THIS turn (or an explicitly inherited pricing
  // intent), never inferred merely because an older message mentioned fees.
  // This prevents "71 tuổi có tham gia được không?" / "quy trình tham gia"
  // from being hijacked by an earlier pricing topic.
  const pricing = !nonPricingIntent && (params.router.usePricing || params.router.component?.id === 'premium' ||
    (!!params.router.component?.name && /\b(phi|bieu phi)\b/.test(normalize(params.router.component.name))) ||
    /\b(phi|bieu phi|gia|bao nhieu tien|tinh phi)\b/.test(q));
  const complex = /\b(neu|truong hop|so sanh|khac nhau|tai sao|vi sao|ket hop|dong thoi|tinh huong|co duoc|duoc chi tra|thi sao)\b/.test(q);
  const component = pricing ? 'pricing_rules' : params.router.component?.id;
  const entries = params.knowledgeItems.filter(k => k.active !== false &&
    (!k.productId || k.productId === params.activeProductId) &&
    (normalize(k.product) === normalize(params.activeProductName || '')) &&
    (!component || k.componentId === component || k.componentType === component ||
      normalize(k.topic) === normalize(params.router.component?.name || '')));

  if (pricing) {
    const priceEntries = entries.filter(k => k.componentType === 'pricing_rules' || /\b(phi|bieu phi)\b/.test(normalize(k.topic)));
    if (!priceEntries.length) return {
      reply:`Dạ, em chưa có biểu phí đã xác thực của **${params.activeProductName}** trong Kho tri thức. Anh/chị vui lòng để lại thông tin tư vấn để nhân viên xác nhận mức phí chính thức.`,
      sources:[], quickReplies:['Đăng ký tư vấn','Quyền lợi sản phẩm là gì?'], modelUsed:'knowledge',
    };
    if (priceEntries.length === 1 && !complex && priceEntries[0].content.trim().length <= 600 &&
      !/\b(neu|tuy|phu thuoc|theo tuoi|theo goi|bang phi)\b/.test(normalize(priceEntries[0].content))) {
      return { reply:`Dạ, theo biểu phí **${params.activeProductName}** trong Kho tri thức:\n\n${priceEntries[0].content.trim()}`,
        sources:[source(priceEntries[0])], quickReplies:['Xem quyền lợi','Đăng ký tư vấn'], modelUsed:'knowledge' };
    }
    // A rate table without the required selections must never be quoted as a single price.
    const age = params.conversationReasoning?.entities?.age ?? analyzeConversationMessage(q).entities?.age;
    const hasPlan = /\b(goi|chuong trinh|ke hoach|dong|bac|vang|kim cuong|bach kim)\b/.test(q) ||
      (params.history || []).some(h => h.role === 'user' && /\b(goi|chuong trinh|ke hoach)\s+\S+/.test(normalize(h.text)));
    const simpleAgeFollowUp = /^\d{1,3}\s*tuoi( thi sao)?$/.test(q);
    if ((!complex || simpleAgeFollowUp) && (!age || !hasPlan)) return {
      reply:age
        ? `Dạ, với độ tuổi **${age}**, em đã ghi nhận để tra biểu phí **${params.activeProductName}**. Anh/chị muốn xem gói nào? Anh/chị có thể đăng ký tư vấn để được xác nhận phí và quyền lợi chính thức.`
        : `Dạ, **${params.activeProductName}** có biểu phí trong Kho tri thức, nhưng em cần thông tin của trường hợp cụ thể để chọn đúng mức phí. Anh/chị cho em biết độ tuổi trước nhé; anh/chị có thể đăng ký tư vấn để xác nhận quyền lợi và phí chính thức.`,
      sources:priceEntries.map(source), quickReplies:['Đăng ký tư vấn','So sánh các gói'], modelUsed:'knowledge',
    };
  }
  if (complex || pricing || !component || entries.length !== 1 ||
    !normalize(params.router.component?.name || '').split(' ').some(term => term.length > 2 && q.includes(term))) return null;
  const item = entries[0];
  if (item.content.trim().length > 500 || !item.content.trim()) return null;
  return { reply:`Dạ, về **${item.topic}** của **${params.activeProductName}**:\n\n${item.content.trim()}`,
    sources:[source(item)], quickReplies:directQuickReplies(params.router.intent), modelUsed:'knowledge' };
}

/** CMS-first answer path. Complex questions still use Gemini with scoped evidence. */
export async function runRebuiltChatbot(params: ChatbotEngineParams): Promise<ChatResponseResult> {
  const q = String(params.message || '').trim();
  const reasoning = params.conversationReasoning || analyzeConversationMessage(q);

  if (params.orchestrationContext &&
    (['PRODUCT_LIST','PRODUCT_CATEGORY','CATEGORY_PRODUCTS'].includes(params.router.intent) || params.router.requiresProductSelection || params.router.categorySelection)) {
    return { reply:params.orchestrationContext, sources:[], quickReplies:[], modelUsed:'taxonomy' };
  }
  const direct = directKnowledgeAnswer(params);
  if (direct) return direct;

  const taxonomyItems = taxonomyContextItems(params.taxonomy, params.router);
  const orchestrationItem: KnowledgeItem[] = params.orchestrationContext ? [{
    id: '__orchestration_context__',
    title: 'Ngữ cảnh định tuyến của phiên chat',
    product: params.activeProductName || '',
    productId: params.activeProductId,
    category: '',
    topic: 'Ngữ cảnh hội thoại',
    componentType: 'overview',
    content: params.orchestrationContext,
    tags: ['ngữ cảnh hội thoại','định tuyến'],
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }] : [];

  // Preserve scoped CMS knowledge selected by the conversation orchestrator, and
  // add CMS taxonomy metadata so Gemini can also answer catalog/category questions.
  const knowledgeItems = [...params.knowledgeItems, ...taxonomyItems, ...orchestrationItem];

  return runGeminiChat({
    message: q,
    history: params.history,
    knowledgeItems,
    productFilter: params.conversationMode === 'MULTI_PRODUCT' ? undefined : params.activeProductName,
    pageContext: params.pageContext,
    trainingConfig: {
      ...(params.trainingConfig || {}),
      // Product facts remain grounded by Knowledge; Gemini handles complex turns.
      strictKnowledgeOnly: true,
      alwaysUseGemini: false,
    },
    botName: params.botName,
    useSearchGrounding: params.useSearchGrounding,
    conversationReasoning: reasoning,
    intentFocus: params.router.intent,
  });
}
