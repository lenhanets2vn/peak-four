import {encodeStoredJson,decodeStoredJson,registerSecret} from './securityServer';
import fs from 'fs';
import path from 'path';

export interface TelegramLoggerConfig { enabled: boolean; botToken: string; chatId: string; }
const SECRET_FILE = path.resolve(process.cwd(), 'data/telegram-chat-secret.json');
let runtimeConfig: TelegramLoggerConfig | null = null;

function readLocalSecret(): TelegramLoggerConfig | null {
  try {
    if (!fs.existsSync(SECRET_FILE)) return null;
    const raw = decodeStoredJson(fs.readFileSync(SECRET_FILE, 'utf8'));
    if (!raw?.botToken || !raw?.chatId) return null;
    registerSecret(String(raw.botToken));
    return { enabled: raw.enabled !== false, botToken: String(raw.botToken), chatId: String(raw.chatId) };
  } catch { return null; }
}

export function getTelegramLoggerConfig(): TelegramLoggerConfig {
  if (runtimeConfig) return runtimeConfig;
  const local = readLocalSecret();
  if (local && !process.env.TELEGRAM_BOT_TOKEN) return local;
  return {
    // New name reflects the actual behavior. Old key remains compatible with existing Render setup.
    botToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: String(process.env.TELEGRAM_CHAT_ID || '').trim(),
    enabled: (() => { const raw = process.env.TELEGRAM_LEAD_ALERT_ENABLED ?? process.env.TELEGRAM_CHAT_LOG_ENABLED; const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim(); const chat=String(process.env.TELEGRAM_CHAT_ID||'').trim(); return raw == null || String(raw).trim()==='' ? !!(token && chat) : ['1','true','yes','on'].includes(String(raw).trim().toLowerCase()); })(),
  };
}

export function getTelegramLoggerInfo() {
  const c = getTelegramLoggerConfig();
  return { enabled: c.enabled, configured: !!(c.botToken && c.chatId), purpose:'lead-alerts', chatId: '', tokenMasked: '' };
}

export function saveTelegramLoggerConfig(input: Partial<TelegramLoggerConfig>) {
  const current = getTelegramLoggerConfig();
  const next: TelegramLoggerConfig = {
    enabled: input.enabled ?? current.enabled,
    botToken: String(input.botToken ?? current.botToken).trim(),
    chatId: String(input.chatId ?? current.chatId).trim(),
  };
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, encodeStoredJson(next), { encoding:'utf8', mode:0o600 });
  runtimeConfig = next;
  return getTelegramLoggerInfo();
}

function safe(value: unknown, max=700) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

const fieldNames:Record<string,string> = {
  name:'Họ và tên', fullName:'Họ và tên', fullname:'Họ và tên', phone:'Số điện thoại', phoneNumber:'Số điện thoại', phonenumber:'Số điện thoại',
  email:'Email', insurancePackage:'Gói bảo hiểm', insurancepackage:'Gói bảo hiểm', product:'Sản phẩm', productName:'Sản phẩm',
  address:'Địa chỉ', message:'Lời nhắn', notes:'Ghi chú', age:'Tuổi', birthDate:'Ngày sinh',
};

export function formatTelegramLead(input: {
  id:string; submittedAt?:string; name?:string; phone?:string; email?:string;
  customResponses?:Record<string,unknown>; tracking?:Record<string,unknown>;
  fieldLabels?:Record<string,string>;
}):string {
  const t=input.tracking||{}, custom=input.customResponses||{};
  const known=new Set(['name','fullname','phone','phonenumber','email']);
  const customLines=Object.entries(custom)
    .filter(([k,v])=>!known.has(k.toLowerCase())&&v!==undefined&&v!==null&&String(v).trim()!=='')
    .slice(0,12)
    .map(([k,v])=>`• ${safe(input.fieldLabels?.[k]||fieldNames[k]||k.replace(/([a-z])([A-Z])/g,'$1 $2'),80)}: ${safe(Array.isArray(v)?v.join(', '):v,350)}`);
  const date=input.submittedAt ? new Date(input.submittedAt) : null;
  const localTime=date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN',{
    timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit',
    day:'2-digit',month:'2-digit',year:'numeric',hour12:false,
  }).format(date) : '';
  const lines=[
    '🔥 LEAD MỚI TỪ WEBSITE','',`👤 Khách hàng: ${safe(input.name||'Khách hàng',160)}`,
    input.phone?`📞 Số điện thoại: ${safe(input.phone,80)}`:'',
    input.email?`✉️ Email: ${safe(input.email,180)}`:'',
    t.product?`🛡️ Sản phẩm: ${safe(t.product,180)}`:'',
    t.page?`📄 Trang: ${safe(t.page,120)}`:'',
    t.formId?`📝 Biểu mẫu: ${safe(t.formId,120)}`:'',
    t.utmSource?`📣 Nguồn truy cập: ${safe(t.utmSource,100)}`:'',
    t.utmCampaign && !/^lead_gen_(campaign|\d+)$/i.test(String(t.utmCampaign))?`🎯 Chiến dịch: ${safe(t.utmCampaign,140)}`:'',
    customLines.length?'Thông tin bổ sung:':'',...customLines,'',
    `Mã lead: ${safe(input.id,120)}`,localTime?`Thời gian (Việt Nam): ${localTime}`:'',
  ].filter(Boolean);
  return lines.join('\n').slice(0,3900);
}

async function telegramRequest(method: string, body: any, force = false) {
  const c = getTelegramLoggerConfig();
  if ((!c.enabled && !force) || !c.botToken || !c.chatId) return { skipped:true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`https://api.telegram.org/bot${c.botToken}/${method}`, {
      method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body), signal:controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export async function testTelegramConnection() {
  const c = getTelegramLoggerConfig();
  if (!c.botToken || !c.chatId) throw new Error('Thiếu Telegram Bot Token hoặc Chat ID.');
  await telegramRequest('sendMessage', { chat_id:c.chatId, text:'✅ Kết nối Lead/Form → Telegram thành công. Telegram chỉ nhận lead mới, không nhận lịch sử chatbot.' }, true);
  return true;
}

export function enqueueTelegramLead(input: {
  id:string; submittedAt?:string; name?:string; phone?:string; email?:string;
  customResponses?:Record<string,unknown>; tracking?:Record<string,unknown>; fieldLabels?:Record<string,string>;
}) {
  const c = getTelegramLoggerConfig();
  if (!c.enabled || !c.botToken || !c.chatId) return false;
  void telegramRequest('sendMessage', { chat_id:c.chatId, text:formatTelegramLead(input), disable_web_page_preview:true })
    .catch((err) => console.warn('[Telegram Lead Alert] send failed:', err?.message || err));
  return true;
}

export async function sendTelegramLeadNow(input: {
  id:string; submittedAt?:string; name?:string; phone?:string; email?:string;
  customResponses?:Record<string,unknown>; tracking?:Record<string,unknown>; fieldLabels?:Record<string,string>;
}) {
  const c = getTelegramLoggerConfig();
  if (!c.enabled || !c.botToken || !c.chatId) return { sent:false, configured:!!(c.botToken && c.chatId), enabled:c.enabled };
  const result:any=await telegramRequest('sendMessage',{chat_id:c.chatId,text:formatTelegramLead(input),disable_web_page_preview:true});
  return { sent:result?.ok===true, configured:true, enabled:true, messageId:result?.result?.message_id };
}
