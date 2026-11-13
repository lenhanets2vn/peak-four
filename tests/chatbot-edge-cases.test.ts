import test from 'node:test';
import assert from 'node:assert/strict';
import type { ChatSession, KnowledgeItem, KnowledgeTaxonomyData } from '../src/types';
import { orchestrateConversationTurn } from '../src/services/chatbotConversationOrchestrator';
import { analyzeConversationMessage } from '../src/services/chatbotConversationReasoner';
import { routeChatMessage } from '../src/services/chatbotTaxonomyRouter';

const taxonomy:KnowledgeTaxonomyData={
  categories:[{id:'health',name:'Sức khỏe',active:true}],
  products:[
    {id:'tam-binh',name:'Tâm Bình',aliases:['Bảo Việt Tâm Bình','TB'],categoryId:'health',active:true},
    {id:'tai-nan-24',name:'Tai nạn 24/24',aliases:['Tai nạn 24h','Tai nạn 24 giờ','TN24'],categoryId:'health',active:true},
  ],
  componentTypes:[
    {id:'benefits',code:'benefits',label:'Quyền lợi',name:'Quyền lợi',aliases:['được hưởng','bảo vệ'],active:true},
    {id:'waiting',code:'waiting_period',label:'Thời gian chờ',name:'Thời gian chờ',aliases:['chờ bao lâu'],active:true},
  ],
};
const knowledge:KnowledgeItem[]=[
  {id:'tb-b',title:'Quyền lợi Tâm Bình',product:'Tâm Bình',productId:'tam-binh',category:'Sức khỏe',categoryId:'health',topic:'Quyền lợi',componentType:'benefits',componentId:'benefits',content:'TB benefit',tags:[],active:true,createdAt:'2026-01-01',updatedAt:'2026-01-01'},
  {id:'tn-b',title:'Quyền lợi Tai nạn',product:'Tai nạn 24/24',productId:'tai-nan-24',category:'Sức khỏe',categoryId:'health',topic:'Quyền lợi',componentType:'benefits',componentId:'benefits',content:'TN benefit',tags:[],active:true,createdAt:'2026-01-01',updatedAt:'2026-01-01'},
];
const mk=():ChatSession=>{const now=new Date().toISOString();return{id:'edge',createdAt:now,updatedAt:now,status:'ai_active',messages:[]}};
const turn=(s:ChatSession,message:string)=>orchestrateConversationTurn({message,session:s,taxonomy,knowledgeItems:knowledge});

test('edge: corrected age replaces prior age instead of retaining stale value',async()=>{
  const s=mk(); await turn(s,'Tôi 35 tuổi'); await turn(s,'Không, tôi 36 tuổi chứ không phải 35');
  assert.equal(s.conversationSubjectProfiles?.self?.age,36);
});

test('edge: negated old occupation does not beat newly stated occupation',async()=>{
  const a=analyzeConversationMessage('Không phải bác sĩ, tôi là công nhân');
  assert.equal(a.entities.occupation,'công nhân');
  const b=analyzeConversationMessage('Tôi không còn là bác sĩ, giờ làm công nhân');
  assert.equal(b.entities.occupation,'công nhân');
});

test('edge: abbreviation can explicitly switch product',()=>{
  const r=routeChatMessage('Còn TN24 thì sao?',taxonomy,'tam-binh');
  assert.equal(r.product?.id,'tai-nan-24'); assert.equal(r.conversationMode,'SWITCH');
});

test('edge: conservative typo tolerance resolves a clear product typo',()=>{
  const r=routeChatMessage('Còn Tai nan 24/2 thì sao?',taxonomy,'tam-binh');
  assert.equal(r.product?.id,'tai-nan-24'); assert.equal(r.conversationMode,'SWITCH');
});

test('edge: rapid explicit product switches never leak cross-product knowledge',async()=>{
  const s=mk();
  await turn(s,'Tâm Bình quyền lợi?');
  let r=await turn(s,'Còn Tai nạn 24/24?');
  assert.equal(s.currentProductId,'tai-nan-24'); assert.ok(r.scopedKnowledge.every(k=>!k.productId||k.productId==='tai-nan-24'));
  r=await turn(s,'Quay lại Tâm Bình');
  assert.equal(s.currentProductId,'tam-binh'); assert.ok(r.scopedKnowledge.every(k=>!k.productId||k.productId==='tam-binh'));
});

test('edge: vague product-specific question without product fails closed to selection',async()=>{
  const s=mk(); const r=await turn(s,'Được hưởng gì?');
  assert.equal(r.directResponse?.needsProductSelection,true); assert.equal(r.activeProductId,undefined);
});

test('edge: comparison does not overwrite active product even after repeated switches',async()=>{
  const s=mk(); await turn(s,'Tâm Bình quyền lợi?'); await turn(s,'Tai nạn 24/24 thì sao?');
  const before=s.currentProductId; const r=await turn(s,'So sánh Tâm Bình với Tai nạn 24/24');
  assert.equal(r.router.conversationMode,'MULTI_PRODUCT'); assert.equal(s.currentProductId,before);
});

test('edge: unknown product name is not invented by deterministic router',()=>{
  const r=routeChatMessage('Quyền lợi Siêu Bảo Vệ 999 thế nào?',taxonomy,null);
  assert.equal(r.product,null); assert.equal(r.requiresProductSelection,true);
});
