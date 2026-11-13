import type { ChatSession, KnowledgeItem, KnowledgeTaxonomyData } from '../types';
import { analyzeConversationMessage } from './chatbotConversationReasoner';
import { resolveDynamicComponent, rankKnowledgeDynamically } from './chatbotDynamicKnowledge';
import { resolveMultiTurnReference, mergeSubjectEntities } from './chatbotMultiTurnReference';
import { resolveSemanticTaxonomyCandidates } from './chatbotSemanticResolver';
import { resolveTopicStackCommand, upsertTopicFrame, getTopicFrame } from './chatbotTopicStack';
import {
  routeChatMessage, getProductCategory, getProductsForCategory, filterKnowledgeByTaxonomy,
  type ChatRouterResult,
} from './chatbotTaxonomyRouter';


const NON_PRICING_INTENTS = new Set([
  'PRODUCT_OVERVIEW','PRODUCT_BENEFIT','PRODUCT_EXCLUSION','PRODUCT_ELIGIBILITY','PRODUCT_PARTICIPANT',
  'PRODUCT_RENEWAL','PRODUCT_PROCEDURE','PRODUCT_CLAIM','PRODUCT_LIABILITY','PRODUCT_RULE','PRODUCT_TERM',
]);

function isPricingComponent(component: any): boolean {
  if (!component) return false;
  const text = `${component.id || ''} ${component.code || ''} ${component.name || ''} ${component.label || ''}`.toLowerCase();
  return /premium|pricing|bieu phi|biểu phí|phi bao hiem|phí bảo hiểm/.test(text);
}

export interface DirectChatResponse {
  reply: string;
  needsProductSelection?: boolean;
  productOptions?: Array<{id:string;name:string}>;
}

export interface ConversationOrchestrationResult {
  router: ChatRouterResult;
  conversationReasoning: ReturnType<typeof analyzeConversationMessage>;
  activeProductId?: string;
  activeProductName?: string;
  activeCategoryId?: string;
  scopedKnowledge: KnowledgeItem[];
  directResponse?: DirectChatResponse;
}

/**
 * Step 14: one canonical pre-answer pipeline per customer message.
 * This is the only layer allowed to mutate semantic conversation state
 * (product/category/component/subject/topic stack) before the answer engine runs.
 * It never writes Product Facts and never treats previous AI text as truth.
 */
