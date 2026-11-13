import test from 'node:test';
import assert from 'node:assert/strict';
import { orchestrateConversationTurn } from '../src/services/chatbotConversationOrchestrator';
import type { ChatSession, KnowledgeItem, KnowledgeTaxonomyData } from '../src/types';

const taxonomy: KnowledgeTaxonomyData = {
  categories: [
    { id:'life', name:'Nhân thọ', aliases:['con người'], active:true } as any,
    { id:'asset', name:'Bảo hiểm Tài sản', aliases:['tài sản','bảo hiểm tài sản'], active:true } as any,
  ],
  products: [
    { id:'cat-tuong', name:'Bảo Cát Tường - Bảo An Khang', categoryId:'life', active:true, order:1 } as any,
    { id:'home1', name:'Bảo hiểm Nhà Tư Nhân', aliases:['nhà tư nhân'], categoryId:'asset', active:true, order:1 } as any,
    { id:'home2', name:'Bảo hiểm Cháy Nổ Tài Sản', aliases:['cháy nổ tài sản'], categoryId:'asset', active:true, order:2 } as any,
  ],
  componentTypes: [
    { id:'premium', name:'Biểu phí', code:'pricing', aliases:['biểu phí','phí bảo hiểm'], active:true } as any,
    { id:'participant', name:'Đối tượng tham gia', code:'participant', aliases:['đối tượng','độ tuổi tham gia'], active:true } as any,
    { id:'procedure', name:'Quy trình tham gia', code:'procedure', aliases:['quy trình tham gia','thủ tục tham gia'], active:true } as any,
    { id:'benefit', name:'Quyền lợi', code:'benefit', aliases:['quyền lợi'], active:true } as any,
  ],
} as any;

const product = (id:string) => taxonomy.products.find((p:any)=>p.id===id)! as any;
const category = (id:string) => taxonomy.categories.find((c:any)=>c.id===id)! as any;
const k = (id:string, productId:string, componentId:string, topic:string, content:string): KnowledgeItem => ({
  id, title:topic, productId, product:product(productId).name,
  categoryId:product(productId).categoryId, category:category(product(productId).categoryId).name,
  componentId, componentType:componentId==='premium'?'pricing':componentId,
  topic, content, tags:[], active:true, status:'published',
  createdAt:'2026-01-01T00:00:00.000Z', updatedAt:'2026-01-01T00:00:00.000Z',
} as any);

const knowledge: KnowledgeItem[] = [
  k('old-price','cat-tuong','premium','Biểu phí','Bảng phí cũ'),
  k('h1-part','home1','participant','Đối tượng tham gia','Từ 18 đến 70 tuổi.'),
  k('h1-proc','home1','procedure','Quy trình tham gia','Khai thông tin, nộp hồ sơ, xác nhận.'),
  k('h1-price','home1','premium','Biểu phí','Biểu phí theo tuổi và gói.'),
  k('h2-part','home2','participant','Đối tượng tham gia','Đối tượng bảo hiểm tài sản.'),
];

function session(partial: Partial<ChatSession>): ChatSession {
  return { id:'s', messages:[], status:'ai_active', aiDropped:false, unreadByStaff:false, createdAt:'2026-01-01T00:00:00.000Z', updatedAt:'2026-01-01T00:00:00.000Z', ...partial } as any;
}

