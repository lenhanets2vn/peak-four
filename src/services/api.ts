import {
  LandingPageConfig,
  LeadSubmission,
  FormField,
  AuditLogEntry,
  SystemBackupPayload,
  AdminUser,
  LandingPageSummary,
  ManagedAdminAccount,
  AnalyticsCampaignCost,
} from '../types';
import { formatLeadToRow, buildHeaderRow } from './sheetsApi';

const BASE_URL = '';

export function getStoredAdminToken(): string | null {
  try { return sessionStorage.getItem('baoviet_admin_token'); } catch { return null; }
}
export function setStoredAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem('baoviet_admin_token', token);
    else sessionStorage.removeItem('baoviet_admin_token');
  } catch {}
}
export function getAuthHeaders(): Record<string,string> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  const csrf=document.cookie.split(';').find(v=>v.trim().startsWith('bv_csrf=')); if(csrf)headers['X-CSRF-Token']=decodeURIComponent(csrf.trim().slice(8)); return headers;
}

let refreshInFlight: Promise<boolean> | null = null;
function withFreshCsrf(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  const csrf=document.cookie.split(';').find(v=>v.trim().startsWith('bv_csrf='));
  if(csrf)headers.set('X-CSRF-Token',decodeURIComponent(csrf.trim().slice(8)));
  return {...(init||{}),headers};
}
function isAuthControlRequest(input: RequestInfo | URL): boolean {
  const raw=typeof input==='string'?input:input instanceof URL?input.pathname:input.url;
  return /\/api\/auth\/(login|refresh|logout)(?:\?|$)/.test(raw);
}
async function performAccessRefresh(): Promise<boolean> {
  for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(`${BASE_URL}/api/auth/refresh`,{method:'POST',headers:getAuthHeaders(),body:'{}'}).catch(()=>null);
    if(response?.ok){setStoredAdminToken('cookie-session');return true;}
    if(response?.status===409){
      const data:any=await response.json().catch(()=>({}));
      if(data.code==='REFRESH_TOKEN_ROTATING'){await new Promise(resolve=>setTimeout(resolve,180*(attempt+1)));continue;}
    }
    if(!response || response.status >= 500){
      // Network/auth-session backend is temporarily unavailable. Keep the local
      // sentinel so the user can retry once Redis/Render recovers instead of
      // being falsely logged out by an infrastructure hiccup.
      return false;
    }
    setStoredAdminToken(null);
    try{window.dispatchEvent(new CustomEvent('cms-auth-expired'));}catch{}
    return false;
  }
  return false;
}
export async function refreshAdminAccess(): Promise<boolean> {
  if(!getStoredAdminToken())return false;
  if(!refreshInFlight)refreshInFlight=performAccessRefresh().finally(()=>{refreshInFlight=null;});
  return refreshInFlight;
}
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response=await fetch(input,withFreshCsrf(init));
  if(response.status!==401 || isAuthControlRequest(input) || !getStoredAdminToken())return response;
  if(!(await refreshAdminAccess()))return response;
  response=await fetch(input,withFreshCsrf(init));
  return response;
}

