import { normalizeText } from './ruleBasedChat';
import type { ConversationEntities } from './chatbotConversationReasoner';

export type ConversationSubjectId = 'self' | 'spouse' | 'child' | 'parent' | 'other';

export interface MultiTurnReferenceResult {
  subjectId: ConversationSubjectId;
  explicitSubject: boolean;
  isReferenceFollowUp: boolean;
  referenceKind?: 'previous' | 'ordinal' | 'same_topic' | 'subject_switch';
  ordinal?: number;
  preserveIntent: boolean;
  preserveComponent: boolean;
  resetSubjectProfile: boolean;
}

const n=(v:string)=>normalizeText(String(v||''));

export function resolveMultiTurnReference(message:string, currentSubject:ConversationSubjectId='self'):MultiTurnReferenceResult {
  const text=n(message);
  let subjectId:ConversationSubjectId=currentSubject;
  let explicitSubject=false;
  let referenceKind:MultiTurnReferenceResult['referenceKind'];

  // Explicit people always win over inherited subject context.
  if (/\b(vo toi|chong toi|vo cua toi|chong cua toi|ba xa|ong xa)\b/.test(text)) { subjectId='spouse'; explicitSubject=true; }
  else if (/\b(con toi|be nha toi|be nha minh|con cua toi)\b/.test(text)) { subjectId='child'; explicitSubject=true; }
  else if (/\b(bo toi|me toi|cha toi|ba toi|bo me toi|cha me toi)\b/.test(text)) { subjectId='parent'; explicitSubject=true; }
  else if (/\b(toi|minh|ban than toi|ban than minh)\b/.test(text) && !/\b(vo toi|chong toi|con toi|bo toi|me toi|cha toi|ba toi)\b/.test(text)) { subjectId='self'; explicitSubject=true; }

  if (explicitSubject && subjectId!==currentSubject) referenceKind='subject_switch';

  const ordinalMatch=text.match(/\b(?:truong hop|phuong an|cai|y)\s*(?:thu\s*)?(mot|hai|ba|bon|nam|1|2|3|4|5)\b/);
  const ordMap:Record<string,number>={mot:1,hai:2,ba:3,bon:4,nam:5,'1':1,'2':2,'3':3,'4':4,'5':5};
  const ordinal=ordinalMatch ? ordMap[ordinalMatch[1]] : undefined;
  if (ordinal) referenceKind='ordinal';

  const previousRef=/\b(cai do|viec do|truong hop do|phan do|y do|nhu tren|luc nay|luc truoc|vua roi)\b/.test(text);
  const sameTopic=/^(con|the con|vay|neu|neu nhu|con neu|vay neu|the|truong hop)\b/.test(text)
    || /\b(thi sao|the nao|co anh huong khong|co duoc khong)\b/.test(text);
  if (!referenceKind && previousRef) referenceKind='previous';
  if (!referenceKind && sameTopic) referenceKind='same_topic';

  const isReferenceFollowUp=!!referenceKind;
  return {
    subjectId,
    explicitSubject,
    isReferenceFollowUp,
    referenceKind,
    ordinal,
    // Follow-ups inherit semantic intent/component unless the normal router finds a new one.
    preserveIntent:isReferenceFollowUp,
    preserveComponent:isReferenceFollowUp,
    // Switching from "tôi" to "vợ tôi" must not inherit personal age/job from the old subject.
    resetSubjectProfile:explicitSubject && subjectId!==currentSubject,
  };
}

export function mergeSubjectEntities(
  stored:ConversationEntities|undefined,
  incoming:ConversationEntities,
):ConversationEntities {
  return {
    ...(stored||{}),
    ...Object.fromEntries(Object.entries(incoming).filter(([,v])=>v!==undefined)),
  };
}