export async function orchestrateConversationTurn(params: {
  message: string;
  session: ChatSession;
  taxonomy: KnowledgeTaxonomyData;
  knowledgeItems: KnowledgeItem[];
  /** Explicit product chosen by a trusted UI control. Still validated against the public taxonomy. */
  forcedProductId?: string | null;
}): Promise<ConversationOrchestrationResult> {
  const { message, session, taxonomy, knowledgeItems, forcedProductId } = params;
  const products = taxonomy.products.filter(p => p.active !== false);
  const router = routeChatMessage(message, taxonomy, session.productSelectionConfirmed ? session.currentProductId : null);

  // Product switcher UI is a deterministic taxonomy selection, not an NLP guess.
  // Validate the id against the active taxonomy, then force the canonical product
  // route so the old product flow cannot stay pinned because of ambiguous wording.
  if (forcedProductId) {
    const selected = products.find((p) => p.id === forcedProductId);
    if (selected) {
      router.product = { id: selected.id, name: selected.name, matchedBy: 'canonicalName' };
      router.products = [{ id: selected.id, name: selected.name, matchedBy: 'canonicalName' }];
      router.conversationMode = session.productSelectionConfirmed && session.currentProductId && session.currentProductId !== selected.id ? 'SWITCH' : 'KEEP';
      router.categorySelection = false;
      router.requiresProductSelection = false;
      router.requiresAIResolver = false;
      router.confidence = 1;
      // A dedicated product-change control starts a fresh product flow. Do not
      // inherit a stale component such as pricing/benefits from the old product.
      router.component = null;
      router.explicitIntent = false;
    }
  }

  // Closed-set semantic fallback. Deterministic routing always wins.
  const semantic = await resolveSemanticTaxonomyCandidates({
    message, router, taxonomy,
    activeProductId: session.productSelectionConfirmed ? session.currentProductId : null,
    activeComponentId: session.currentComponentId || null,
  });
  if (semantic.accepted) {
    if (!router.product && semantic.productId) {
      const p = products.find(x => x.id === semantic.productId);
      if (p) {
        router.product = { id:p.id, name:p.name, matchedBy:'keyword' };
        router.products = [{ id:p.id, name:p.name, matchedBy:'keyword' }];
        router.conversationMode = session.currentProductId && session.currentProductId !== p.id ? 'SWITCH' : 'KEEP';
        router.requiresProductSelection = false;
        router.confidence = Math.max(router.confidence || 0, semantic.confidence);
      }
    }
    if (!router.category && semantic.categoryId) {
      const c = taxonomy.categories.find(x => x.id === semantic.categoryId);
      if (c) {
        router.category = { id:c.id, name:c.name, matchedBy:'keyword' };
        if (!router.product) router.categorySelection = true;
      }
    }
    if (!router.component && semantic.componentId) {
      const c = taxonomy.componentTypes.find(x => x.id === semantic.componentId);
      if (c) {
        router.component = { id:c.id, name:c.name || c.label || c.id, matchedBy:'keyword' };
        router.confidence = Math.max(router.confidence || 0, semantic.confidence);
      }
    }
    if (router.intent === 'GENERAL_QUESTION' && semantic.intent) {
      const allowed = new Set([
        'PRODUCT_OVERVIEW','PRODUCT_BENEFIT','PRODUCT_EXCLUSION','PRODUCT_ELIGIBILITY','PRODUCT_PARTICIPANT',
        'PRODUCT_PREMIUM','PRODUCT_RENEWAL','PRODUCT_PROCEDURE','PRODUCT_CLAIM','PRODUCT_LIABILITY',
        'PRODUCT_RULE','PRODUCT_TERM','CALCULATE_PREMIUM','GENERAL_QUESTION',
      ]);
      if (allowed.has(semantic.intent)) { router.intent = semantic.intent as any; router.explicitIntent = semantic.intent !== 'GENERAL_QUESTION'; }
    }
    if (router.explicitIntent && NON_PRICING_INTENTS.has(router.intent) && router.component) {
      const c = taxonomy.componentTypes.find(x => x.id === router.component!.id);
      if (isPricingComponent(c)) router.component = null;
    }
    router.requiresAIResolver = false;
  }

  const reasoning = analyzeConversationMessage(message);
  const currentSubjectId = session.activeConversationSubject || 'self';
  const reference = resolveMultiTurnReference(message, currentSubjectId);
  session.conversationSubjectProfiles = session.conversationSubjectProfiles || {};
  const stored = session.conversationSubjectProfiles[reference.subjectId];
  const merged = mergeSubjectEntities(reference.resetSubjectProfile ? undefined : stored, reasoning.entities);
  session.activeConversationSubject = reference.subjectId;
  session.conversationSubjectProfiles[reference.subjectId] = merged;
  session.conversationEntities = merged;

  if (reasoning.isContextualFollowUp || reference.isReferenceFollowUp) {
    reasoning.entities = { ...merged, ...reasoning.entities };
    reasoning.isContextualFollowUp = true;
    reasoning.needsConversationalReasoning = true;
    const e = reasoning.entities;
    reasoning.contextSummary = [
      `đối tượng hội thoại=${reference.subjectId}`,
      e.occupation ? `nghề nghiệp=${e.occupation}` : '',
      e.age !== undefined ? `tuổi=${e.age}` : '',
      e.gender ? `giới tính=${e.gender === 'male' ? 'nam' : 'nữ'}` : '',
      e.relationship ? `đối tượng=${e.relationship}` : '',
      e.healthContext ? `sức khỏe=${e.healthContext}` : '',
      e.eventContext ? `tình huống=${e.eventContext}` : '',
      reference.ordinal ? `tham chiếu trường hợp số=${reference.ordinal}` : '',
    ].filter(Boolean).join('; ');
  }
  if (reasoning.isContextualFollowUp || reasoning.asksPersonalSituation) session.lastContextualQuestion = message;

  // Topic navigation happens before product state mutation so restored branches are canonical.
  session.topicStack = session.topicStack || [];
  const topicCommand = resolveTopicStackCommand(message, session.topicStack as any);
  if (topicCommand.targetIndex !== undefined) {
    const target = getTopicFrame(session.topicStack as any, topicCommand.targetIndex);
    if (target) {
      session.activeTopicIndex = topicCommand.targetIndex;
      if (!router.product && target.productId) {
        const p = products.find(x => x.id === target.productId);
        if (p) {
          router.product = { id:p.id, name:p.name, matchedBy:'keyword' };
          router.products = [{ id:p.id, name:p.name, matchedBy:'keyword' }];
          router.conversationMode = session.currentProductId && session.currentProductId !== p.id ? 'SWITCH' : 'KEEP';
          router.requiresProductSelection = false;
        }
      }
      if (!router.component && target.componentId) {
        const c = taxonomy.componentTypes.find(x => x.id === target.componentId);
        if (c) router.component = { id:c.id, name:c.name || c.label || c.id, matchedBy:'keyword' };
      }
      if (!router.intent && target.intent) router.intent = target.intent as any;
      if (target.subjectId) session.activeConversationSubject = target.subjectId;
    }
  }

  // Product/category state machine. Typed taxonomy selections and UI suggestion
  // clicks converge here so there is only one semantic path.
  const previousProductId = session.productSelectionConfirmed ? session.currentProductId : undefined;
  const previousComponentId = session.currentComponentId;
  const previousComponent = session.currentComponent;
  const previousIntent = session.lastIntent;
  const previousAwaitingProductSelection = !!session.awaitingProductSelection;
  const previousPendingIntent = session.pendingIntent;
  const previousPendingComponentId = session.pendingComponentId;

  // If the previous turn explicitly asked the customer to select a product, an
  // exact product typed into the textbox MUST behave exactly like clicking the
  // product option. Carry only the pending intent/component from that selection
  // hand-off, never unrelated stale deep-talk state.
  if (router.product && session.awaitingProductSelection) {
    const selected = products.find(x => x.id === router.product!.id);
    const selectedCategory = selected ? getProductCategory(selected, taxonomy) : null;
    const pendingCategoryMatches = !session.pendingCategoryId || selectedCategory?.id === session.pendingCategoryId;
    if (pendingCategoryMatches) {
      if (router.intent === 'GENERAL_QUESTION' && session.pendingIntent) router.intent = session.pendingIntent as any;
      if (!router.component && session.pendingComponentId) {
        const c = taxonomy.componentTypes.find(x => x.id === session.pendingComponentId);
        if (c) router.component = { id:c.id, name:c.name || c.label || c.id, matchedBy:'keyword' };
      }
    }
    session.awaitingProductSelection = false;
    delete session.pendingIntent;
    delete session.pendingComponentId;
    delete session.pendingCategoryId;
  }

  // A category typed by the customer (for example "Tài sản") is an actual
  // navigation choice, not a harmless word that should leave the old product
  // pinned. Prefer a single/default product when the taxonomy makes that choice
  // unambiguous; otherwise clear the old product and ask only among products in
  // the selected category.
  let categorySelectionProducts: typeof products = [];
  if (router.categorySelection && router.category && !router.product) {
    categorySelectionProducts = getProductsForCategory(router.category.id, taxonomy)
      .slice().sort((a,b)=>(a.order ?? 9999)-(b.order ?? 9999) || a.name.localeCompare(b.name,'vi'));
    session.currentCategoryId = router.category.id;
    session.currentCategory = router.category.name;
    const preferred = categorySelectionProducts.find(p => p.isDefault) || (categorySelectionProducts.length === 1 ? categorySelectionProducts[0] : undefined);
    if (preferred) {
      router.product = { id:preferred.id, name:preferred.name, matchedBy:'keyword' };
      router.products = [{ id:preferred.id, name:preferred.name, matchedBy:'keyword' }];
      router.conversationMode = previousProductId && previousProductId !== preferred.id ? 'SWITCH' : 'KEEP';
      router.requiresProductSelection = false;
      // Category may itself be the answer to a previous "which product?" turn.
      // Preserve that pending goal when taxonomy makes the product unambiguous.
      if (previousAwaitingProductSelection) {
        if (router.intent === 'GENERAL_QUESTION' && previousPendingIntent) router.intent = previousPendingIntent as any;
        if (!router.component && previousPendingComponentId) {
          const c = taxonomy.componentTypes.find(x => x.id === previousPendingComponentId);
          if (c) router.component = { id:c.id, name:c.name || c.label || c.id, matchedBy:'keyword' };
        }
        session.awaitingProductSelection = false;
        delete session.pendingIntent; delete session.pendingComponentId; delete session.pendingCategoryId;
      }
    } else {
      delete session.currentProductId;
      delete session.currentProduct;
      session.productSelectionConfirmed = false;
      delete session.currentComponentId;
      delete session.currentComponent;
      session.awaitingProductSelection = categorySelectionProducts.length > 0;
      session.pendingCategoryId = router.category.id;
      session.pendingIntent = router.explicitIntent && router.intent !== 'GENERAL_QUESTION' ? router.intent : previousPendingIntent;
      session.pendingComponentId = router.component?.id || previousPendingComponentId;
      // A plain category switch starts a fresh topic. Do not let the previous
      // product's intent/component silently steer the next answer.
      if (!router.explicitIntent) delete session.lastIntent;
    }
  }

  if (router.product && router.conversationMode !== 'MULTI_PRODUCT') {
    const p = products.find(x => x.id === router.product!.id);
    if (p) {
      const category = getProductCategory(p, taxonomy);
      const isSwitch = !!previousProductId && previousProductId !== p.id;
      const contextualSwitch = isSwitch && !router.explicitIntent && !router.categorySelection &&
        (reasoning.isContextualFollowUp || reference.isReferenceFollowUp);
      session.currentProductId = p.id;
      session.currentProduct = p.name;
      session.productSelectionConfirmed = true;
      session.currentCategoryId = category?.id;
      session.currentCategory = category?.name;
      if (router.component) {
        const c = taxonomy.componentTypes.find(x => x.id === router.component!.id);
        session.currentComponentId = c?.id;
        session.currentComponent = c?.name || c?.label;
      } else if (contextualSwitch && previousComponentId) {
        // "Còn sản phẩm B thì sao?" intentionally carries the active topic.
        session.currentComponentId = previousComponentId;
        session.currentComponent = previousComponent;
      } else if (isSwitch) {
        // A genuine new-product request starts a new product flow.
        delete session.currentComponentId;
        delete session.currentComponent;
      }
    }
  }

  // A clearly stated intent belongs to THIS turn and must outrank any component
  // left over from the previous flow. Clear stale state first; a matching component
  // for the new question can be resolved again below. This prevents an old
  // "Biểu phí" component from hijacking age/eligibility/procedure questions even
  // when older sessions did not persist `lastIntent` correctly.
  if (!router.component && router.explicitIntent) {
    delete session.currentComponentId;
    delete session.currentComponent;
  }

  const activeProductId = session.productSelectionConfirmed ? session.currentProductId : undefined;
  const activeProduct = activeProductId ? products.find(p => p.id === activeProductId) : undefined;
  const activeCategory = activeProduct ? getProductCategory(activeProduct, taxonomy) :
    (session.currentCategoryId ? taxonomy.categories.find(c => c.id === session.currentCategoryId) || null : null);

  // Deterministic catalog/selection answers terminate here; no second router/AI
  // path may ask the same selection question again.
  let directResponse: DirectChatResponse | undefined;
  if (router.intent === 'PRODUCT_LIST') {
    const list = products.slice().sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name, 'vi'));
    directResponse = { reply:`Dạ, hiện Kho tri thức có **${list.length} sản phẩm nghiệp vụ**:\n\n${list.map((p,i)=>`${i+1}. ${p.name}`).join('\n')}` };
  } else if (router.intent === 'PRODUCT_CATEGORY' && router.product) {
    const p = products.find(x => x.id === router.product!.id)!;
    const c = getProductCategory(p, taxonomy);
    directResponse = { reply:c ? `Dạ, **${p.name}** thuộc danh mục **${c.name}**.` : `Dạ, sản phẩm **${p.name}** hiện chưa được gán danh mục trong Taxonomy.` };
  } else if (router.categorySelection && router.category && !router.product) {
    const list = categorySelectionProducts;
    directResponse = {
      reply:list.length
        ? `Dạ, em đã chuyển sang nhóm **${router.category.name}**. Hiện có **${list.length} sản phẩm** phù hợp; anh/chị chọn hoặc nhập tên sản phẩm để em đi thẳng vào đúng flow:\n\n${list.map((p,i)=>`${i+1}. ${p.name}`).join('\n')}`
        : `Dạ, em đã nhận nhóm **${router.category.name}**, nhưng hiện Taxonomy chưa có sản phẩm đang hoạt động trong nhóm này.`,
      needsProductSelection:list.length > 0,
      productOptions:list.map(p=>({id:p.id,name:p.name})),
    };
  } else if (router.intent === 'CATEGORY_PRODUCTS' && router.category) {
    const list = getProductsForCategory(router.category.id, taxonomy);
    directResponse = {
      reply:list.length ? `Dạ, danh mục **${router.category.name}** hiện có **${list.length} sản phẩm**:\n\n${list.map((p,i)=>`${i+1}. ${p.name}`).join('\n')}` : `Dạ, hiện chưa có sản phẩm nào được gán vào danh mục **${router.category.name}**.`,
      productOptions:list.map(p=>({id:p.id,name:p.name})),
    };
  } else if (router.requiresProductSelection) {
    session.awaitingProductSelection = true;
    session.pendingIntent = router.intent !== 'GENERAL_QUESTION' ? router.intent : undefined;
    session.pendingComponentId = router.component?.id;
    session.pendingCategoryId = router.category?.id;
    directResponse = {
      reply: router.usePricing ? 'Dạ, anh/chị muốn xem biểu phí của sản phẩm nào? Vui lòng chọn hoặc nhập tên sản phẩm.' : 'Dạ, anh/chị muốn xem thông tin của sản phẩm nào? Vui lòng chọn hoặc nhập tên sản phẩm.',
      needsProductSelection:true,
      productOptions:router.category ? getProductsForCategory(router.category.id,taxonomy).map(p=>({id:p.id,name:p.name})) : products.map(p=>({id:p.id,name:p.name})),
    };
  }

  // Dynamic component resolution runs exactly once, after product resolution.
  if (!directResponse && !router.component) {
    const dynamic = resolveDynamicComponent(message, taxonomy, knowledgeItems, activeProductId);
    if (dynamic) {
      const candidate = taxonomy.componentTypes.find(x => x.id === dynamic.component.id);
      // Component matching is lexical and can be fooled by a pricing chunk that
      // contains generic words such as "tuổi/tham gia". A strong current intent
      // is authoritative: non-pricing questions are never allowed to re-enter the
      // pricing component merely because old/overlapping knowledge scored highly.
      if (!(router.explicitIntent && NON_PRICING_INTENTS.has(router.intent) && isPricingComponent(candidate))) {
        router.component = { id:dynamic.component.id, name:dynamic.component.name, matchedBy:dynamic.source === 'knowledge' ? 'keyword' : 'alias' };
        router.confidence = Math.max(router.confidence || 0, dynamic.confidence);
      }
    }
  }
  if (router.component) {
    const c = taxonomy.componentTypes.find(x => x.id === router.component!.id);
    if (router.explicitIntent && NON_PRICING_INTENTS.has(router.intent) && isPricingComponent(c)) {
      router.component = null;
      delete session.currentComponentId;
      delete session.currentComponent;
    } else {
      session.currentComponentId = c?.id;
      session.currentComponent = c?.name || c?.label;
    }
  }

  // GENERAL_QUESTION is not a strong new intent. On a true contextual follow-up,
  // inherit the prior intent/component; on a fresh product/category switch, do not.
  if (router.intent === 'GENERAL_QUESTION' && reference.preserveIntent && session.lastIntent && !router.categorySelection) {
    router.intent = session.lastIntent as any;
  } else if (router.intent !== 'GENERAL_QUESTION') {
    session.lastIntent = router.intent;
  } else if (router.conversationMode === 'SWITCH' && !reference.isReferenceFollowUp) {
    delete session.lastIntent;
  }
  if (!router.component && reference.preserveComponent && session.currentComponentId && !router.explicitIntent && !router.categorySelection) {
    const c = taxonomy.componentTypes.find(x => x.id === session.currentComponentId);
    if (c) router.component = { id:c.id, name:c.name || c.label || c.id, matchedBy:'keyword' };
  }

  if (!directResponse && (session.productSelectionConfirmed || router.component || router.intent)) {
    session.topicStack = upsertTopicFrame(session.topicStack as any, {
      productId:session.productSelectionConfirmed ? session.currentProductId : undefined,
      productName:session.productSelectionConfirmed ? session.currentProduct : undefined,
      componentId:router.component?.id || session.currentComponentId,
      componentName:router.component?.name || session.currentComponent,
      intent:router.intent || session.lastIntent,
      subjectId:session.activeConversationSubject || 'self',
    }) as any;
    session.activeTopicIndex = Math.max(0, session.topicStack.length - 1);
  }

  const comparisonIds = router.conversationMode === 'MULTI_PRODUCT'
    ? router.products.map(p=>p.id).filter(id=>products.some(p=>p.id===id)) : [];
  let scopedKnowledge = comparisonIds.length >= 2
    ? comparisonIds.flatMap(productId => {
        const p = products.find(x=>x.id===productId);
        const c = p ? getProductCategory(p,taxonomy) : null;
        return filterKnowledgeByTaxonomy(knowledgeItems,taxonomy,productId,session.currentComponentId,c?.id);
      })
    : filterKnowledgeByTaxonomy(knowledgeItems,taxonomy,activeProductId,session.currentComponentId,activeCategory?.id);

  // When a strong intent exists but Taxonomy has no explicit matching component,
  // rank the product-scoped knowledge by the current question instead of handing
  // Gemini every old topic. For non-pricing intents, drop pricing chunks whenever
  // there is other relevant evidence. This is the final guard against fee answers
  // hijacking eligibility/procedure questions.
  if (router.conversationMode !== 'MULTI_PRODUCT' && activeProductId && !session.currentComponentId &&
      router.intent !== 'GENERAL_QUESTION' && scopedKnowledge.length > 0) {
    const ranked = rankKnowledgeDynamically(message, scopedKnowledge, taxonomy, undefined, Math.min(8, scopedKnowledge.length));
    const pricingIntent = router.intent === 'PRODUCT_PREMIUM' || router.intent === 'CALCULATE_PREMIUM';
    if (!pricingIntent) {
      const nonPricing = ranked.filter((item:any) => !/pricing|premium|bieu phi|biểu phí|phi bao hiem|phí bảo hiểm/.test(
        `${item.componentType || ''} ${item.topic || ''}`.toLowerCase()));
      // Fail closed instead of feeding a pricing-only document into an
      // eligibility/procedure/benefit turn. If the KB lacks the requested
      // non-pricing fact, Gemini should say that fact is unavailable rather than
      // drift back to fees merely because the fee chunk was the only evidence.
      scopedKnowledge = nonPricing;
    } else scopedKnowledge = ranked;
  }

  // Fail closed on cross-product leakage.
  if (router.conversationMode !== 'MULTI_PRODUCT' && activeProductId && scopedKnowledge.some((item:any)=>item.productId && item.productId !== activeProductId)) {
    scopedKnowledge.length = 0;
  }

  return {
    router, conversationReasoning:reasoning,
    activeProductId,
    activeProductName:activeProduct?.name,
    activeCategoryId:activeCategory?.id,
    scopedKnowledge,
    directResponse,
  };
}