export async function fetchWithGatewayRetry(input: RequestInfo | URL, init?: RequestInit, retries = 3): Promise<Response> {
  const method = String(init?.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  let lastError: any = null;
  for (let attempt = 0; attempt < (canRetry ? retries : 1); attempt++) {
    try {
      const response = await authFetch(input, init);
      if (canRetry && [502, 503, 504].includes(response.status) && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!canRetry || attempt >= retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Không thể kết nối máy chủ.');
}

async function jsonOrThrow(res: Response, fallback: string) {
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
    const error:any = new Error(data.error||fallback);
    error.code = data.code;
    error.status = res.status;
    error.persistence = data.persistence;
    throw error;
  }
  return data;
}

export async function loginAdmin(payload:{passcode?:string;email?:string;displayName?:string;googleToken?:string;username?:string;password?:string;quickAdmin?:boolean}):Promise<{success:boolean;token:string;user:AdminUser;expiresIn:number}>{
  const data=await jsonOrThrow(await fetch(`${BASE_URL}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),'Đăng nhập quản trị thất bại');
  if(data.token)setStoredAdminToken(data.token); return data;
}

export async function getAdminAccounts():Promise<ManagedAdminAccount[]>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/admin-accounts`,{headers:getAuthHeaders()}),'Không thể tải tài khoản quản trị');}
export async function createAdminAccount(payload:{username:string;password:string;displayName:string;email?:string;role:string;enabled?:boolean}){return jsonOrThrow(await authFetch(`${BASE_URL}/api/admin-accounts`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Không thể tạo tài khoản');}
export async function updateAdminAccount(id:string,payload:Partial<ManagedAdminAccount>){return jsonOrThrow(await authFetch(`${BASE_URL}/api/admin-accounts/${encodeURIComponent(id)}`,{method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Không thể cập nhật tài khoản');}
export async function resetAdminPassword(id:string,password:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/admin-accounts/${encodeURIComponent(id)}/password`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({password})}),'Không thể đổi mật khẩu');}
export async function deleteAdminAccount(id:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/admin-accounts/${encodeURIComponent(id)}`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể xóa tài khoản');}

export async function sendAnalyticsEvents(events:any[]){try{await fetch(`${BASE_URL}/api/analytics/events`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),keepalive:true});}catch{}}
export async function getAnalyticsSummary(days=30,pageId?:string):Promise<any>{const q=new URLSearchParams({days:String(days)});if(pageId)q.set('pageId',pageId);return jsonOrThrow(await authFetch(`${BASE_URL}/api/analytics/summary?${q}`,{headers:getAuthHeaders()}),'Không thể tải Analytics');}
export async function getAnalyticsCosts():Promise<AnalyticsCampaignCost[]>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/analytics/costs`,{headers:getAuthHeaders()}),'Không thể tải chi phí campaign');}
export async function saveAnalyticsCosts(costs:AnalyticsCampaignCost[]):Promise<{success:boolean;costs:AnalyticsCampaignCost[]}>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/analytics/costs`,{method:'PUT',headers:getAuthHeaders(),body:JSON.stringify({costs})}),'Không thể lưu chi phí campaign');}

export async function getAdminSession():Promise<{user:AdminUser;expiresAt:number}>{
  return jsonOrThrow(await fetchWithGatewayRetry(`${BASE_URL}/api/auth/me`,{headers:getAuthHeaders()}),'Phiên quản trị không hợp lệ');
}

export async function linkFirebaseAccount(payload:{firebaseUid:string;firebaseEmail?:string;displayName?:string;googleToken?:string;idToken?:string}):Promise<{success:boolean;user:AdminUser}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/auth/link-firebase`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Liên kết Firebase thất bại');
}

export async function unlinkFirebaseAccount():Promise<{success:boolean;user:AdminUser}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/auth/unlink-firebase`,{method:'POST',headers:getAuthHeaders()}),'Hủy liên kết Firebase thất bại');
}

export interface CustomerFirebaseConfig {
  projectId:string;
  appId:string;
  apiKey:string;
  authDomain:string;
  storageBucket:string;
  messagingSenderId:string;
  measurementId?:string;
  oAuthClientId?:string;
  recaptchaSiteKey?:string;
}
export async function getFirebaseConfig():Promise<{configured:boolean;config:CustomerFirebaseConfig;envSource?:string;isAutoDetected?:boolean;notice?:string}> {
  return jsonOrThrow(await fetchWithGatewayRetry(`${BASE_URL}/api/firebase/config?_ts=${Date.now()}`,{cache:'no-store'}),'Không thể tải cấu hình Firebase');
}
export async function validateFirebaseConfig(config:CustomerFirebaseConfig):Promise<{valid:boolean;missing:string[];projectId:string;projectIdFormatValid:boolean}> {
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/firebase/config/validate`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({config})}),'Không thể kiểm tra cấu hình Firebase');
}
export async function saveFirebaseConfig(config:CustomerFirebaseConfig):Promise<{success:boolean;configured:boolean;config:CustomerFirebaseConfig}> {
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/firebase/config`,{method:'PUT',headers:getAuthHeaders(),body:JSON.stringify({config})}),'Không thể lưu cấu hình Firebase');
}

export async function logoutAdmin(){try{await authFetch(`${BASE_URL}/api/auth/logout`,{method:'POST',headers:getAuthHeaders()});}finally{setStoredAdminToken(null);}}

export async function getPublicConfig(slug: string = window.location.pathname):Promise<LandingPageConfig>{
  const res=await fetchWithGatewayRetry(`${BASE_URL}/api/config/published?slug=${encodeURIComponent(slug)}&_ts=${Date.now()}`,{cache:'no-store'}); return jsonOrThrow(res,'Không thể tải Landing Page');
}
export async function getPreviewConfig(token:string):Promise<LandingPageConfig>{
  return jsonOrThrow(await fetchWithGatewayRetry(`${BASE_URL}/api/config/preview?token=${encodeURIComponent(token)}&_ts=${Date.now()}`,{cache:'no-store'}),'Preview không còn hiệu lực');
}
export async function getAdminConfig(pageId?:string):Promise<LandingPageConfig>{
  const q=pageId?`pageId=${encodeURIComponent(pageId)}&`:''; return jsonOrThrow(await fetchWithGatewayRetry(`${BASE_URL}/api/config?${q}_ts=${Date.now()}`,{headers:getAuthHeaders(),cache:'no-store'}),'Không thể tải cấu hình CMS');
}
export async function saveAdminConfig(config:LandingPageConfig,author?:string,pageId?:string):Promise<{success:boolean;config:LandingPageConfig;changeSummary?:string[];persistence?:{localSaved?:boolean;cloud?:'queued'|'synced'|'local';jobId?:string|null;coalesced?:boolean}}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/config`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({pageId,config,author})}),'Lưu bản nháp thất bại');
}
export async function publishConfig(config?:LandingPageConfig,author?:string,note?:string,pageId?:string):Promise<{success:boolean;config:LandingPageConfig;version:number;persistence?:{localSaved?:boolean;cloud?:'queued'|'synced'|'local';jobId?:string|null}}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/config/publish`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({pageId,author,note,config})}),'Xuất bản Landing Page thất bại');
}
export async function createPreviewToken(pageId?:string):Promise<{success:boolean;token:string;url:string;expiresIn:number}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/preview-token`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({pageId})}),'Không thể tạo Preview URL');
}

export async function getPages(includeTrash=false):Promise<LandingPageSummary[]>{
  return jsonOrThrow(await fetchWithGatewayRetry(`${BASE_URL}/api/pages?includeTrash=${includeTrash}`,{headers:getAuthHeaders()}),'Không thể tải danh sách Landing Page');
}
export async function reorderPages(orderedIds:string[]):Promise<void>{
  await jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/order`,{method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify({orderedIds})}),'Không thể lưu thứ tự trang');
}
export async function createPage(payload:{name:string;slug?:string;templatePageId?:string}){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Không thể tạo Landing Page');}
export async function duplicatePage(id:string,payload:{name?:string;slug?:string}={}){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(id)}/duplicate`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Không thể duplicate Landing Page');}
export async function updatePage(id:string,payload:Partial<Pick<LandingPageSummary,'name'|'slug'|'status'>>){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(id)}`,{method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify(payload)}),'Không thể cập nhật Landing Page');}
export async function trashPage(id:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(id)}`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể đưa Page vào thùng rác');}
export async function restorePage(id:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(id)}/restore`,{method:'POST',headers:getAuthHeaders()}),'Không thể khôi phục Page');}
export async function permanentDeletePage(id:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(id)}/permanent`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể xóa vĩnh viễn Page');}

export async function getPageSeo(pageId: string): Promise<{ pageId: string; pageName: string; slug: string; published: boolean; version: number; seo: any }> {
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(pageId)}/seo`, { headers: getAuthHeaders() }), 'Không thể tải SEO của Landing Page');
}

