import test from 'node:test';
import assert from 'node:assert/strict';
import { guardProductFacts } from '../src/services/chatbotFactGuard';
import { assessAdaptiveIntelligence } from '../src/services/chatbotAdaptiveIntelligence';

const kb:any=[{id:'p1',title:'Biểu phí',content:'Tỷ lệ phí 0,6%. Hệ số nghề nghiệp nhóm 3 là 1,25.',topic:'Phí',product:'Demo',componentType:'pricing_rules'}];

test('allows a premium derived from official rate/coefficient and customer sum insured',()=>{
  const r=guardProductFacts({reply:'Phí ước tính là 3.750.000 VND.',userMessage:'Số tiền bảo hiểm 500 triệu',knowledgeItems:kb,productFactScope:true});
  assert.equal(r.safe,true);
});

test('rejects an invented premium that cannot be reproduced from evidence',()=>{
  const r=guardProductFacts({reply:'Phí là 4.200.000 VND.',userMessage:'Số tiền bảo hiểm 500 triệu',knowledgeItems:kb,productFactScope:true});
  assert.equal(r.safe,false);
});

test('pricing with evidence is sent to grounded AI reasoning instead of deterministic copy',()=>{
  const d=assessAdaptiveIntelligence({
    router:{intent:'CALCULATE_PREMIUM',confidence:.9,productSpecific:true,usePricing:true} as any,
    reasoning:{needsConversationalReasoning:false,isContextualFollowUp:false,asksPersonalSituation:false,missingSlots:[]} as any,
    plan:{route:'PRICING_KNOWLEDGE',reason:'',allowKnowledge:true,allowProductFacts:true,allowGeneralReasoning:true,allowExternalSearch:false,requiresProduct:false},
    retrievedKnowledge:kb,activeProductId:'demo'
  });
  assert.equal(d.mode,'AI_REASONING');
});
