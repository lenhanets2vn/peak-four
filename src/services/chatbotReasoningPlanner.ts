import { normalizeText } from './ruleBasedChat';
import type { ChatRouterResult } from './chatbotTaxonomyRouter';
import type { ConversationReasoningResult } from './chatbotConversationReasoner';

export type ReasoningRoute =
  | 'KNOWLEDGE'
  | 'PRICING_KNOWLEDGE'
  | 'CLARIFICATION'
  | 'GENERAL_REASONING'
  | 'EXTERNAL_SEARCH'
  | 'MIXED_PRODUCT_EXTERNAL';

export interface ReasoningPlan {
  route: ReasoningRoute;
  reason: string;
  allowKnowledge: boolean;
  allowProductFacts: boolean;
  allowGeneralReasoning: boolean;
  allowExternalSearch: boolean;
  requiresProduct: boolean;
}

const n=(v:string)=>normalizeText(String(v||''));

function asksPricing(message:string, router:ChatRouterResult):boolean {
  const text=n(message);
  return !!router.usePricing || /\b(phi|bao phi|tinh phi|bieu phi|gia bao nhieu|dong bao nhieu|muc phi)\b/.test(text);
}

function asksRealWorld(message:string):boolean {
  const text=n(message);
  return /\b(hien nay|moi nhat|gan day|thuc te|ngoai doi|chi phi dieu tri|chi phi phau thuat|vien phi|gia thi truong|tin tuc|quy dinh moi|thong ke|so lieu|thi truong|tai viet nam|o viet nam)\b/.test(text);
}

function asksProductFact(message:string, router:ChatRouterResult):boolean {
  const text=n(message);
  return !!router.productSpecific || /\b(quyen loi|loai tru|thoi gian cho|dieu kien tham gia|doi tuong tham gia|boi thuong|chi tra|bao lanh|han muc|quy tac|dieu khoan|ho so|thu tuc|tai tuc|gia han)\b/.test(text);
}

export function planChatReasoning(params:{
  message:string;
  router:ChatRouterResult;
  reasoning:ConversationReasoningResult;
  activeProductId?:string;
}):ReasoningPlan {
  const pricing=asksPricing(params.message,params.router);
  const realWorld=asksRealWorld(params.message);
  const productFact=asksProductFact(params.message,params.router) || pricing;
  const hasProduct=!!params.activeProductId;

  if(productFact && !hasProduct) {
    return {
      route:'CLARIFICATION', reason:'product fact requires an explicitly confirmed product',
      allowKnowledge:false, allowProductFacts:false, allowGeneralReasoning:true,
      allowExternalSearch:false, requiresProduct:true,
    };
  }
  if(realWorld && productFact && hasProduct) {
    return {
      route:'MIXED_PRODUCT_EXTERNAL', reason:'question combines official product facts with current/real-world information',
      allowKnowledge:true, allowProductFacts:true, allowGeneralReasoning:true,
      allowExternalSearch:true, requiresProduct:false,
    };
  }
  if(realWorld) {
    return {
      route:'EXTERNAL_SEARCH', reason:'question asks for current/real-world information',
      allowKnowledge:hasProduct, allowProductFacts:hasProduct, allowGeneralReasoning:true,
      allowExternalSearch:true, requiresProduct:false,
    };
  }
  if(pricing && hasProduct) {
    return {
      route:'PRICING_KNOWLEDGE', reason:'pricing is product-scoped; chatbot uses official knowledge/rules, not a chat pricing form',
      allowKnowledge:true, allowProductFacts:true, allowGeneralReasoning:true,
      allowExternalSearch:false, requiresProduct:false,
    };
  }
  if(productFact && hasProduct) {
    return {
      route:'KNOWLEDGE', reason:'official product fact must stay grounded in product-scoped CMS knowledge',
      allowKnowledge:true, allowProductFacts:true, allowGeneralReasoning:true,
      allowExternalSearch:false, requiresProduct:false,
    };
  }
  if(params.reasoning.needsConversationalReasoning) {
    return {
      route:'GENERAL_REASONING', reason:'personal/contextual follow-up can be understood without inventing product facts',
      allowKnowledge:hasProduct, allowProductFacts:hasProduct, allowGeneralReasoning:true,
      allowExternalSearch:false, requiresProduct:false,
    };
  }
  return {
    route:'GENERAL_REASONING', reason:'general conversation/reasoning path',
    allowKnowledge:hasProduct, allowProductFacts:hasProduct, allowGeneralReasoning:true,
    allowExternalSearch:false, requiresProduct:false,
  };
}