export async function savePageSeo(pageId: string, seo: any): Promise<{ success: boolean; pageId: string; pageName: string; slug: string; seo: any; persistence?: { localSaved?: boolean; cloud?: 'queued'|'synced'|'local'; jobId?: string|null; coalesced?: boolean } }> {
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/pages/${encodeURIComponent(pageId)}/seo`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ seo }) }), 'Không thể lưu SEO của Landing Page');
}

export async function publishPage(pageId: string): Promise<any> {
  return publishConfig(undefined, undefined, 'Xuất bản SEO & Nội dung', pageId);
}

export const fetchPublishedConfig=getPublicConfig;
export const fetchAdminConfig=getAdminConfig;
export const fetchAdminLeads=getLeads;

export async function getConfigVersions(pageId?:string):Promise<Array<{id:string;pageId?:string;pageName?:string;versionNumber:number;timestamp:string;author:string;note?:string;changeSummary?:string[];sectionsCount:number}>>{
  const q=pageId?`?pageId=${encodeURIComponent(pageId)}`:''; return jsonOrThrow(await authFetch(`${BASE_URL}/api/config/versions${q}`,{headers:getAuthHeaders()}),'Không thể tải lịch sử phiên bản');
}
export async function rollbackConfig(versionId:string,pageId?:string):Promise<{success:boolean;message:string;config:LandingPageConfig}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/config/rollback`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({versionId,pageId})}),'Hoàn tác phiên bản thất bại');
}
export async function deleteConfigVersions(pageId?:string):Promise<{success:boolean;deleted:number}>{
  const q=pageId?`?pageId=${encodeURIComponent(pageId)}`:'';
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/config/versions${q}`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể xóa lịch sử Revision History');
}
export async function getAuditLogs(limit=100):Promise<AuditLogEntry[]>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/audit-logs?limit=${limit}`,{headers:getAuthHeaders()}),'Không thể tải Audit Logs');}

export async function triggerBackupDownload(){
  const res=await authFetch(`${BASE_URL}/api/backup/export`,{headers:getAuthHeaders()});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||'Không thể xuất backup');}
  const blob=await res.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`baoviet_cms_backup_${Date.now()}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
export async function restoreSystemBackup(backupData:SystemBackupPayload):Promise<{success:boolean;message:string;config:LandingPageConfig}>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/backup/restore`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(backupData)}),'Khôi phục backup thất bại');}

