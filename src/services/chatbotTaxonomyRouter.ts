import type {
  KnowledgeItem,
  KnowledgeTaxonomyData,
  TaxonomyProduct,
  TaxonomyCategory,
  TaxonomyComponentType,
} from '../types';
import { normalizeText, detectIntent, type RuleIntent } from './ruleBasedChat';

export type MatchedBy = 'canonicalName' | 'alias' | 'tag' | 'keyword' | 'normalizedName' | 'label';

export interface ResolvedEntity<T> {
  entity: T;
  matchedBy: MatchedBy;
  matchedText: string;
  confidence: number;
}

export interface ChatRouterResult {
  intent: RuleIntent | 'PRODUCT_LIST' | 'CATEGORY_PRODUCTS' | 'PRODUCT_CATEGORY' | 'GENERAL_QUESTION';
  confidence: number;
  product: { id: string; name: string; matchedBy: MatchedBy } | null;
  products: Array<{ id: string; name: string; matchedBy: MatchedBy }>;
  conversationMode: 'KEEP' | 'SWITCH' | 'MULTI_PRODUCT' | 'NONE';
  category: { id: string; name: string; matchedBy?: MatchedBy } | null;
  component: { id: string; name: string; matchedBy?: MatchedBy } | null;
  useKnowledge: boolean;
  usePricing: boolean;
  useExternalSearch: boolean;
  requiresProductSelection: boolean;
  requiresAIResolver: boolean;
  productSpecific: boolean;
  /** Exact/near-exact category answer such as "Tài sản" / "Bảo hiểm tài sản". */
  categorySelection?: boolean;
  /** Intent was stated in the current turn, not merely inherited from conversation state. */
  explicitIntent?: boolean;
}

export function normalizeEntityText(value: unknown): string {
  return normalizeText(String(value ?? ''));
}

function entityTerms(entity: any, nameField = 'name', labelField = 'label'): Array<{ value: string; matchedBy: MatchedBy }> {
  const result: Array<{ value: string; matchedBy: MatchedBy }> = [];
  const canonical = entity?.[nameField] || entity?.[labelField] || '';
  if (canonical) result.push({ value: normalizeEntityText(canonical), matchedBy: 'canonicalName' });
  if (entity?.normalizedName) result.push({ value: normalizeEntityText(entity.normalizedName), matchedBy: 'normalizedName' });
  for (const key of ['aliases', 'tags', 'keywords']) {
    for (const value of Array.isArray(entity?.[key]) ? entity[key] : []) {
      if (value) result.push({ value: normalizeEntityText(value), matchedBy: key === 'aliases' ? 'alias' : key === 'tags' ? 'tag' : 'keyword' });
    }
  }
  if (labelField && entity?.[labelField]) result.push({ value: normalizeEntityText(entity[labelField]), matchedBy: 'label' });
  return result.filter((x) => x.value.length >= 2);
}

