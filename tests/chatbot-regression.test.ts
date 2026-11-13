import test from 'node:test';
import assert from 'node:assert/strict';
import type { KnowledgeTaxonomyData } from '../src/types';
import { routeChatMessage, filterKnowledgeByTaxonomy } from '../src/services/chatbotTaxonomyRouter';
import { analyzeConversationMessage } from '../src/services/chatbotConversationReasoner';
import { resolveMultiTurnReference, mergeSubjectEntities } from '../src/services/chatbotMultiTurnReference';
import { resolveTopicStackCommand, upsertTopicFrame, getTopicFrame } from '../src/services/chatbotTopicStack';

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

const knowledge:any[] = [
  { id:'tb-benefit', title:'Quyền lợi Tâm Bình', product:'Tâm Bình', productId:'tam-binh', category:'Sức khỏe', categoryId:'health', topic:'Quyền lợi', componentType:'benefits', componentId:'benefits', content:'TB benefit', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
  { id:'tn-benefit', title:'Quyền lợi Tai nạn', product:'Tai nạn 24/24', productId:'tai-nan-24', category:'Sức khỏe', categoryId:'health', topic:'Quyền lợi', componentType:'benefits', componentId:'benefits', content:'TN benefit', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
  { id:'tb-wait', title:'Thời gian chờ Tâm Bình', product:'Tâm Bình', productId:'tam-binh', category:'Sức khỏe', categoryId:'health', topic:'Thời gian chờ', componentType:'waiting_period', componentId:'waiting', content:'TB wait', tags:[], active:true, createdAt:'2026-01-01', updatedAt:'2026-01-01' },
];

test('catalog count/list comes only from current taxonomy', () => {
  const oneProduct = { ...taxonomy, products:[taxonomy.products[1]] };
  const r = routeChatMessage('Bên mình có mấy sản phẩm?', oneProduct, null);
  assert.equal(r.intent, 'PRODUCT_LIST');
  assert.equal(oneProduct.products.filter(p=>p.active!==false).length, 1);
  assert.equal(oneProduct.products[0].name, 'Tai nạn 24/24');
});

test('explicit product mention establishes product context', () => {
  const r = routeChatMessage('Tâm Bình có quyền lợi gì?', taxonomy, null);
  assert.equal(r.product?.id, 'tam-binh');
  assert.equal(r.conversationMode, 'KEEP');
});

test('follow-up without a new product keeps active product', () => {
  const r = routeChatMessage('Thời gian chờ thì sao?', taxonomy, 'tam-binh');
  assert.equal(r.product, null);
  assert.equal(r.conversationMode, 'KEEP');
  assert.equal(r.component?.id, 'waiting');
});

test('explicit new product switches deep-talk product', () => {
  const r = routeChatMessage('Còn Tai nạn 24/24 thì sao?', taxonomy, 'tam-binh');
  assert.equal(r.product?.id, 'tai-nan-24');
  assert.equal(r.conversationMode, 'SWITCH');
});

test('comparison is multi-product, not a blind switch', () => {
  const r = routeChatMessage('Tâm Bình và Tai nạn 24/24 khác nhau thế nào?', taxonomy, 'tam-binh');
  assert.equal(r.conversationMode, 'MULTI_PRODUCT');
  assert.deepEqual(new Set(r.products.map(p=>p.id)), new Set(['tam-binh','tai-nan-24']));
});

test('product hard filter prevents cross-product knowledge leakage', () => {
  const scoped = filterKnowledgeByTaxonomy(knowledge, taxonomy, 'tai-nan-24', 'benefits', null);
  assert.deepEqual(scoped.map(x=>x.id), ['tn-benefit']);
});

test('occupation/personal situation is understood as conversation context', () => {
  const a = analyzeConversationMessage('Tôi là bác sĩ thì trường hợp của tôi sao?');
  assert.equal(a.entities.occupation, 'bác sĩ/y tế');
  assert.equal(a.needsConversationalReasoning, true);
});

test('pricing conversation asks for missing age rather than inventing a premium', () => {
  const a = analyzeConversationMessage('Tôi là bác sĩ, tính phí thế nào?');
  assert.ok(a.missingSlots.includes('tuổi'));
});

test('subject switch keeps spouse profile separate from self', () => {
  const self = mergeSubjectEntities(undefined, analyzeConversationMessage('Tôi 35 tuổi làm bác sĩ').entities);
  const ref = resolveMultiTurnReference('Còn vợ tôi 32 tuổi?', 'self');
  const spouse = mergeSubjectEntities(undefined, analyzeConversationMessage('Còn vợ tôi 32 tuổi?').entities);
  assert.equal(ref.subjectId, 'spouse');
  assert.equal(ref.resetSubjectProfile, true);
  assert.equal(self.age, 35);
  assert.equal(spouse.age, 32);
  assert.equal(spouse.occupation, undefined);
});

test('same-topic follow-up preserves semantic intent/component', () => {
  const r = resolveMultiTurnReference('Vậy trường hợp đó thì sao?', 'self');
  assert.equal(r.isReferenceFollowUp, true);
  assert.equal(r.preserveIntent, true);
  assert.equal(r.preserveComponent, true);
});

test('topic stack can go back without reusing an old factual answer', () => {
  let stack:any[]=[];
  stack=upsertTopicFrame(stack,{productId:'tam-binh',productName:'Tâm Bình',componentId:'benefits',componentName:'Quyền lợi',intent:'PRODUCT_BENEFIT',subjectId:'self'});
  stack=upsertTopicFrame(stack,{productId:'tam-binh',productName:'Tâm Bình',componentId:'waiting',componentName:'Thời gian chờ',intent:'GENERAL_QUESTION',subjectId:'self'});
  const cmd=resolveTopicStackCommand('Quay lại phần trước', stack);
  assert.equal(cmd.action,'BACK');
  const frame=getTopicFrame(stack,cmd.targetIndex);
  assert.equal(frame?.componentId,'benefits');
  assert.equal(Object.prototype.hasOwnProperty.call(frame || {}, 'answer'), false);
});

test('switch product can carry semantic topic but retrieval must rerun in new product scope', () => {
  const oldScoped=filterKnowledgeByTaxonomy(knowledge,taxonomy,'tam-binh','benefits',null);
  const newScoped=filterKnowledgeByTaxonomy(knowledge,taxonomy,'tai-nan-24','benefits',null);
  assert.deepEqual(oldScoped.map(x=>x.id),['tb-benefit']);
  assert.deepEqual(newScoped.map(x=>x.id),['tn-benefit']);
});
