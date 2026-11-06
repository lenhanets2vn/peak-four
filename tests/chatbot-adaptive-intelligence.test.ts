import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAdaptiveIntelligence } from '../src/services/chatbotAdaptiveIntelligence';
import type { KnowledgeItem } from '../src/types';

const item={id:'k1',title:'Quyền lợi',product:'Tâm Bình',productId:'tam-binh',category:'Sức khỏe',categoryId:'health',topic:'Quyền lợi',componentType:'benefits',componentId:'benefits',content:'Nội dung chính thức',tags:[],active:true,createdAt:'x',updatedAt:'x'} as KnowledgeItem;
const baseRouter:any={intent:'GENERAL_QUESTION',productSpecific:true,usePricing:false,requiresProductSelection:false,requiresAIResolver:false,confidence:.78,products:[],conversationMode:'KEEP',product:{id:'tam-binh',name:'Tâm Bình',matchedBy:'name'},component:{id:'benefits',name:'Quyền lợi',matchedBy:'keyword'}};
const baseReasoning:any={entities:{},missingSlots:[],asksPersonalSituation:false,isContextualFollowUp:false,needsConversationalReasoning:false,contextSummary:''};
const productPlan:any={route:'KNOWLEDGE',reason:'x',allowKnowledge:true,allowProductFacts:true,allowGeneralReasoning:true,allowExternalSearch:false,requiresProduct:false};

test('adaptive: high-confidence grounded product fact avoids unnecessary AI',()=>{
  const d=assessAdaptiveIntelligence({router:baseRouter,reasoning:baseReasoning,plan:productPlan,retrievedKnowledge:[item],activeProductId:'tam-binh'});
  assert.equal(d.mode,'DETERMINISTIC'); assert.equal(d.band,'HIGH');
});

test('adaptive: contextual deep-talk uses semantic reasoning even with product evidence',()=>{
  const reasoning={...baseReasoning,asksPersonalSituation:true,needsConversationalReasoning:true,entities:{occupation:'bác sĩ'}};
  const d=assessAdaptiveIntelligence({router:baseRouter,reasoning,plan:productPlan,retrievedKnowledge:[item],activeProductId:'tam-binh'});
  assert.equal(d.mode,'AI_REASONING');
});

test('adaptive: missing required slot fails closed to clarification',()=>{
  const reasoning={...baseReasoning,missingSlots:['tuổi']};
  const d=assessAdaptiveIntelligence({router:baseRouter,reasoning,plan:productPlan,retrievedKnowledge:[item],activeProductId:'tam-binh'});
  assert.equal(d.mode,'CLARIFY'); assert.equal(d.band,'LOW');
});

test('adaptive: unresolved product fact never delegates guessing to AI',()=>{
  const plan={...productPlan,requiresProduct:true,allowProductFacts:false};
  const d=assessAdaptiveIntelligence({router:{...baseRouter,product:null},reasoning:baseReasoning,plan,retrievedKnowledge:[]});
  assert.equal(d.mode,'CLARIFY');
});

test('adaptive: current/external question remains AI reasoning path',()=>{
  const plan={...productPlan,route:'MIXED_PRODUCT_EXTERNAL',allowExternalSearch:true};
  const d=assessAdaptiveIntelligence({router:baseRouter,reasoning:baseReasoning,plan,retrievedKnowledge:[item],activeProductId:'tam-binh'});
  assert.equal(d.mode,'AI_REASONING');
});
