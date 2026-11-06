import test from 'node:test';
import assert from 'node:assert/strict';
import type { ChatSession, KnowledgeItem, KnowledgeTaxonomyData } from '../src/types';
import { orchestrateConversationTurn } from '../src/services/chatbotConversationOrchestrator';

const taxonomy: KnowledgeTaxonomyData = {
  categories: [{ id:'health', name:'Sức khỏe', active:true }],
  products: [
    { id:'tam-binh', name:'Tâm Bình', aliases:['Bảo Việt Tâm Bình'], categoryId:'health', active:true },
    { id:'tai-nan-24', name:'Tai nạn 24/24', aliases:['Tai nạn 24h','Tai nạn 24 giờ'], categoryId:'health', active:true },
  ],
  componentTypes: [
    { id:'benefits', code:'benefits', label:'Quyền lợi', name:'Quyền lợi', aliases:['được hưởng','bảo vệ'], active:true },
    { id:'waiting', code:'waiting_period', label:'Thời gian chờ', name:'Thời gian chờ', aliases:['chờ bao lâu'], active:true },
    { id:'premium', code:'pricing_rules', label:'Biểu phí', name:'Biểu phí', aliases:['phí','giá'], active:true },
  ],
};

const knowledge: KnowledgeItem[] = [
  { id:'tb-benefit', title:'Quyền lợi Tâm Bình', product:'Tâm Bình', productId:'tam-binh', category:'Sức khỏe', categoryId:'health', topic:'Quyền lợi', componentType:'benefits', componentId:'benefits', content:'Quyền lợi Tâm Bình.', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
  { id:'tn-benefit', title:'Quyền lợi Tai nạn', product:'Tai nạn 24/24', productId:'tai-nan-24', category:'Sức khỏe', categoryId:'health', topic:'Quyền lợi', componentType:'benefits', componentId:'benefits', content:'Quyền lợi Tai nạn 24/24.', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
  { id:'tb-wait', title:'Thời gian chờ Tâm Bình', product:'Tâm Bình', productId:'tam-binh', category:'Sức khỏe', categoryId:'health', topic:'Thời gian chờ', componentType:'waiting_period', componentId:'waiting', content:'Thời gian chờ Tâm Bình.', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
  { id:'tn-wait', title:'Thời gian chờ Tai nạn', product:'Tai nạn 24/24', productId:'tai-nan-24', category:'Sức khỏe', categoryId:'health', topic:'Thời gian chờ', componentType:'waiting_period', componentId:'waiting', content:'Thời gian chờ Tai nạn 24/24.', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
];

function session(): ChatSession {
  const now = new Date().toISOString();
  return { id:'sim', createdAt:now, updatedAt:now, status:'ai_active', messages:[] };
}
async function turn(s: ChatSession, message: string) {
  return orchestrateConversationTurn({ message, session:s, taxonomy, knowledgeItems:knowledge });
}

function assertNoLeak(result: Awaited<ReturnType<typeof turn>>, productId: string) {
  assert.ok(result.scopedKnowledge.every(k => !k.productId || k.productId === productId), `cross-product leakage into ${productId}`);
}

test('scenario: deep-talk keeps product across component follow-up', async () => {
  const s=session();
  let r=await turn(s,'Tâm Bình có quyền lợi gì?');
  assert.equal(s.currentProductId,'tam-binh');
  assertNoLeak(r,'tam-binh');
  r=await turn(s,'Thời gian chờ thì sao?');
  assert.equal(s.currentProductId,'tam-binh');
  assert.equal(r.router.component?.id,'waiting');
  assertNoLeak(r,'tam-binh');
});

test('scenario: explicit product switch exits previous deep-talk but carries semantic component', async () => {
  const s=session();
  await turn(s,'Tâm Bình có quyền lợi gì?');
  const r=await turn(s,'Còn Tai nạn 24/24 thì sao?');
  assert.equal(r.router.conversationMode,'SWITCH');
  assert.equal(s.currentProductId,'tai-nan-24');
  assert.equal(s.currentComponentId,'benefits');
  assertNoLeak(r,'tai-nan-24');
});

test('scenario: comparison is temporary and does not overwrite active deep-talk product', async () => {
  const s=session();
  await turn(s,'Tâm Bình có quyền lợi gì?');
  const before=s.currentProductId;
  const r=await turn(s,'Tâm Bình và Tai nạn 24/24 khác nhau thế nào?');
  assert.equal(r.router.conversationMode,'MULTI_PRODUCT');
  assert.equal(s.currentProductId,before);
  assert.deepEqual(new Set(r.router.products.map(p=>p.id)),new Set(['tam-binh','tai-nan-24']));
});

test('scenario: personal occupation survives a contextual follow-up without becoming product fact', async () => {
  const s=session();
  await turn(s,'Tâm Bình có quyền lợi gì?');
  await turn(s,'Tôi là bác sĩ thì trường hợp của tôi sao?');
  assert.equal(s.conversationSubjectProfiles?.self?.occupation,'bác sĩ/y tế');
  const r=await turn(s,'Vậy trường hợp của tôi thì sao?');
  assert.equal(r.conversationReasoning.entities.occupation,'bác sĩ/y tế');
  assert.equal(s.currentProductId,'tam-binh');
});

test('scenario: spouse profile is isolated from self profile', async () => {
  const s=session();
  await turn(s,'Tôi 35 tuổi làm bác sĩ');
  await turn(s,'Còn vợ tôi 32 tuổi?');
  assert.equal(s.activeConversationSubject,'spouse');
  assert.equal(s.conversationSubjectProfiles?.self?.age,35);
  assert.equal(s.conversationSubjectProfiles?.self?.occupation,'bác sĩ/y tế');
  assert.equal(s.conversationSubjectProfiles?.spouse?.age,32);
  assert.equal(s.conversationSubjectProfiles?.spouse?.occupation,undefined);
});

test('scenario: topic back restores semantic branch and reruns scoped retrieval', async () => {
  const s=session();
  await turn(s,'Tâm Bình có quyền lợi gì?');
  await turn(s,'Thời gian chờ thì sao?');
  const r=await turn(s,'Quay lại phần trước');
  assert.equal(s.currentProductId,'tam-binh');
  assert.equal(r.router.component?.id,'benefits');
  assertNoLeak(r,'tam-binh');
});

test('scenario: no product + product-specific question asks for selection instead of guessing', async () => {
  const s=session();
  const r=await turn(s,'Quyền lợi thế nào?');
  assert.equal(s.productSelectionConfirmed,undefined);
  assert.equal(r.directResponse?.needsProductSelection,true);
  assert.equal(r.activeProductId,undefined);
});

test('scenario: product list is generated from current taxonomy only', async () => {
  const s=session();
  const r=await turn(s,'Bên mình có mấy sản phẩm?');
  assert.equal(r.router.intent,'PRODUCT_LIST');
  assert.match(r.directResponse?.reply || '',/2 sản phẩm nghiệp vụ/);
  assert.match(r.directResponse?.reply || '',/Tâm Bình/);
  assert.match(r.directResponse?.reply || '',/Tai nạn 24\/24/);
});
