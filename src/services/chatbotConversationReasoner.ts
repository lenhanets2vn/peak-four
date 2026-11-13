import { normalizeText } from './ruleBasedChat';

export interface ConversationEntities {
  occupation?: string;
  age?: number;
  gender?: 'male' | 'female';
  relationship?: string;
  healthContext?: string;
  eventContext?: string;
}

export interface ConversationReasoningResult {
  entities: ConversationEntities;
  isContextualFollowUp: boolean;
  asksPersonalSituation: boolean;
  needsConversationalReasoning: boolean;
  missingSlots: string[];
  contextSummary: string;
}

const n = (value:string) => normalizeText(String(value || ''));

export function analyzeConversationMessage(message:string): ConversationReasoningResult {
  const text=n(message);
  const entities:ConversationEntities={};

  const age=text.match(/(?:toi|minh|em|anh|chi)?\s*(?:nam nay\s*)?(\d{1,2})\s*tuoi\b/);
  if(age) {
    const value=Number(age[1]);
    if(value>=0 && value<=100) entities.age=value;
  }
  if(/\b(nam gioi|toi la nam|anh la nam)\b/.test(text)) entities.gender='male';
  if(/\b(nu gioi|toi la nu|chi la nu)\b/.test(text)) entities.gender='female';

  // Corrections such as "không phải bác sĩ, tôi là công nhân" must not
  // preserve the negated occupation. Strip only explicitly negated occupation
  // phrases before deterministic occupation extraction.
  const occupationText=text
    .replace(/\b(khong phai|khong con(?: la)?|khong lam)\s+(bac si|y si|nha si|duoc si|cong nhan|ky su|ki su|giao vien|giang vien|tai xe|lai xe|shipper|ke toan)\b/g, ' ')
    .replace(/\b(truoc day|luc truoc)\s+(?:toi|minh)?\s*(?:la|lam)?\s*(bac si|y si|nha si|duoc si|cong nhan|ky su|ki su|giao vien|giang vien|tai xe|lai xe|shipper|ke toan)\b/g, ' ');

  const occupations:[RegExp,string][]=[
    [/\b(bac si|y si|nha si|duoc si)\b/,'bác sĩ/y tế'],
    [/\b(cong nhan|cong nhan nha may|lao dong pho thong)\b/,'công nhân'],
    [/\b(ky su|ki su)\b/,'kỹ sư'],
    [/\b(giao vien|giang vien)\b/,'giáo viên'],
    [/\b(tai xe|lai xe|shipper)\b/,'tài xế'],
    [/\b(xay dung|tho xay|tho han|tho dien)\b/,'xây dựng/kỹ thuật'],
    [/\b(van phong|nhan vien van phong|ke toan)\b/,'nhân viên văn phòng'],
    [/\b(kinh doanh|chu doanh nghiep|chu cua hang)\b/,'kinh doanh'],
  ];
  for(const [pattern,label] of occupations) if(pattern.test(occupationText)){ entities.occupation=label; break; }

  if(/\b(vo|chong|con|bo|me|cha|me toi|con toi)\b/.test(text)) entities.relationship='người thân/gia đình';
  if(/\b(benh co san|benh nen|dang dieu tri|tien su benh|da tung bi)\b/.test(text)) entities.healthContext='có thông tin sức khỏe/bệnh sử';
  if(/\b(tai nan|bi nga|va cham|bi thuong|nam vien|phau thuat)\b/.test(text)) entities.eventContext='có sự kiện sức khỏe/tai nạn';

  const isContextualFollowUp=/^(con|the|vay|neu|truong hop|the con|con neu|vay neu|nhu toi|toi thi|minh thi)\b/.test(text)
    || /\b(truong hop cua toi|truong hop cua minh|thi sao|the nao|co duoc khong|co anh huong khong)\b/.test(text);
  const asksPersonalSituation=!!(entities.occupation || entities.age !== undefined || entities.gender || entities.relationship || entities.healthContext || entities.eventContext)
    || /\b(toi|minh|em|anh|chi)\b.*\b(thi sao|the nao|co duoc|tham gia|mua|phi|quyen loi)\b/.test(text);
  const needsConversationalReasoning=isContextualFollowUp || asksPersonalSituation;

  const missingSlots:string[]=[];
  if(/\b(phi|bao phi|tinh phi|gia bao nhieu|dong bao nhieu)\b/.test(text) && entities.age===undefined) missingSlots.push('tuổi');

  const parts:string[]=[];
  if(entities.occupation) parts.push(`nghề nghiệp=${entities.occupation}`);
  if(entities.age!==undefined) parts.push(`tuổi=${entities.age}`);
  if(entities.gender) parts.push(`giới tính=${entities.gender==='male'?'nam':'nữ'}`);
  if(entities.relationship) parts.push(`đối tượng=${entities.relationship}`);
  if(entities.healthContext) parts.push(`sức khỏe=${entities.healthContext}`);
  if(entities.eventContext) parts.push(`tình huống=${entities.eventContext}`);

  return {entities,isContextualFollowUp,asksPersonalSituation,needsConversationalReasoning,missingSlots,contextSummary:parts.join('; ')};
}

export function makeNoAiReasoningReply(message:string, productName:string|undefined, analysis:ConversationReasoningResult):string|null {
  if(!analysis.needsConversationalReasoning) return null;
  const prefix=productName ? `Dạ, em hiểu mình đang hỏi tiếp trong ngữ cảnh **${productName}**` : 'Dạ, em hiểu đây là câu hỏi về trường hợp cụ thể của anh/chị';
  const details=analysis.contextSummary ? ` (${analysis.contextSummary})` : '';
  if(analysis.missingSlots.length) {
    return `${prefix}${details}. Để xử lý chính xác, em còn thiếu **${analysis.missingSlots.join(', ')}**. Anh/chị bổ sung giúp em thông tin này nhé. Em sẽ không tự suy đoán mức phí hoặc quyền lợi khi chưa có căn cứ sản phẩm.`;
  }
  return `${prefix}${details}. Em đã hiểu tình huống này và sẽ giữ mạch hội thoại hiện tại. Tuy nhiên ở chế độ không dùng AI, nếu Kho tri thức chưa có quy định tương ứng thì em không tự suy đoán phí, quyền lợi hoặc điều kiện sản phẩm. Anh/chị có thể nói rõ mình muốn hỏi **phí, quyền lợi, điều kiện tham gia hay trường hợp được chi trả** để em tra đúng phần.`;
}
