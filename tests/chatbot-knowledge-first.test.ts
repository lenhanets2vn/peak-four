import test from 'node:test';
import assert from 'node:assert/strict';
import type { KnowledgeTaxonomyData, KnowledgeItem } from '../src/types';
import { routeChatMessage } from '../src/services/chatbotTaxonomyRouter';
import { runRebuiltChatbot } from '../src/services/chatbotEngine';

const taxonomy: KnowledgeTaxonomyData = {
  categories:[{id:'health',name:'Sức khỏe',active:true}],
  products:[
    {id:'tn',name:'Tai nạn 24/24',aliases:['Tai nạn 24h'],categoryId:'health',active:true},
    {id:'tb',name:'Tâm Bình',categoryId:'health',active:true},
  ],
  componentTypes:[{id:'premium',code:'pricing_rules',name:'Biểu phí',label:'Biểu phí',aliases:['phí'],active:true}],
};
const kb = (productId:string, product:string, content:string):KnowledgeItem => ({
  id:`price-${productId}`, title:`Biểu phí ${product}`, productId, product, category:'Sức khỏe',
  topic:'Biểu phí',componentId:'premium',componentType:'pricing_rules',content,tags:[],active:true,
  createdAt:'2026-01-01',updatedAt:'2026-01-01',
});
const records = [kb('tn','Tai nạn 24/24','Phí tùy theo độ tuổi và gói tham gia. Gói Đồng 100.000đ; gói Bạc 200.000đ.'),
  kb('tb','Tâm Bình','Phí 999.000đ')];

test('price inquiry asks for age from current product without calling Gemini or leaking another price', async () => {
  const message='Mức phí bảo hiểm Tai nạn 24/24 là bao nhiêu?';
  const result=await runRebuiltChatbot({message,router:routeChatMessage(message,taxonomy,null),taxonomy,
    knowledgeItems:[records[0]],activeProductId:'tn',activeProductName:'Tai nạn 24/24'});
  assert.equal(result.modelUsed,'knowledge');
  assert.match(result.reply,/độ tuổi/);
  assert.doesNotMatch(result.reply,/999\.000|100\.000|200\.000/);
});

test('age follow-up keeps product and requests missing plan without Gemini', async () => {
  const message='23 tuổi thì sao?';
  const result=await runRebuiltChatbot({message,router:routeChatMessage(message,taxonomy,'tn'),taxonomy,
    knowledgeItems:[records[0]],activeProductId:'tn',activeProductName:'Tai nạn 24/24',
    history:[{role:'user',text:'Phí Tai nạn 24/24 bao nhiêu?'}]});
  assert.equal(result.modelUsed,'knowledge');
  assert.match(result.reply,/23/);
  assert.match(result.reply,/gói nào/);
});

test('product switch only uses the new product pricing evidence', async () => {
  const message='Phí Tâm Bình bao nhiêu?';
  const result=await runRebuiltChatbot({message,router:routeChatMessage(message,taxonomy,'tn'),taxonomy,
    knowledgeItems:[records[1]],activeProductId:'tb',activeProductName:'Tâm Bình',conversationMode:'SWITCH'});
  assert.equal(result.modelUsed,'knowledge');
  assert.match(result.reply,/999\.000/);
  assert.deepEqual(result.sources.map(s=>s.id),['price-tb']);
});

test('catalog response is delivered from taxonomy without Gemini', async () => {
  const message='Có mấy sản phẩm?';
  const result=await runRebuiltChatbot({message,router:routeChatMessage(message,taxonomy,null),taxonomy,
    knowledgeItems:[],orchestrationContext:'Dạ, có 2 sản phẩm: Tai nạn 24/24 và Tâm Bình.'});
  assert.equal(result.modelUsed,'taxonomy');
  assert.match(result.reply,/2 sản phẩm/);
});