test('typed category selection clears stale deep-product context', async () => {
  const s = session({ productSelectionConfirmed:true, currentProductId:'cat-tuong', currentProduct:product('cat-tuong').name, currentCategoryId:'life', currentCategory:'Nhân thọ', currentComponentId:'premium', currentComponent:'Biểu phí', lastIntent:'PRODUCT_PREMIUM' });
  const r = await orchestrateConversationTurn({ message:'tài sản', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(r.activeProductId, undefined);
  assert.equal(s.currentCategoryId, 'asset');
  assert.equal(s.currentComponentId, undefined);
  assert.deepEqual(r.directResponse?.productOptions?.map(x=>x.id), ['home1','home2']);
});

test('typed text follows the same selection hand-off as suggestion buttons', async () => {
  const s = session({ productSelectionConfirmed:false });
  const first = await orchestrateConversationTurn({ message:'đối tượng', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(first.router.intent, 'PRODUCT_PARTICIPANT');
  assert.equal(s.pendingIntent, 'PRODUCT_PARTICIPANT');

  const categoryTurn = await orchestrateConversationTurn({ message:'tài sản', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(categoryTurn.directResponse?.needsProductSelection, true);
  assert.equal(s.pendingIntent, 'PRODUCT_PARTICIPANT');

  const productTurn = await orchestrateConversationTurn({ message:'Bảo hiểm Nhà Tư Nhân', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(productTurn.activeProductId, 'home1');
  assert.equal(productTurn.router.intent, 'PRODUCT_PARTICIPANT');
  assert.equal(s.awaitingProductSelection, false);
  assert.equal(s.currentComponentId, 'participant');
  assert.deepEqual(productTurn.scopedKnowledge.map(x=>x.id), ['h1-part']);
});

test('explicit product mention switches to a new product flow', async () => {
  const s = session({ productSelectionConfirmed:true, currentProductId:'cat-tuong', currentProduct:product('cat-tuong').name, currentCategoryId:'life', currentCategory:'Nhân thọ', currentComponentId:'premium', currentComponent:'Biểu phí', lastIntent:'PRODUCT_PREMIUM' });
  const r = await orchestrateConversationTurn({ message:'Bảo hiểm Nhà Tư Nhân', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(r.activeProductId, 'home1');
  assert.equal(r.router.conversationMode, 'SWITCH');
  assert.equal(s.currentProductId, 'home1');
  assert.equal(s.currentComponentId, undefined);
});

test('age eligibility cannot be hijacked by an old pricing topic', async () => {
  const s = session({ productSelectionConfirmed:true, currentProductId:'home1', currentProduct:product('home1').name, currentCategoryId:'asset', currentCategory:'Bảo hiểm Tài sản', currentComponentId:'premium', currentComponent:'Biểu phí', lastIntent:'PRODUCT_PREMIUM' });
  const r = await orchestrateConversationTurn({ message:'71 tuổi có tham gia được không?', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(r.router.intent, 'PRODUCT_ELIGIBILITY');
  assert.equal(r.router.usePricing, false);
  assert.notEqual(s.currentComponentId, 'premium');
  assert.equal(r.scopedKnowledge.some(x=>x.id==='h1-price'), false);
});

test('procedure request routes to procedure evidence instead of pricing', async () => {
  const s = session({ productSelectionConfirmed:true, currentProductId:'home1', currentProduct:product('home1').name, currentCategoryId:'asset', currentCategory:'Bảo hiểm Tài sản', currentComponentId:'premium', currentComponent:'Biểu phí', lastIntent:'PRODUCT_PREMIUM' });
  const r = await orchestrateConversationTurn({ message:'tôi đang cần quy trình tham gia', session:s, taxonomy, knowledgeItems:knowledge });
  assert.equal(r.router.intent, 'PRODUCT_PROCEDURE');
  assert.equal(r.router.usePricing, false);
  assert.equal(s.currentComponentId, 'procedure');
  assert.deepEqual(r.scopedKnowledge.map(x=>x.id), ['h1-proc']);
});

test('explicit UI product switch forces a fresh canonical product flow', async () => {
  const s = session({
    productSelectionConfirmed:true,
    currentProductId:'cat-tuong',
    currentProduct:product('cat-tuong').name,
    currentCategoryId:'life',
    currentCategory:'Nhân thọ',
    currentComponentId:'premium',
    currentComponent:'Biểu phí',
    lastIntent:'PRODUCT_PREMIUM',
  });
  const r = await orchestrateConversationTurn({
    message:'Bảo hiểm Nhà Tư Nhân',
    session:s,
    taxonomy,
    knowledgeItems:knowledge,
    forcedProductId:'home1',
  });
  assert.equal(r.activeProductId, 'home1');
  assert.equal(r.router.conversationMode, 'SWITCH');
  assert.equal(s.currentProductId, 'home1');
  assert.equal(s.currentComponentId, undefined);
  assert.equal(s.lastIntent, undefined);
});