function resolveEntity<T extends object>(
  query: string,
  entities: T[],
  nameField = 'name',
  labelField = 'label',
): ResolvedEntity<T> | null {
  const normalized = normalizeEntityText(query);
  if (!normalized) return null;
  const candidates: Array<ResolvedEntity<T> & { termLength: number }> = [];
  for (const entity of entities as any[]) {
    for (const term of entityTerms(entity, nameField, labelField)) {
      if (normalized.includes(term.value)) {
        const exact = normalized === term.value;
        const confidence = exact
          ? 1
          : term.matchedBy === 'canonicalName' || term.matchedBy === 'normalizedName'
            ? Math.min(0.99, 0.78 + term.value.length / 100)
            : Math.min(0.94, 0.68 + term.value.length / 100);
        candidates.push({
          entity,
          matchedBy: term.matchedBy,
          matchedText: term.value,
          confidence,
          termLength: term.value.length,
        });
      }
    }
  }
  // Conservative typo tolerance for CMS entities. It is used only when no
  // canonical/alias substring matched, requires a long enough term, and compares
  // against contiguous word windows so a typo can be resolved without turning
  // arbitrary chat text into a product switch.
  if (!candidates.length) {
    const distance = (a:string,b:string) => {
      const dp=Array.from({length:b.length+1},(_,j)=>j);
      for(let i=1;i<=a.length;i++){
        let prev=dp[0]; dp[0]=i;
        for(let j=1;j<=b.length;j++){
          const tmp=dp[j];
          dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
          prev=tmp;
        }
      }
      return dp[b.length];
    };
    const words=normalized.split(/\s+/).filter(Boolean);
    for (const entity of entities as any[]) {
      for (const term of entityTerms(entity, nameField, labelField)) {
        if (term.value.length < 5) continue;
        const tw=term.value.split(/\s+/).filter(Boolean);
        const sizes=[tw.length-1,tw.length,tw.length+1].filter(x=>x>0);
        let bestSimilarity=0;
        for(const size of sizes){
          for(let i=0;i+size<=words.length;i++){
            const window=words.slice(i,i+size).join(' ');
            const maxLen=Math.max(window.length,term.value.length);
            if(!maxLen) continue;
            bestSimilarity=Math.max(bestSimilarity,1-distance(window,term.value)/maxLen);
          }
        }
        if(bestSimilarity>=0.88){
          candidates.push({ entity, matchedBy: term.matchedBy, matchedText:term.value, confidence:Math.min(0.89,bestSimilarity), termLength:term.value.length });
        }
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence || b.termLength - a.termLength);
  const best = candidates[0];
  return best ? {
    entity: best.entity,
    matchedBy: best.matchedBy,
    matchedText: best.matchedText,
    confidence: best.confidence,
  } : null;
}

export function getProductCategory(
  product: TaxonomyProduct,
  taxonomy: KnowledgeTaxonomyData,
): TaxonomyCategory | null {
  if (product.categoryId) {
    const byId = taxonomy.categories.find((c) => c.id === product.categoryId);
    if (byId) return byId;
  }
  const categoryValue = normalizeEntityText(product.category || product.categoryCode || '');
  if (!categoryValue) return null;
  return taxonomy.categories.find((c) =>
    [c.name, c.code, ...(c.aliases || []), ...(c.tags || []), ...(c.keywords || [])]
      .filter(Boolean)
      .some((v) => normalizeEntityText(v) === categoryValue),
  ) || taxonomy.categories.find((c) => normalizeEntityText(c.name) === categoryValue) || null;
}

export function resolveProduct(query: string, taxonomy: KnowledgeTaxonomyData): ResolvedEntity<TaxonomyProduct> | null {
  return resolveEntity(query, taxonomy.products.filter((p) => p.active !== false));
}

export function resolveProducts(query: string, taxonomy: KnowledgeTaxonomyData): ResolvedEntity<TaxonomyProduct>[] {
  const normalized = normalizeEntityText(query);
  if (!normalized) return [];
  const matches: ResolvedEntity<TaxonomyProduct>[] = [];
  for (const product of taxonomy.products.filter((p) => p.active !== false)) {
    const hit = resolveEntity(query, [product]);
    if (hit) matches.push(hit);
  }
  const unique = new Map<string, ResolvedEntity<TaxonomyProduct>>();
  for (const hit of matches.sort((a, b) => b.confidence - a.confidence)) {
    if (!unique.has(hit.entity.id)) unique.set(hit.entity.id, hit);
  }
  return [...unique.values()];
}

export function resolveCategory(query: string, taxonomy: KnowledgeTaxonomyData): ResolvedEntity<TaxonomyCategory> | null {
  const categories = taxonomy.categories.filter((c) => c.active !== false);
  const direct = resolveEntity(query, categories);
  if (direct) return direct;

  // Customers naturally answer a category prompt with a short noun such as
  // "Tài sản" even when CMS stores the canonical label as "Bảo hiểm Tài sản".
  // Resolve that short label deterministically so typing the answer has the same
  // effect as clicking a category suggestion and does not require a second prompt.
  const normalized = normalizeEntityText(query);
  if (!normalized) return null;
  const wrappers = (term:string) => [
    term, `bao hiem ${term}`, `toi quan tam ${term}`, `toi quan tam bao hiem ${term}`,
    `minh quan tam ${term}`, `chon ${term}`, `can tu van ${term}`, `can tu van bao hiem ${term}`,
  ];
  const candidates = categories.flatMap((category) => {
    const rawTerms = [category.name, category.normalizedName, category.code, ...(category.aliases || []), ...(category.tags || []), ...(category.keywords || [])]
      .filter(Boolean).map(normalizeEntityText).filter(Boolean);
    const variants = [...new Set(rawTerms.flatMap((term) => {
      const short = term.replace(/^(bao hiem|nhom bao hiem|danh muc bao hiem|nhom|danh muc)\s+/, '').trim();
      return short && short !== term ? [term, short] : [term];
    }))];
    return variants.filter((term) => term.length >= 2 && wrappers(term).includes(normalized)).map((term) => ({
      entity: category,
      matchedBy: 'alias' as MatchedBy,
      matchedText: term,
      confidence: normalized === term ? 0.98 : 0.94,
    }));
  });
  candidates.sort((a,b)=>b.confidence-a.confidence || b.matchedText.length-a.matchedText.length);
  return candidates[0] || null;
}

export function resolveComponent(query: string, taxonomy: KnowledgeTaxonomyData): ResolvedEntity<TaxonomyComponentType> | null {
  return resolveEntity(query, taxonomy.componentTypes.filter((c) => c.active !== false), 'name', 'label');
}

function hasAny(normalized: string, terms: string[]): boolean {
  return terms.some((term) => normalized.includes(normalizeEntityText(term)));
}

function isProductSpecificIntent(intent: RuleIntent, normalized: string): boolean {
  return intent !== 'GENERAL_QUESTION' || hasAny(normalized, [
    'quyen loi', 'duoc huong', 'bao ve', 'loai tru', 'khong chi tra',
    'thoi gian cho', 'phi bao nhieu', 'bao phi', 'bieu phi', 'tinh phi',
    'thu tuc', 'boi thuong', 'dieu khoan', 'quy tac', 'doi tuong', 'tham gia',
  ]);
}

export function routeChatMessage(
  message: string,
  taxonomy: KnowledgeTaxonomyData,
  activeProductId?: string | null,
): ChatRouterResult {
  const normalized = normalizeEntityText(message);
  const rule = detectIntent(message);
  const productMatches = resolveProducts(message, taxonomy);
  const productMatch = productMatches[0] || null;
  const categoryMatch = resolveCategory(message, taxonomy);
  const componentMatch = resolveComponent(message, taxonomy);

  // Treat a typed category answer exactly like a category suggestion/button.
  // This is deliberately conservative: the message must essentially be the
  // category name (optionally wrapped in natural selection language), so a
  // random occurrence of a category word inside a long question cannot reset
  // an established product context.
  const categoryTerm = categoryMatch?.matchedText || '';
  const categorySelectionPhrases = categoryTerm ? [
    categoryTerm, `bao hiem ${categoryTerm}`, `toi quan tam ${categoryTerm}`, `toi quan tam bao hiem ${categoryTerm}`,
    `minh quan tam ${categoryTerm}`, `minh quan tam bao hiem ${categoryTerm}`, `chon ${categoryTerm}`,
    `can tu van ${categoryTerm}`, `can tu van bao hiem ${categoryTerm}`, `muon hoi ${categoryTerm}`,
    `muon hoi bao hiem ${categoryTerm}`, `dang can ${categoryTerm}`, `tim ${categoryTerm}`,
  ] : [];
  const categorySelection = !!categoryMatch && !productMatch && categorySelectionPhrases.includes(normalized);

  // Product-catalog questions are deterministic and MUST never fall through to AI.
  // Keep this resolver broad enough to cover natural Vietnamese variants such as
  // "có mấy sản phẩm", "bao nhiêu SP", "bên mình bán những gì" and
  // "danh sách các sản phẩm" without maintaining a product-name list here.
  const productList =
    hasAny(normalized, [
      'co may san pham', 'co bao nhieu san pham', 'hien co nhung san pham nao',
      'danh sach san pham', 'ben minh co san pham gi', 'co nhung san pham nao',
      'nhung san pham nao', 'cac san pham', 'danh sach cac san pham',
      'bao nhieu sp', 'co may sp', 'ben minh ban gi', 'dang co san pham gi',
    ]) ||
    /\b(co|hien|dang)\b.*\b(may|bao nhieu)\b.*\b(san pham|sp)\b/.test(normalized) ||
    /\b(danh sach|list)\b.*\b(san pham|sp)\b/.test(normalized);
  const categoryProducts = hasAny(normalized, [
    'nhung san pham', 'san pham nao', 'co nhung', 'co san pham nao',
  ]) && !!categoryMatch && !productMatch;
  const productCategory = !!productMatch && hasAny(normalized, [
    'la san pham gi', 'thuoc danh muc nao', 'thuoc nhom nao', 'danh muc',
    'nhom san pham', 'loai san pham',
  ]);

  const usePricing = rule.intent === 'CALCULATE_PREMIUM' || rule.intent === 'PRODUCT_PREMIUM' ||
    hasAny(normalized, ['phi bao nhieu', 'bao phi', 'tinh phi', 'bieu phi', 'muc phi', 'gia bao nhieu', 'dong bao nhieu']);
  const productSpecific = isProductSpecificIntent(rule.intent, normalized) || !!productMatch || !!componentMatch;
  const requiresProductSelection = productSpecific && !productMatch && !activeProductId && !categorySelection &&
    !productList && !categoryProducts && !productCategory;

  const comparisonLanguage = hasAny(normalized, ['so sanh', 'khac nhau', 'khac gi', 'voi nhau', 'giua', 'hay hon', 'con san pham']) || /\b(va|voi)\b/.test(normalized);
  const conversationMode: ChatRouterResult['conversationMode'] = productMatches.length >= 2 && comparisonLanguage
    ? 'MULTI_PRODUCT'
    : productMatch && activeProductId && productMatch.entity.id !== activeProductId
      ? 'SWITCH'
      : productMatch
        ? 'KEEP'
        : activeProductId
          ? 'KEEP'
          : 'NONE';

  let intent: ChatRouterResult['intent'] = productList
    ? 'PRODUCT_LIST'
    : categoryProducts
      ? 'CATEGORY_PRODUCTS'
      : productCategory
        ? 'PRODUCT_CATEGORY'
        : rule.intent;

  return {
    intent,
    confidence: productMatch?.confidence || categoryMatch?.confidence || componentMatch?.confidence || rule.confidence,
    products: productMatches.map((match) => ({ id: match.entity.id, name: match.entity.name, matchedBy: match.matchedBy })),
    conversationMode,
    product: productMatch ? {
      id: productMatch.entity.id,
      name: productMatch.entity.name,
      matchedBy: productMatch.matchedBy,
    } : null,
    category: categoryMatch ? {
      id: categoryMatch.entity.id,
      name: categoryMatch.entity.name,
      matchedBy: categoryMatch.matchedBy,
    } : null,
    component: componentMatch ? {
      id: componentMatch.entity.id,
      name: componentMatch.entity.name || componentMatch.entity.label,
      matchedBy: componentMatch.matchedBy,
    } : null,
    useKnowledge: !productList && !categoryProducts && !productCategory,
    usePricing,
    useExternalSearch: false,
    requiresProductSelection,
    requiresAIResolver: !productMatch && !categoryMatch && !componentMatch && rule.intent === 'GENERAL_QUESTION',
    productSpecific,
    categorySelection,
    explicitIntent: rule.intent !== 'GENERAL_QUESTION',
  };
}

export function getProductsForCategory(
  categoryId: string,
  taxonomy: KnowledgeTaxonomyData,
): TaxonomyProduct[] {
  const category = taxonomy.categories.find((c) => c.id === categoryId);
  if (!category) return [];
  return taxonomy.products.filter((p) => {
    if (p.active === false) return false;
    if (p.categoryId === categoryId) return true;
    return getProductCategory(p, taxonomy)?.id === categoryId;
  });
}

export function enrichTaxonomyRelationships(taxonomy: KnowledgeTaxonomyData): KnowledgeTaxonomyData {
  return {
    ...taxonomy,
    products: taxonomy.products.map((p) => {
      const category = getProductCategory(p, taxonomy);
      return {
        ...p,
        categoryId: p.categoryId || category?.id,
        normalizedName: p.normalizedName || normalizeEntityText(p.name),
      };
    }),
    categories: taxonomy.categories.map((c) => ({
      ...c,
      normalizedName: c.normalizedName || normalizeEntityText(c.name),
    })),
    componentTypes: taxonomy.componentTypes.map((c) => ({
      ...c,
      name: c.name || c.label,
      normalizedName: c.normalizedName || normalizeEntityText(c.name || c.label),
    })),
  };
}

export function filterKnowledgeByTaxonomy(
  items: KnowledgeItem[],
  taxonomy: KnowledgeTaxonomyData,
  productId?: string | null,
  componentId?: string | null,
  categoryId?: string | null,
): KnowledgeItem[] {
  const products = taxonomy.products;
  const product = productId ? products.find((p) => p.id === productId) : null;
  const category = categoryId ? taxonomy.categories.find((c) => c.id === categoryId) : null;
  const component = componentId ? taxonomy.componentTypes.find((c) => c.id === componentId) : null;
  const productName = normalizeEntityText(product?.name);
  const categoryName = normalizeEntityText(category?.name);
  const componentCode = normalizeEntityText(component?.code);
  const componentName = normalizeEntityText(component?.name || component?.label);

  const isApproved = (item: any) => {
    if (!item || item.active === false || item.enabled === false) return false;
    if (item.status && String(item.status).toLowerCase() !== 'published') return false;
    const now = Date.now();
    if (item.effectiveDate && new Date(item.effectiveDate).getTime() > now) return false;
    if (item.expiryDate && new Date(item.expiryDate).getTime() < now) return false;
    return true;
  };
  const resolveProductIdFromItem = (item: any) => {
    if (item.productId) return String(item.productId);
    const match = products.find((p) =>
      [p.name, p.normalizedName, ...(p.aliases || []), ...(p.tags || []), ...(p.keywords || [])]
        .filter(Boolean)
        .some((value) => normalizeEntityText(value) === normalizeEntityText(item.product)),
    );
    return match?.id;
  };
  const resolveCategoryIdFromItem = (item: any) => {
    if (item.categoryId) return String(item.categoryId);
    const match = taxonomy.categories.find((c) =>
      [c.name, c.normalizedName, c.code, ...(c.aliases || []), ...(c.tags || []), ...(c.keywords || [])]
        .filter(Boolean)
        .some((value) => normalizeEntityText(value) === normalizeEntityText(item.category)),
    );
    return match?.id;
  };

  return items.filter((item) => {
    if (!isApproved(item)) return false;
    if (productId && resolveProductIdFromItem(item) !== productId) return false;
    if (categoryId && resolveCategoryIdFromItem(item) !== categoryId) return false;
    if (componentId) {
      const itemComponentId = item.componentId ||
        taxonomy.componentTypes.find((c) =>
          normalizeEntityText(c.code) === componentCode ||
          normalizeEntityText(c.name || c.label) === normalizeEntityText(item.topic) ||
          normalizeEntityText(c.label) === normalizeEntityText(item.topic) ||
          (Array.isArray(c.aliases) && c.aliases.some((alias) => normalizeEntityText(alias) === normalizeEntityText(item.topic)))
        )?.id;
      if (itemComponentId !== componentId && normalizeEntityText(item.componentType) !== componentCode) return false;
    }
    if (productName && resolveProductIdFromItem(item) !== productId) return false;
    if (categoryName && resolveCategoryIdFromItem(item) !== categoryId) return false;
    return true;
  });
}
