import type { KnowledgeTaxonomyData } from '../types';
import type { ChatRouterResult } from './chatbotTaxonomyRouter';
import { normalizeEntityText } from './chatbotTaxonomyRouter';
import { resolveChatTaxonomyCandidatesWithAI, isGeminiAvailable } from './geminiServer';

export interface SemanticResolverResult {
  usedAI: boolean;
  accepted: boolean;
  confidence: number;
  productId?: string;
  categoryId?: string;
  componentId?: string;
  intent?: string;
  reason?: string;
}

const validId = (id: unknown, list: Array<{id:string}>) => typeof id === 'string' && list.some(x => x.id === id);

/**
 * Step 9: AI is only a candidate resolver. It receives a closed set of CMS IDs
 * and may select from that set; every returned ID is validated again here.
 * It can never create a Product/Category/Component or write Product Facts.
 */
export async function resolveSemanticTaxonomyCandidates(params: {
  message: string;
  router: ChatRouterResult;
  taxonomy: KnowledgeTaxonomyData;
  activeProductId?: string | null;
  activeComponentId?: string | null;
}): Promise<SemanticResolverResult> {
  const { message, router, taxonomy } = params;

  // Deterministic exact/high-confidence taxonomy matches always win. AI is a
  // fallback for unresolved/ambiguous natural language, never the primary router.
  // Do not spend a separate Gemini call on clearly general conversation.
  // The answer model can handle those turns directly. Semantic AI resolution is
  // reserved for turns that actually need a closed-set taxonomy decision.
  const needsResolution = router.requiresAIResolver ||
    (!router.component && router.productSpecific) ||
    (!router.product && !params.activeProductId && router.productSpecific && router.confidence < 0.72);
  if (!needsResolution) return { usedAI:false, accepted:false, confidence:0, reason:'deterministic-sufficient' };
  if (!isGeminiAvailable()) return { usedAI:false, accepted:false, confidence:0, reason:'ai-unavailable' };

  const products = taxonomy.products.filter(p => p.active !== false).map(p => ({
    id:p.id, name:p.name, aliases:p.aliases || [], tags:p.tags || [], keywords:p.keywords || [],
  }));
  const categories = taxonomy.categories.filter(c => c.active !== false).map(c => ({
    id:c.id, name:c.name, aliases:c.aliases || [], tags:c.tags || [], keywords:c.keywords || [],
  }));
  const components = taxonomy.componentTypes.filter(c => c.active !== false).map(c => ({
    id:c.id, name:c.name || c.label || c.id, aliases:c.aliases || [], tags:c.tags || [], keywords:c.keywords || [],
  }));

  try {
    const raw = await resolveChatTaxonomyCandidatesWithAI({
      message,
      activeProductId: params.activeProductId || null,
      activeComponentId: params.activeComponentId || null,
      products, categories, components,
    });
    const confidence = Math.max(0, Math.min(1, Number(raw?.confidence || 0)));
    // Low-confidence AI suggestions are intentionally ignored. This prevents
    // semantic guesses from silently changing the active product/component.
    if (confidence < 0.74) return { usedAI:true, accepted:false, confidence, reason:'low-confidence' };

    const productId = validId(raw?.productId, products) ? raw.productId : undefined;
    const categoryId = validId(raw?.categoryId, categories) ? raw.categoryId : undefined;
    const componentId = validId(raw?.componentId, components) ? raw.componentId : undefined;

    // If AI returned an unknown ID, discard it instead of fuzzy-mapping/inventing.
    const returnedUnknown = (!!raw?.productId && !productId) || (!!raw?.categoryId && !categoryId) || (!!raw?.componentId && !componentId);
    if (returnedUnknown) return { usedAI:true, accepted:false, confidence, reason:'invalid-taxonomy-id' };

    // Do not let AI switch an already confirmed product unless the message has
    // lexical evidence for that candidate. Explicit deterministic product mention
    // remains the only authority for product switching.
    if (productId && params.activeProductId && productId !== params.activeProductId) {
      const p = products.find(x => x.id === productId)!;
      const n = normalizeEntityText(message);
      const terms = [p.name, ...p.aliases, ...p.tags, ...p.keywords].map(normalizeEntityText).filter(Boolean);
      if (!terms.some(t => n.includes(t))) {
        return { usedAI:true, accepted:false, confidence, reason:'ai-product-switch-blocked' };
      }
    }

    const allowedIntents = new Set([
      'PRODUCT_OVERVIEW','PRODUCT_BENEFIT','PRODUCT_EXCLUSION','PRODUCT_ELIGIBILITY','PRODUCT_PARTICIPANT',
      'PRODUCT_PREMIUM','PRODUCT_RENEWAL','PRODUCT_PROCEDURE','PRODUCT_CLAIM','PRODUCT_LIABILITY',
      'PRODUCT_RULE','PRODUCT_TERM','CALCULATE_PREMIUM','GENERAL_QUESTION',
    ]);
    const intent = typeof raw?.intent === 'string' && allowedIntents.has(raw.intent) ? raw.intent : undefined;

    return {
      usedAI:true,
      accepted: !!(productId || categoryId || componentId || intent),
      confidence,
      productId, categoryId, componentId,
      intent,
      reason: typeof raw?.reason === 'string' ? raw.reason : 'validated',
    };
  } catch {
    return { usedAI:true, accepted:false, confidence:0, reason:'resolver-failed' };
  }
}
