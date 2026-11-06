import { normalizeText } from './ruleBasedChat';
import type { ChatRouterResult } from './chatbotTaxonomyRouter';
import type { ConversationReasoningResult } from './chatbotConversationReasoner';
import type { ReasoningPlan } from './chatbotReasoningPlanner';

export interface ClarificationDecision {
  shouldAsk: boolean;
  question?: string;
  reason?: string;
  quickReplies?: string[];
}

const n=(v:string)=>normalizeText(String(v||''));

function hasExplicitGoal(message:string, router:ChatRouterResult):boolean {
  const text=n(message);
  if(router.intent!=='GENERAL_QUESTION') return true;
  return /\b(phi|bao phi|tinh phi|quyen loi|chi tra|boi thuong|loai tru|dieu kien|tham gia|doi tuong|thoi gian cho|thu tuc|ho so|han muc|tai tuc|gia han|quy tac|dieu khoan)\b/.test(text);
}

/**
 * Chooses at most ONE useful follow-up question. This layer never invents
 * product requirements: it only asks about information already known to be
 * missing, or asks the user to choose the goal of an otherwise ambiguous
 * personal/contextual statement.
 */
export function decideClarification(params:{
  message:string;
  router:ChatRouterResult;
  reasoning:ConversationReasoningResult;
  plan:ReasoningPlan;
  activeProductName?:string;
}):ClarificationDecision {
  const {message,router,reasoning,plan,activeProductName}=params;

  if(plan.requiresProduct) {
    return {
      shouldAsk:true,
      reason:'official product fact requires product selection',
      question: router.usePricing
        ? 'Dạ, anh/chị muốn hỏi **phí của sản phẩm nào** ạ? Anh/chị cho em tên sản phẩm để em tra đúng thông tin chính thức.'
        : 'Dạ, anh/chị đang muốn hỏi nội dung này cho **sản phẩm nào** ạ? Anh/chị cho em tên sản phẩm để em giữ đúng ngữ cảnh.',
      quickReplies:[],
    };
  }

  // Statements such as “tôi là bác sĩ”, “tôi 35 tuổi” are useful context but
  // do not yet tell us what the customer wants. Ask for the goal, not for the
  // same personal information again.
  if(reasoning.asksPersonalSituation && !hasExplicitGoal(message,router) && !reasoning.isContextualFollowUp) {
    const productPart=activeProductName ? ` về **${activeProductName}**` : '';
    return {
      shouldAsk:true,
      reason:'personal context supplied without a clear goal',
      question:`Dạ, em đã ghi nhận trường hợp của anh/chị${productPart}. Anh/chị muốn em kiểm tra **phí, quyền lợi, điều kiện tham gia hay trường hợp chi trả** ạ?`,
      quickReplies:['Phí bảo hiểm','Quyền lợi','Điều kiện tham gia','Trường hợp chi trả'],
    };
  }

  // Ask only the first deterministic missing slot. Other product-specific
  // requirements must come from CMS/pricing rules rather than hard-coded guesses.
  if(reasoning.missingSlots.length>0) {
    const slot=reasoning.missingSlots[0];
    if(slot==='tuổi') {
      return {
        shouldAsk:true,
        reason:'age is missing for the requested pricing flow',
        question:`Dạ${activeProductName?`, với **${activeProductName}**`:''}, trước tiên anh/chị cho em biết **tuổi của người được bảo hiểm** nhé. Em sẽ giữ các thông tin anh/chị đã cung cấp trước đó và không bắt nhập lại.`,
        quickReplies:[],
      };
    }
    return {
      shouldAsk:true,
      reason:`missing conversational slot: ${slot}`,
      question:`Dạ, để tiếp tục chính xác, anh/chị bổ sung giúp em **${slot}** nhé.`,
      quickReplies:[],
    };
  }

  return {shouldAsk:false};
}
