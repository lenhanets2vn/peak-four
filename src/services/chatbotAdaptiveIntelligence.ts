import type { KnowledgeItem } from '../types';
import type { ChatRouterResult } from './chatbotTaxonomyRouter';
import type { ConversationReasoningResult } from './chatbotConversationReasoner';
import type { ReasoningPlan } from './chatbotReasoningPlanner';

export type AdaptiveConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';
export type AdaptiveExecutionMode = 'DETERMINISTIC' | 'AI_REASONING' | 'CLARIFY';

export interface AdaptiveIntelligenceDecision {
  confidence: number;
  band: AdaptiveConfidenceBand;
  mode: AdaptiveExecutionMode;
  reason: string;
  contextual: boolean;
  evidenceCount: number;
}

const clamp=(v:number)=>Math.max(0,Math.min(1,v));

/**
 * Step 17: final adaptive intelligence gate.
 * It does not decide product truth and does not create taxonomy entities.
 * It only decides HOW an already-routed turn should be handled:
 * deterministic evidence, semantic AI reasoning, or one clarification.
 */
export function assessAdaptiveIntelligence(params:{
  router:ChatRouterResult;
  reasoning:ConversationReasoningResult;
  plan:ReasoningPlan;
  retrievedKnowledge:KnowledgeItem[];
  activeProductId?:string;
}):AdaptiveIntelligenceDecision {
  const {router,reasoning,plan,retrievedKnowledge,activeProductId}=params;
  const contextual=!!reasoning.needsConversationalReasoning || !!reasoning.isContextualFollowUp || !!reasoning.asksPersonalSituation;
  const evidenceCount=retrievedKnowledge.length;

  // Hard uncertainty is never handed to AI to guess around.
  if(plan.requiresProduct || (plan.allowProductFacts && !activeProductId)) {
    return {confidence:0.15,band:'LOW',mode:'CLARIFY',reason:'required product context is unresolved',contextual,evidenceCount};
  }
  if(reasoning.missingSlots.length>0) {
    return {confidence:0.28,band:'LOW',mode:'CLARIFY',reason:`missing required conversational slot: ${reasoning.missingSlots[0]}`,contextual,evidenceCount};
  }

  let confidence=typeof router.confidence==='number' ? router.confidence : 0.5;
  if(activeProductId) confidence+=0.10;
  if(router.component) confidence+=0.08;
  if(router.intent && router.intent!=='GENERAL_QUESTION') confidence+=0.06;
  if(evidenceCount>0) confidence+=0.12;
  if(evidenceCount>=2) confidence+=0.04;
  if(contextual) confidence-=0.12;
  if(plan.allowExternalSearch) confidence-=0.08;
  confidence=clamp(confidence);

  // Pricing is different from a simple fact lookup: the official inputs/rates/rules
  // come from CMS Knowledge, but the customer may ask the assistant to combine
  // age, occupation, sum insured, percentages or multiple rows. Let the single
  // reasoning pass perform that arithmetic; the post-generation calculation guard
  // will reject any unsupported source number.
  if(plan.route==='PRICING_KNOWLEDGE' && evidenceCount>0) {
    return {confidence:Math.max(confidence,0.72),band:'HIGH',mode:'AI_REASONING',reason:'pricing has official evidence and needs grounded calculation/reasoning',contextual:true,evidenceCount};
  }

  // Exact official facts with scoped evidence do not need generative reasoning.
  if(plan.allowProductFacts && !plan.allowExternalSearch && evidenceCount>0 && !contextual && confidence>=0.72) {
    return {confidence,band:'HIGH',mode:'DETERMINISTIC',reason:'resolved product fact has product-scoped CMS evidence',contextual,evidenceCount};
  }

  // General/deep-talk and mixed questions benefit from semantic reasoning. Product
  // facts remain constrained later by the existing Fact/Numeric Guard.
  if(contextual || plan.allowExternalSearch || plan.allowGeneralReasoning) {
    const band:AdaptiveConfidenceBand=confidence>=0.72?'HIGH':confidence>=0.42?'MEDIUM':'LOW';
    return {confidence,band,mode:'AI_REASONING',reason:contextual?'contextual/deep-talk turn needs semantic reasoning':'turn benefits from semantic reasoning',contextual,evidenceCount};
  }

  if(confidence<0.42) {
    return {confidence,band:'LOW',mode:'CLARIFY',reason:'routing confidence is too low to answer safely',contextual,evidenceCount};
  }
  return {confidence,band:confidence>=0.72?'HIGH':'MEDIUM',mode:'AI_REASONING',reason:'semantic answer path',contextual,evidenceCount};
}
