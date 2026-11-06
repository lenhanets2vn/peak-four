import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSemanticTaxonomyCandidates } from '../src/services/chatbotSemanticResolver';

const taxonomy:any={products:[],categories:[],componentTypes:[]};

test('standalone general conversation does not spend a taxonomy-resolver AI call', async()=>{
  const result=await resolveSemanticTaxonomyCandidates({
    message:'tôi không có tiền mua bảo hiểm, vay được không',
    router:{
      intent:'GENERAL_QUESTION',products:[],conversationMode:'NONE',requiresProductSelection:false,
      requiresAIResolver:false,productSpecific:false,usePricing:false,confidence:0.2,
    } as any,
    taxonomy,
    activeProductId:null,
    activeComponentId:null,
  });
  assert.equal(result.usedAI,false);
  assert.equal(result.reason,'deterministic-sufficient');
});