export async function getLkgStatus():Promise<any>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/lkg/status`,{headers:getAuthHeaders()}),'Không thể tải trạng thái Last Known Good');}
export async function createLkgSnapshot(reason='manual-snapshot'):Promise<any>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/lkg/create`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({reason})}),'Không thể tạo Last Known Good Snapshot');}
export async function restoreLkgSnapshot(slot:'current'|'previous'='current'):Promise<any>{return jsonOrThrow(await authFetch(`${BASE_URL}/api/lkg/restore`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({slot})}),'Không thể khôi phục Last Known Good Snapshot');}

export async function submitLead(payload:{name:string;email?:string;phone:string;customResponses:Record<string,any>;tracking:any;website_trap?:string}){
  const result = await jsonOrThrow(await fetch(`${BASE_URL}/api/leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),'Gửi yêu cầu tư vấn thất bại');
  if (result?.lead) {
    import('./firebaseRealtime').then(({ syncLeadToFirestore }) => {
      syncLeadToFirestore(result.lead).catch(() => {});
    }).catch(() => {});
  }
  return result;
}
export async function getLeads():Promise<LeadSubmission[]> {
  const maxAttempts = 3;
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithGatewayRetry(`${BASE_URL}/api/leads?_ts=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      return await jsonOrThrow(res, 'Không thể tải danh sách khách hàng');
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.status || 0);
      // A Render gateway 502/503/504 can be transient during a restart/cold start.
      if (![502, 503, 504].includes(status) || attempt === maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
  throw lastError || new Error('Không thể tải danh sách khách hàng');
}
export async function deleteLead(leadId:string){
  const result = await jsonOrThrow(await authFetch(`${BASE_URL}/api/leads/${encodeURIComponent(leadId)}`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể xóa khách hàng');
  import('./firebaseRealtime').then(({ deleteLeadFromFirestore }) => {
    deleteLeadFromFirestore(leadId).catch(() => {});
  }).catch(() => {});
  return result;
}
export async function deleteAllLeads():Promise<{success:boolean;deletedCount:number}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/leads`,{method:'DELETE',headers:getAuthHeaders()}),'Không thể xóa toàn bộ danh sách khách hàng');
}
export async function resetDashboardData(options:{analytics?:boolean;campaignCosts?:boolean}={analytics:true,campaignCosts:true}):Promise<{success:boolean;deletedAnalytics:number;deletedCampaignCosts:number}>{
  return jsonOrThrow(await authFetch(`${BASE_URL}/api/dashboard/reset`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify(options)}),'Không thể reset dữ liệu Dashboard');
}

export async function syncLeadsWithToken(token:string,spreadsheetId:string,sheetName:string){return syncLeadsViaWebhookOrToken({token,spreadsheetId,sheetName});}
export async function syncLeadsViaWebhookOrToken(options:{token?:string|null;spreadsheetId?:string;sheetName?:string;webhookUrl?:string;pageId?:string}):Promise<{success:boolean;syncedCount:number;errors:any[];method?:string}>{
  const headers=getAuthHeaders();return jsonOrThrow(await authFetch(`${BASE_URL}/api/leads/sync-all`,{method:'POST',headers,body:JSON.stringify(options)}),'Đồng bộ Google Sheets thất bại');
}
export async function testWebhookUrl(webhookUrl:string,pageId?:string){return jsonOrThrow(await authFetch(`${BASE_URL}/api/sheets/test-webhook`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({webhookUrl,pageId})}),'Kiểm tra Webhook thất bại');}
export async function saveServerToken(token:string):Promise<boolean>{try{return (await authFetch(`${BASE_URL}/api/sheets/save-token`,{method:'POST',headers:getAuthHeaders(),body:JSON.stringify({token})})).ok;}catch{return false;}}
export async function disconnectGoogleSheets(){return jsonOrThrow(await authFetch(`${BASE_URL}/api/sheets/disconnect`,{method:'POST',headers:getAuthHeaders()}),'Ngắt kết nối thất bại');}

export function downloadLeadsCsv(leads:LeadSubmission[],formFields:FormField[] = []){
  if(!leads.length)return;const safeFields = formFields || [];const dynamicNames=new Set(safeFields.map(f=>f.name));for(const lead of leads)Object.keys(lead.customResponses||{}).forEach(k=>dynamicNames.add(k));const fields=[...dynamicNames].map((name,index)=>safeFields.find(f=>f.name===name)||({id:`export_${name}`,name,label:name,type:'text',placeholder:'',required:false,order:999+index} as FormField));
  const headers=buildHeaderRow(fields);const rows=leads.map(lead=>formatLeadToRow(lead,fields));const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\uFEFF'+[headers.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`baoviet_leads_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
