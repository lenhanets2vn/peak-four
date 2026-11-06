import {getAuthHeaders,authFetch} from './api';
import { LeadSubmission, CloudStatusState, AdminUser } from '../types';
type StatusSubscriber = (status: CloudStatusState) => void;

let currentStatus: CloudStatusState = {
  status: 'offline',
  firebaseConfigured: false,
  accountLinked: false,
  lastSyncTime: null,
  activeListenersCount: 0,
  error: null,
  latencyMs: undefined,
};

const statusSubscribers = new Set<StatusSubscriber>();

export function getCloudStatus(): CloudStatusState {
  return currentStatus;
}

export function subscribeToCloudStatus(subscriber: StatusSubscriber): () => void {
  statusSubscribers.add(subscriber);
  subscriber(currentStatus);
  return () => {
    statusSubscribers.delete(subscriber);
  };
}

function updateStatus(patch: Partial<CloudStatusState>) {
  currentStatus = { ...currentStatus, ...patch };
  for (const sub of statusSubscribers) {
    try {
      sub(currentStatus);
    } catch (e) {
      console.error('Error in status subscriber:', e);
    }
  }
}

/**
 * Initializes and checks the connection to Firebase Firestore.
 */
let lastServerStatusAt = 0;
let serverStatusRequest: Promise<CloudStatusState> | null = null;
const SERVER_STATUS_CACHE_MS = 30000;

export async function checkFirebaseCloudStatus(
  user?: AdminUser | null,
  force = false,
): Promise<CloudStatusState> {
  const isLinked = !!(user?.firebaseLinked || user?.authMethod === 'google' || user?.firebaseUid);
  const linkedEmail = user?.firebaseEmail || (user?.authMethod === 'google' ? user?.email : undefined);
  const linkedUid = user?.firebaseUid;

  updateStatus({ accountLinked: isLinked, linkedEmail, linkedUid });

  const now = Date.now();
  if (!force && currentStatus.firebaseConfigured && now - lastServerStatusAt < SERVER_STATUS_CACHE_MS) {
    return currentStatus;
  }

  if (!serverStatusRequest || force) {
    serverStatusRequest = (async () => {
      const startedAt = Date.now();
      try {
        const response = await authFetch(`/api/cloud/status?_ts=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' },
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error: any = new Error(data?.error || `Cloud status HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }

        const configured = Boolean(data?.configured);
        const ready = Boolean(data?.ready);
        const degraded = Boolean(data?.degraded);
        const serverError = String(data?.error || '').trim();
        const lastWriteError = String(data?.lastWrite?.error || '').trim();
        const quotaBlocked = /RESOURCE_EXHAUSTED|quota exceeded|quota\/rate limit|quota/i.test(serverError);
        const status: CloudStatusState = {
          // Server-side Firestore persistence is the authoritative Cloud status.
          // A CMS user's optional Firebase/Google account link is a separate feature and
          // must not make an otherwise healthy Cloud connection appear amber/offline.
          status: !configured
            ? 'not_configured'
            : ready
              ? 'connected'
              : (quotaBlocked ? 'error' : 'offline'),
          firebaseConfigured: configured,
          accountLinked: isLinked,
          linkedEmail,
          linkedUid,
          projectId: data?.projectId || undefined,
          lastSyncTime: data?.lastSyncAt || null,
          activeListenersCount: currentStatus.activeListenersCount,
          error: ready
            ? (degraded && lastWriteError ? lastWriteError : null)
            : (!configured ? null : serverError || 'Cloud Firestore chưa sẵn sàng.'),
          latencyMs: Date.now() - startedAt,
          envSource: undefined,
          isAutoDetected: true,
          retryAt: data?.retryAt || undefined,
          degraded,
          lastWriteOperation: data?.lastWrite?.operation || undefined,
          lastWriteError: lastWriteError || null,
          messageQueue: data?.messageQueue ? {
            enabled: Boolean(data.messageQueue.enabled),
            configured: Boolean(data.messageQueue.configured),
            pending: data.messageQueue.pending == null ? null : Number(data.messageQueue.pending),
            leased: data.messageQueue.leased == null ? null : Number(data.messageQueue.leased),
            deadLetter: data.messageQueue.deadLetter == null ? null : Number(data.messageQueue.deadLetter),
            processing: Boolean(data.messageQueue.processing),
            processedCount: Number(data.messageQueue.processedCount || 0),
            failedCount: Number(data.messageQueue.failedCount || 0),
            lastProcessedAt: data.messageQueue.lastProcessedAt || null,
            lastError: data.messageQueue.lastError || null,
          } : undefined,
        } as CloudStatusState & { retryAt?: string };
        lastServerStatusAt = Date.now();
        updateStatus(status);
        return currentStatus;
      } catch (error: any) {
        const msg = error instanceof Error ? error.message : String(error);
        updateStatus({
          status: currentStatus.firebaseConfigured ? 'offline' : 'not_configured',
          accountLinked: isLinked,
          linkedEmail,
          linkedUid,
          error: msg || 'Không thể kiểm tra trạng thái Cloud.',
          latencyMs: undefined,
        });
        return currentStatus;
      } finally {
        serverStatusRequest = null;
      }
    })();
  }
  return serverStatusRequest;
}


async function api(path:string, init?:RequestInit) {const response=await authFetch(path,{...init,headers:getAuthHeaders()});const data=await response.json();if(!response.ok)throw new Error(data.error || 'Cloud chưa sẵn sàng.');return data;}
export async function fetchRecentLeadsOnce(onUpdate:(leads:LeadSubmission[])=>void,onError?:(error:any)=>void):Promise<void>{try{onUpdate((await api('/api/leads')).slice(0,20));}catch(error){onError?.(error);}}
function poll(task:()=>Promise<void>, onError?:(error:any)=>void, interval=15000):()=>void {let stopped=false;let timer:ReturnType<typeof setTimeout>;const run=async()=>{try{if(!stopped)await task();}catch(error){if(!stopped)onError?.(error);}finally{if(!stopped)timer=setTimeout(run,interval);}};void run();return ()=>{stopped=true;clearTimeout(timer);};}
export function subscribeToRealtimeLeads(onUpdate:(leads:LeadSubmission[])=>void,onError?:(error:any)=>void):()=>void{return poll(async()=>{const data=await api('/api/leads');onUpdate(data.slice(0,20));},onError);}
export async function syncLeadToFirestore(lead:LeadSubmission):Promise<void>{await api('/api/leads/cloud-sync',{method:'POST',body:JSON.stringify({ids:[lead.id]})});}
export async function deleteLeadFromFirestore(_leadId:string):Promise<void>{ /* Authoritative delete route already deletes from Cloud. */ }
export async function syncAllLeadsToFirestore(leads:LeadSubmission[]):Promise<{success:boolean;count:number;error?:string}>{try{return await api('/api/leads/cloud-sync',{method:'POST',body:JSON.stringify({ids:leads.map(l=>l.id)})});}catch(error:any){return {success:false,count:0,error:error.message};}}
export async function fetchPageSyncOnce(pageId:string,onUpdate:(data:{version:number;updatedAt:string;updatedBy?:string})=>void):Promise<void>{onUpdate(await api('/api/pages/'+encodeURIComponent(pageId)+'/sync'));}
export function subscribeToPageRealtimeSync(pageId:string,onUpdate:(data:{version:number;updatedAt:string;updatedBy?:string})=>void):()=>void{return poll(()=>fetchPageSyncOnce(pageId,onUpdate));}
export async function confirmPageSyncRealtime(pageId:string,expectedVersion:number,_timeoutMs=5000):Promise<boolean>{try{return (await api('/api/pages/'+encodeURIComponent(pageId)+'/sync')).version>=expectedVersion;}catch{return false;}}
export function subscribeToChatSessionRealtime(sessionId:string,onUpdate:(session:any)=>void,onError?:(error:any)=>void):()=>void{return poll(async()=>onUpdate(await api('/api/ai/chat/sessions/'+encodeURIComponent(sessionId))),onError,5000);}
export async function publishPageRealtimeUpdate(_pageId?:string,_version?:number,_author?:string):Promise<void>{ /* Backend save/publish is authoritative. */ }
