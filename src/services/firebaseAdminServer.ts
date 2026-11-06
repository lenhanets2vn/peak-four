import { cert, getApps, initializeApp, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore, WriteBatch, FieldPath, DocumentSnapshot } from 'firebase-admin/firestore';
import crypto from 'crypto';
import fs from 'fs';
import { enqueueCloudWriteJob, startCloudWriteQueueWorker, drainCloudWriteQueue, cloudWriteQueueConfigured, getCloudWriteQueueStatus, retryDeadCloudWriteJobs, purgeDeadCloudWriteJobs, type CloudQueueJob } from './messageQueueServer';

export interface ServerFirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export interface CloudStateInput {
  pages: any[];
  leads: any[];
  adminAccounts: any[];
  auditLogs: any[];
  versions: any[];
  analytics: any[];
  analyticsCosts: any[];
  aiKnowledge: any[];
  aiTaxonomy: any;
  aiTraining: any;
  chatSessions: any[];
  systemState: any;
  firebaseConfig: ServerFirebaseConfig;
}

export type CloudDirtyCollection = 'pages'|'leads'|'adminAccounts'|'auditLogs'|'versions'|'analytics'|'analyticsCosts'|'aiKnowledge'|'aiTaxonomy'|'aiTraining'|'chatSessions'|'settings';

export interface CloudStateOutput extends CloudStateInput {
  exists: boolean;
  updatedAt?: string;
  schemaVersion?: number;
  aiInitialized?: boolean;
}

export interface CloudPersistenceStatus {
  configured: boolean;
  ready: boolean;
  projectId?: string;
  lastSyncAt?: string;
  error?: string;
  retryAt?: string;
  credentialSource?: string;
  lastWriteAt?: string;
  lastWriteOperation?: string;
  lastWriteError?: string;
  degraded?: boolean;
}

const CLOUD_PROCESS_STARTED_AT = Date.now();
const META_COLLECTION = 'cms_meta';
const META_DOC = 'state';
const COLLECTIONS = {
  pages: 'cms_pages',
  leads: 'cms_leads',
  admins: 'cms_admin_accounts',
  auditLogs: 'cms_audit_logs',
  versions: 'cms_versions',
  analyticsChunks: 'cms_analytics_chunks',
  analyticsCosts: 'cms_analytics_costs',
  aiKnowledge: 'cms_ai_knowledge',
  aiChatSessions: 'cms_ai_chat_sessions',
};

let app: App | null = null;
let db: Firestore | null = null;
let firestoreSettingsApplied = false;
let projectId: string | undefined;
let status: CloudPersistenceStatus = { configured: false, ready: false };
let queue: Promise<void> = Promise.resolve();
let lastRemoteUpdatedAt = '';
const instanceId = `cms_${crypto.randomBytes(6).toString('hex')}`;

// Firestore quota protection: RESOURCE_EXHAUSTED must not trigger aggressive retries.
// A short in-memory cooldown prevents a single Render instance from turning a quota
// condition into a read/write storm.
let quotaBlockedUntil = 0;
let lastConnectionProbeAt = 0;
let remoteReloadTimer: NodeJS.Timeout | null = null;
let cloudStateCache: CloudStateOutput | null = null;
let cloudStateCacheAt = 0;
const collectionIdCache = new Map<string, Set<string>>();
const CLOUD_STATE_CACHE_TTL_MS = 4000;
const CONNECTION_PROBE_TTL_MS = 60000;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

function envMs(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] || '');
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.round(raw)));
}

// Firestore writes on Render can occasionally exceed a few seconds even when the
// connection is healthy. Keep normal mutations bounded, but allow publication/full
// reconciliation more time so a slow commit does not become a false global outage.
const CLOUD_WRITE_TIMEOUT_MS = envMs('CLOUD_WRITE_TIMEOUT_MS', 20000, 5000, 90000);
const CLOUD_PUBLISH_TIMEOUT_MS = envMs('CLOUD_PUBLISH_TIMEOUT_MS', 60000, 10000, 110000);
const CLOUD_FULL_SYNC_TIMEOUT_MS = envMs('CLOUD_FULL_SYNC_TIMEOUT_MS', 60000, 10000, 110000);
const CLOUD_PROBE_TIMEOUT_MS = envMs('CLOUD_PROBE_TIMEOUT_MS', 10000, 2000, 30000);

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type CredentialSource = { credential: any; credentialProjectId?: string; source: string };

function parseServiceAccount(input: string): any {
  let normalized = input.trim();
  let parsed: any;
  try {
    parsed = JSON.parse(normalized);
    // Render copy/paste can sometimes store the entire JSON as a quoted JSON string.
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  } catch {
    throw new Error('Firebase Service Account không phải JSON hợp lệ. Hãy dán toàn bộ JSON service-account vào một biến ENV, không chỉ Web Config.');
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('Firebase Service Account thiếu client_email/private_key/project_id.');
  }
  parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
  return parsed;
}

function credentialsFromEnv(): CredentialSource {
  const rawCandidates = [
    ['FIREBASE_SERVICE_ACCOUNT_JSON', process.env.FIREBASE_SERVICE_ACCOUNT_JSON],
    ['FIREBASE_SERVICE_ACCOUNT', process.env.FIREBASE_SERVICE_ACCOUNT],
    ['FIREBASE_SERVICE_ACCOUNT_KEY', process.env.FIREBASE_SERVICE_ACCOUNT_KEY],
    ['GOOGLE_SERVICE_ACCOUNT_JSON', process.env.GOOGLE_SERVICE_ACCOUNT_JSON],
    ['GOOGLE_APPLICATION_CREDENTIALS_JSON', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON],
  ] as Array<[string, string | undefined]>;
  const rawEntry = rawCandidates.find(([, v]) => String(v || '').trim());
  if (rawEntry) {
    const parsed = parseServiceAccount(String(rawEntry[1]));
    return { credential: cert(parsed), credentialProjectId: parsed.project_id, source: rawEntry[0] };
  }

  const base64Candidates = [
    ['FIREBASE_SERVICE_ACCOUNT_BASE64', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64],
    ['FIREBASE_SERVICE_ACCOUNT_B64', process.env.FIREBASE_SERVICE_ACCOUNT_B64],
    ['GOOGLE_SERVICE_ACCOUNT_BASE64', process.env.GOOGLE_SERVICE_ACCOUNT_BASE64],
  ] as Array<[string, string | undefined]>;
  const base64Entry = base64Candidates.find(([, v]) => String(v || '').trim());
  if (base64Entry) {
    let decoded = '';
    try { decoded = Buffer.from(String(base64Entry[1]).trim(), 'base64').toString('utf8'); }
    catch { throw new Error(`${base64Entry[0]} không thể giải mã Base64.`); }
    const parsed = parseServiceAccount(decoded);
    return { credential: cert(parsed), credentialProjectId: parsed.project_id, source: base64Entry[0] };
  }

  // Render may expose a mounted JSON file instead of a JSON environment variable.
  const fileCandidates = [
    ['FIREBASE_SERVICE_ACCOUNT_FILE', process.env.FIREBASE_SERVICE_ACCOUNT_FILE],
    ['GOOGLE_APPLICATION_CREDENTIALS', process.env.GOOGLE_APPLICATION_CREDENTIALS],
  ] as Array<[string, string | undefined]>;
  const fileEntry = fileCandidates.find(([, v]) => String(v || '').trim());
  if (fileEntry) {
    const filePath = String(fileEntry[1]).trim();
    if (!fs.existsSync(filePath)) throw new Error(`${fileEntry[0]} trỏ tới file không tồn tại: ${filePath}`);
    const parsed = parseServiceAccount(fs.readFileSync(filePath, 'utf8'));
    return { credential: cert(parsed), credentialProjectId: parsed.project_id, source: fileEntry[0] };
  }

  // Support Render setups that store the three service-account fields separately.
  const project = String(process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKeyRaw = String(process.env.FIREBASE_PRIVATE_KEY || '').trim();
  if (project && clientEmail && privateKeyRaw) {
    return {
      credential: cert({ projectId: project, clientEmail, privateKey: privateKeyRaw.replace(/\\n/g, '\n') }),
      credentialProjectId: project,
      source: 'FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
    };
  }

  throw new Error('Không tìm thấy Firebase Service Account phía server. Render cần FIREBASE_SERVICE_ACCOUNT_JSON/BASE64 hoặc FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. VITE_FIREBASE_* chỉ là Web Config và không thể thay thế Admin credential.');
}

export function getFirebaseCredentialDiagnostics() {
  const names = [
    'FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_SERVICE_ACCOUNT','FIREBASE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_SERVICE_ACCOUNT_JSON','GOOGLE_APPLICATION_CREDENTIALS_JSON',
    'FIREBASE_SERVICE_ACCOUNT_BASE64','FIREBASE_SERVICE_ACCOUNT_B64','GOOGLE_SERVICE_ACCOUNT_BASE64',
    'FIREBASE_SERVICE_ACCOUNT_FILE','GOOGLE_APPLICATION_CREDENTIALS',
    'FIREBASE_PROJECT_ID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY',
  ];
  const present = names.filter((name) => Boolean(String(process.env[name] || '').trim()));
  let resolvedSource = '';
  let resolvedProjectId = '';
  let error = '';
  try {
    const source = credentialsFromEnv();
    resolvedSource = source.source;
    resolvedProjectId = source.credentialProjectId || '';
  } catch (err:any) {
    error = String(err?.message || err || '');
  }
  return { present, resolvedSource, resolvedProjectId, error };
}

export function getCloudPersistenceStatus(): CloudPersistenceStatus {
  return { ...status };
}

function isResourceExhausted(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return code === 'resource-exhausted' || /resource_exhausted|quota exceeded|quota limit|too many requests/.test(message);
}

function classifyCloudError(error: any): string {
  const detail = String(error?.message || error || 'Không xác định');
  if (isResourceExhausted(error)) {
    return `Cloud Firestore đang bị giới hạn quota/rate limit (RESOURCE_EXHAUSTED). Hệ thống đã tạm dừng retry để tránh làm quota nặng hơn. Vui lòng kiểm tra Firestore Usage/Quota của project ${projectId || ''} và đợi quota phục hồi.`.trim();
  }
  return detail;
}

function isCredentialCloudError(error: any): boolean {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return code.includes('permission')
    || code.includes('unauthenticated')
    || /credential|service account|private key|invalid jwt|invalid_grant|signature|permission_denied|unauthenticated|project không khớp/.test(message);
}

function markQuotaBlocked(error: any) {
  if (!isResourceExhausted(error)) return;
  quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
}

function isQuotaCoolingDown(): boolean {
  return Date.now() < quotaBlockedUntil;
}

function rememberCollectionIds(collectionName: string, docs: Array<{ id: string }>) {
  collectionIdCache.set(collectionName, new Set(docs.map((d) => String(d.id))));
}

export async function initializeCloudPersistence(config: ServerFirebaseConfig): Promise<CloudPersistenceStatus> {
  if (!config?.projectId) {
    status = { configured: false, ready: false, error: 'Thiếu Firebase Project ID.' };
    return status;
  }
  if (status.ready && !status.degraded && projectId === config.projectId && db) return { ...status };
  if (isQuotaCoolingDown() && projectId === config.projectId) return { ...status };

  try {
    if (app && projectId !== config.projectId) {
      await deleteApp(app).catch(() => undefined);
      app = null;
      db = null;
      firestoreSettingsApplied = false;
      cloudStateCache = null;
      cloudStateCacheAt = 0;
      collectionIdCache.clear();
    }

    const credentialSource = credentialsFromEnv();
    if (credentialSource.credentialProjectId && credentialSource.credentialProjectId !== config.projectId) {
      throw new Error(`Firebase project không khớp: Web Config=${config.projectId}, Service Account=${credentialSource.credentialProjectId}.`);
    }

    if (!app) {
      const name = `cms-cloud-${config.projectId}`;
      const existing = getApps().find((candidate) => candidate.name === name);
      app = existing || initializeApp({
        credential: credentialSource.credential,
        projectId: config.projectId,
      }, name);
    }

    const appProjectId = String((app.options as any)?.projectId || config.projectId);
    if (appProjectId && appProjectId !== config.projectId) {
      throw new Error(`Firebase project không khớp: Web Config=${config.projectId}, Admin SDK=${appProjectId}.`);
    }

    if (!db) {
      db = getFirestore(app);
      if (!firestoreSettingsApplied) {
        db.settings({ ignoreUndefinedProperties: true });
        firestoreSettingsApplied = true;
      }
    }
    projectId = config.projectId;

    const now = Date.now();
    // Do not issue the same authenticated probe repeatedly during one cold start/recovery window.
    if (now - lastConnectionProbeAt >= CONNECTION_PROBE_TTL_MS || !status.ready) {
      await withTimeout(
        db.collection(META_COLLECTION).doc('connection').get(),
        CLOUD_PROBE_TIMEOUT_MS,
        `Firestore connection probe vượt quá ${Math.round(CLOUD_PROBE_TIMEOUT_MS / 1000)}s.`,
      );
      lastConnectionProbeAt = Date.now();
    }

    quotaBlockedUntil = 0;
    status = { configured: true, ready: true, degraded: false, projectId: config.projectId, lastSyncAt: status.lastSyncAt, error: undefined, retryAt: undefined, credentialSource: credentialSource.source, lastWriteAt: status.lastWriteAt, lastWriteOperation: status.lastWriteOperation, lastWriteError: status.lastWriteError };
    return { ...status };
  } catch (error: any) {
    lastConnectionProbeAt = 0;
    markQuotaBlocked(error);
    const detail = classifyCloudError(error);
    const credentialHint = isCredentialCloudError(error)
      ? ' | Kiểm tra Firebase Service Account trên Render Environment và quyền Firestore của đúng project.'
      : '';
    status = {
      ...status,
      configured: true,
      ready: false,
      degraded: false,
      projectId: config.projectId,
      lastSyncAt: status.lastSyncAt,
      error: isResourceExhausted(error) ? detail : `${detail}${credentialHint}`,
      retryAt: isResourceExhausted(error) ? new Date(quotaBlockedUntil).toISOString() : undefined,
    };
    return { ...status };
  }
}

export function getCloudFirestore(): Firestore {
  return getDb();
}

// Server-only secrets are stored in Firestore, never in the local data directory.
// Firebase Admin SDK bypasses client Firestore rules, so this document is not exposed
// to the browser. Keep this separate from the normal AI training/config snapshot so
// the credential can never be accidentally copied into public configuration payloads.
const AI_SECRETS_DOC = 'ai_secrets';

export async function getGeminiApiSecretFromCloud(): Promise<string> {
  try {
    const firestore = getDb();
    const snap = await firestore.collection(META_COLLECTION).doc(AI_SECRETS_DOC).get();
    const value = snap.data()?.geminiApiKey;
    return typeof value === 'string' ? value.trim() : '';
  } catch (err: any) {
    console.warn('[GeminiKey] Không thể đọc secret từ Firestore (sẽ retry khi Firestore ready):', err?.message || err);
    return '';
  }
}

export async function setGeminiApiSecretInCloud(apiKey: string, auditLog: any): Promise<void> {
  const normalized = String(apiKey || '').trim();
  if (!normalized) throw new Error('Gemini API key không được để trống.');
  const firestore = getDb();
  const secretRef = firestore.collection(META_COLLECTION).doc(AI_SECRETS_DOC);
  const auditId = String(auditLog?.id || `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
  const auditRef = firestore.collection(COLLECTIONS.auditLogs).doc(auditId);
  const batch = firestore.batch();
  batch.set(secretRef, {
    geminiApiKey: normalized,
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  }, { merge: true });
  batch.set(auditRef, { ...auditLog, id: auditId }, { merge: false });
  await batch.commit();
}

export async function deleteGeminiApiSecretFromCloud(auditLog: any): Promise<void> {
  const firestore = getDb();
  const secretRef = firestore.collection(META_COLLECTION).doc(AI_SECRETS_DOC);
  const auditId = String(auditLog?.id || `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
  const auditRef = firestore.collection(COLLECTIONS.auditLogs).doc(auditId);
  const batch = firestore.batch();
  batch.delete(secretRef);
  batch.set(auditRef, { ...auditLog, id: auditId }, { merge: false });
  await batch.commit();
}

const AI_ERROR_LOGS_DOC = 'ai_error_logs';

export async function saveGeminiErrorLogsToCloud(logs: any[], quotaState?: any): Promise<void> {
  try {
    const firestore = getDb();
    const docRef = firestore.collection(META_COLLECTION).doc(AI_ERROR_LOGS_DOC);
    const trimmed = Array.isArray(logs) ? logs.slice(0, 150) : [];
    await docRef.set({
      logs: trimmed,
      quotaState: quotaState || null,
      updatedAt: new Date().toISOString(),
      count: trimmed.length,
    }, { merge: true });
  } catch (err: any) {
    console.warn('[Cloud Persistence] Không thể lưu Gemini error logs vào Firestore:', err?.message || err);
  }
}

export async function loadGeminiErrorLogsFromCloud(): Promise<{ logs: any[]; quotaState?: any }> {
  try {
    const firestore = getDb();
    const snap = await firestore.collection(META_COLLECTION).doc(AI_ERROR_LOGS_DOC).get();
    const data = snap.data();
    return {
      logs: Array.isArray(data?.logs) ? data.logs : [],
      quotaState: data?.quotaState || null,
    };
  } catch (err: any) {
    console.warn('[Cloud Persistence] Không thể tải Gemini error logs từ Firestore:', err?.message || err);
    return { logs: [], quotaState: null };
  }
}


export async function deleteAIKnowledgeItemFromCloud(id: string, auditLog?: any): Promise<void> {
  const safeId = String(id || '').trim();
  if (!safeId || safeId.length > 128 || /\//.test(safeId)) throw new Error('ID mục tri thức không hợp lệ.');
  const payload = { id: safeId, auditLog: auditLog ? plain(auditLog) : undefined };
  await queueOrRunCloudWrite('knowledge-delete', `delete AI knowledge ${safeId}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'knowledge-delete', label:`delete AI knowledge ${safeId}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { maxAttempts: 8, coalesceKey:`entity:knowledge:${safeId}` });
}

export async function deleteAIKnowledgeItemsBulkFromCloud(ids: string[], auditLog?: any): Promise<void> {
  const safeIds = (Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter((id) => id && id.length <= 128 && !/\//.test(id));
  if (!safeIds.length) return;
  const payload = { ids: safeIds, auditLog: auditLog ? plain(auditLog) : undefined };
  await queueOrRunCloudWrite('knowledge-delete-bulk', `delete ${safeIds.length} AI knowledge items`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'knowledge-delete-bulk', label:`delete ${safeIds.length} AI knowledge items`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { maxAttempts: 8 });
}

function getDb(): Firestore {
  if (!db || !status.ready) throw new Error(status.error || 'Firebase server persistence chưa sẵn sàng.');
  return db;
}

async function commitBatches(operations: Array<(batch: WriteBatch) => void>) {
  const firestore = getDb();
  const MAX = 450;
  for (let i = 0; i < operations.length; i += MAX) {
    const batch = firestore.batch();
    for (const op of operations.slice(i, i + MAX)) op(batch);
    await batch.commit();
  }
}

const FIRESTORE_READ_PAGE_SIZE = 100;

/**
 * Reads a collection in bounded pages. Every collection query has an explicit
 * limit(), preventing accidental unbounded snapshots while preserving all data.
 */
async function readCollectionAll(collectionName: string): Promise<Array<{ id: string; data: () => any }>> {
  const firestore = getDb();
  const col = firestore.collection(collectionName);
  const docs: Array<{ id: string; data: () => any }> = [];
  let last: DocumentSnapshot | undefined;
  while (true) {
    let q = col.orderBy(FieldPath.documentId()).limit(FIRESTORE_READ_PAGE_SIZE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    docs.push(...snap.docs);
    if (snap.size < FIRESTORE_READ_PAGE_SIZE) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return docs;
}

async function replaceCollection(collectionName: string, items: any[], idField = 'id') {
  const firestore = getDb();
  const col = firestore.collection(collectionName);
  let existingIds = collectionIdCache.get(collectionName);
  // Only perform a reconciliation read the first time this collection is written by this instance.
  if (!existingIds) {
    const existing = await readCollectionAll(collectionName);
    existingIds = new Set(existing.map((d) => d.id));
    collectionIdCache.set(collectionName, existingIds);
  }
  const nextIds = new Set<string>();
  const operations: Array<(batch: WriteBatch) => void> = [];

  for (const item of items) {
    const id = String(item?.[idField] || '');
    if (!id || id.length > 128 || /\//.test(id)) continue;
    nextIds.add(id);
    const safe = plain(item);
    operations.push((batch) => batch.set(col.doc(id), safe, { merge: false }));
  }
  for (const existingId of existingIds) {
    if (!nextIds.has(existingId)) operations.push((batch) => batch.delete(col.doc(existingId)));
  }
  await commitBatches(operations);
  collectionIdCache.set(collectionName, nextIds);
}

async function replaceAnalytics(events: any[]) {
  const firestore = getDb();
  const col = firestore.collection(COLLECTIONS.analyticsChunks);
  let existingIds = collectionIdCache.get(COLLECTIONS.analyticsChunks);
  if (!existingIds) {
    const existing = await readCollectionAll(COLLECTIONS.analyticsChunks);
    existingIds = new Set(existing.map((d) => d.id));
    collectionIdCache.set(COLLECTIONS.analyticsChunks, existingIds);
  }
  const CHUNK_SIZE = 400;
  const chunks: any[][] = [];
  for (let i = 0; i < events.length; i += CHUNK_SIZE) chunks.push(events.slice(i, i + CHUNK_SIZE));
  const operations: Array<(batch: WriteBatch) => void> = [];
  const keep = new Set<string>();
  chunks.forEach((chunk, index) => {
    const id = `chunk_${String(index).padStart(6, '0')}`;
    keep.add(id);
    const ref = col.doc(id);
    operations.push((batch) => batch.set(ref, { id, index, events: plain(chunk), updatedAt: new Date().toISOString() }, { merge: false }));
  });
  for (const existingId of existingIds) if (!keep.has(existingId)) operations.push((batch) => batch.delete(col.doc(existingId)));
  await commitBatches(operations);
  collectionIdCache.set(COLLECTIONS.analyticsChunks, keep);
}


export async function appendAnalyticsBatch(events: any[]): Promise<void> {
  if (!events.length) return;
  const firestore = getDb();
  const id = `batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  await firestore.collection(COLLECTIONS.analyticsChunks).doc(id).set({
    id,
    batch: true,
    createdAt: new Date().toISOString(),
    events: plain(events),
  }, { merge: false });
  const ids = collectionIdCache.get(COLLECTIONS.analyticsChunks) || new Set<string>();
  ids.add(id);
  collectionIdCache.set(COLLECTIONS.analyticsChunks, ids);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class CloudOperationTimeoutError extends Error {
  code = 'LOCAL_CLOUD_TIMEOUT';
  constructor(public label: string, public timeoutMs: number) {
    super(`Cloud operation "${label}" vượt quá thời gian chờ (${Math.round(timeoutMs / 1000)}s).`);
    this.name = 'CloudOperationTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string, timeoutError?: Error): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError || new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isLocalCloudTimeout(error: any): boolean {
  return error instanceof CloudOperationTimeoutError || String(error?.code || '') === 'LOCAL_CLOUD_TIMEOUT';
}

function isRetryableCloudError(error: any): boolean {
  if (isResourceExhausted(error)) return false;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  if (code.includes('permission') || code.includes('unauthenticated') || code.includes('invalid-argument') || code.includes('not-found')) {
    return false;
  }
  return ['aborted', 'deadline-exceeded', 'unavailable', 'internal'].includes(code)
    || /timeout|timed out|temporar|unavailable|connection|socket|econn|reset|network/.test(message);
}

async function withCloudRetry<T>(
  operation: () => Promise<T>,
  label: string,
  attempts = 2,
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (isResourceExhausted(error)) {
        markQuotaBlocked(error);
        throw error;
      }
      if (attempt >= attempts || !isRetryableCloudError(error)) throw error;
      const delay = Math.min(500 * (2 ** (attempt - 1)), 1500);
      console.warn(`[Cloud Persistence] ${label} failed (${attempt}/${attempts}); retrying in ${delay}ms: ${error?.message || error}`);
      await sleep(delay);
    }
  }
  throw lastError;
}

async function probeCloudConnectionDirect(timeoutMs = CLOUD_PROBE_TIMEOUT_MS): Promise<boolean> {
  if (!db) return false;
  try {
    await withTimeout(
      db.collection(META_COLLECTION).doc('connection').get(),
      timeoutMs,
      `Firestore probe vượt quá ${Math.round(timeoutMs / 1000)}s.`,
    );
    lastConnectionProbeAt = Date.now();
    return true;
  } catch {
    lastConnectionProbeAt = 0;
    return false;
  }
}

async function recordCloudWriteFailure(label: string, error: any): Promise<void> {
  const at = new Date().toISOString();
  const detail = classifyCloudError(error);
  lastConnectionProbeAt = 0;
  cloudStateCache = null;
  cloudStateCacheAt = 0;
  markQuotaBlocked(error);

  if (isResourceExhausted(error)) {
    status = {
      ...status,
      ready: false,
      degraded: false,
      error: detail,
      retryAt: new Date(quotaBlockedUntil).toISOString(),
      lastWriteAt: at,
      lastWriteOperation: label,
      lastWriteError: detail,
    };
    return;
  }

  // A client-side deadline only means this request stopped waiting. Firestore commits
  // are not cancelable through Promise.race, so do not declare the whole Cloud dead.
  if (isLocalCloudTimeout(error)) {
    status = {
      ...status,
      ready: Boolean(db),
      degraded: true,
      error: undefined,
      retryAt: undefined,
      lastWriteAt: at,
      lastWriteOperation: label,
      lastWriteError: detail,
    };
    console.warn(`[Cloud Persistence] ${label} timed out locally; Firestore connection remains enabled and will be re-probed.`);
    return;
  }

  // For transient transport errors, verify the connection before globally blocking CMS.
  if (isRetryableCloudError(error) && db) {
    const reachable = await probeCloudConnectionDirect();
    if (reachable) {
      status = {
        ...status,
        ready: true,
        degraded: true,
        error: undefined,
        retryAt: undefined,
        lastWriteAt: at,
        lastWriteOperation: label,
        lastWriteError: detail,
      };
      return;
    }
  }

  status = {
    ...status,
    ready: false,
    degraded: false,
    error: detail,
    retryAt: undefined,
    lastWriteAt: at,
    lastWriteOperation: label,
    lastWriteError: detail,
  };
}


/**
 * Targeted cloud writes.
 *
 * These helpers intentionally write only the documents that changed. They do not
 * reconcile/read/rewrite an entire collection and do not update the global
 * snapshot metadata on every edit. This keeps Product/Category/CMS saves fast
 * and avoids unnecessary Firestore reads/writes on Spark.
 */
async function runTargetedCloudWrite(
  label: string,
  operation: (firestore: Firestore) => Promise<void>,
  options: { timeoutMs?: number; attempts?: number } = {},
): Promise<void> {
  if (!status.ready) throw new Error(status.error || 'Firebase server persistence chưa sẵn sàng.');
  const timeoutMs = options.timeoutMs ?? CLOUD_WRITE_TIMEOUT_MS;
  const attempts = options.attempts ?? 2;
  let callerTimedOut = false;

  // Keep the serialization queue tied to the real Firestore operation, not to the
  // caller's local deadline. If the HTTP caller stops waiting, the commit is still
  // allowed to finish and no later write can overtake it.
  const actualRun = queue.then(async () => {
    try {
      await withCloudRetry(() => operation(getDb()), label, attempts);
      cloudStateCache = null;
      cloudStateCacheAt = 0;
      const completedAt = new Date().toISOString();
      status = {
        ...status,
        lastSyncAt: completedAt,
        ready: true,
        degraded: callerTimedOut,
        error: undefined,
        retryAt: undefined,
        lastWriteAt: completedAt,
        lastWriteOperation: label,
        lastWriteError: callerTimedOut
          ? `Firestore đã hoàn tất "${label}" sau local timeout; đang chờ recovery đối chiếu lại state.`
          : undefined,
      };
    } catch (error: any) {
      await recordCloudWriteFailure(label, error);
      throw error;
    }
  });
  queue = actualRun.then(() => undefined, () => undefined);

  try {
    await withTimeout(
      actualRun,
      timeoutMs,
      `Cloud operation "${label}" vượt quá thời gian chờ (${Math.round(timeoutMs / 1000)}s).`,
      new CloudOperationTimeoutError(label, timeoutMs),
    );
  } catch (error: any) {
    if (isLocalCloudTimeout(error)) {
      callerTimedOut = true;
      await recordCloudWriteFailure(label, error);
    }
    throw error;
  }
}

async function markQueuedCloudWrite(label: string): Promise<void> {
  status = {
    ...status,
    lastWriteAt: new Date().toISOString(),
    lastWriteOperation: `queued: ${label}`,
    lastWriteError: undefined,
  };
}

export type CloudWriteReceipt = { mode: 'queued' | 'direct'; jobId?: string; coalesced?: boolean };

async function queueOrRunCloudWrite(
  type: string,
  label: string,
  payload: any,
  direct: () => Promise<void>,
  options: { timeoutMs?: number; attempts?: number; maxAttempts?: number; coalesceKey?: string } = {},
): Promise<CloudWriteReceipt> {
  if (cloudWriteQueueConfigured()) {
    const queued = await enqueueCloudWriteJob(type, label, plain(payload), options.maxAttempts, options.coalesceKey);
    if (queued.queued) {
      await markQueuedCloudWrite(label);
      return { mode: 'queued', jobId: queued.id, coalesced: queued.coalesced };
    }
    console.warn(`[Message Queue] Không enqueue được ${label} (${queued.reason || 'unknown'}); fallback ghi Firestore trực tiếp.`);
  }
  await direct();
  return { mode: 'direct' };
}

async function runQueuedCloudOperation(job: CloudQueueJob): Promise<void> {
  const payload = plain(job.payload || {});
  const label = job.label || job.type;
  const operation = async () => {
    const firestore = getDb();
    switch (job.type) {
      case 'page-save': {
        const batch = firestore.batch();
        if (payload.page?.id) batch.set(firestore.collection(COLLECTIONS.pages).doc(String(payload.page.id)), payload.page, { merge: false });
        if (payload.systemState !== undefined || payload.firebaseConfig !== undefined) {
          batch.set(firestore.collection(META_COLLECTION).doc('settings'), {
            ...(payload.firebaseConfig !== undefined ? { firebaseConfig: payload.firebaseConfig } : {}),
            ...(payload.systemState !== undefined ? { systemState: payload.systemState } : {}),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        await batch.commit();
        break;
      }
      case 'pages-save': {
        const operations: Array<(batch: WriteBatch) => void> = [];
        for (const page of Array.isArray(payload.pages) ? payload.pages : []) {
          if (page?.id) operations.push((batch) => batch.set(firestore.collection(COLLECTIONS.pages).doc(String(page.id)), page, { merge: false }));
        }
        await commitBatches(operations);
        break;
      }
      case 'publication-save': {
        const pages = Array.isArray(payload.pages) ? payload.pages : [];
        if (pages.length > 498) throw new Error('Quá nhiều trang để xuất bản trong một giao dịch Firestore.');
        const batch = firestore.batch();
        for (const page of pages) if (page?.id) batch.set(firestore.collection(COLLECTIONS.pages).doc(String(page.id)), page, { merge: false });
        if (payload.version?.id) batch.set(firestore.collection(COLLECTIONS.versions).doc(String(payload.version.id)), payload.version, { merge: false });
        batch.set(firestore.collection(META_COLLECTION).doc('settings'), {
          systemState: payload.systemState || {},
          ...(payload.firebaseConfig !== undefined ? { firebaseConfig: payload.firebaseConfig } : {}),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        await batch.commit();
        break;
      }
      case 'settings-save':
        await firestore.collection(META_COLLECTION).doc('settings').set({
          systemState: payload.systemState || {},
          ...(payload.firebaseConfig !== undefined ? { firebaseConfig: payload.firebaseConfig } : {}),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      case 'version-save':
        if (payload.version?.id) await firestore.collection(COLLECTIONS.versions).doc(String(payload.version.id)).set(payload.version, { merge: false });
        break;
      case 'taxonomy-save':
        await firestore.collection(META_COLLECTION).doc('ai_settings').set({ taxonomy: payload.taxonomy || {}, updatedAt: new Date().toISOString() }, { merge: true });
        break;
      case 'training-save': {
        const training = plain(payload.training || {}); delete training.geminiApiKey;
        await firestore.collection(META_COLLECTION).doc('ai_settings').set({ training, updatedAt: new Date().toISOString() }, { merge: true });
        break;
      }
      case 'knowledge-save':
        if (!payload.item?.id) throw new Error('Knowledge item thiếu ID.');
        await firestore.collection(COLLECTIONS.aiKnowledge).doc(String(payload.item.id)).set(payload.item, { merge: false });
        break;
      case 'page-delete': {
        const id = String(payload.pageId || '').trim(); if (!id) break;
        const batch = firestore.batch(); batch.delete(firestore.collection(COLLECTIONS.pages).doc(id));
        if (payload.systemState !== undefined) batch.set(firestore.collection(META_COLLECTION).doc('settings'), { systemState: payload.systemState, updatedAt: new Date().toISOString() }, { merge: true });
        await batch.commit(); break;
      }
      case 'lead-save':
        if (payload.lead?.id) await firestore.collection(COLLECTIONS.leads).doc(String(payload.lead.id)).set(payload.lead, { merge: false });
        break;
      case 'lead-delete':
        if (payload.leadId) await firestore.collection(COLLECTIONS.leads).doc(String(payload.leadId)).delete();
        break;
      case 'admin-save':
        if (payload.account?.id) await firestore.collection(COLLECTIONS.admins).doc(String(payload.account.id)).set(payload.account, { merge: false });
        break;
      case 'admin-delete':
        if (payload.accountId) await firestore.collection(COLLECTIONS.admins).doc(String(payload.accountId)).delete();
        break;
      case 'chat-purge':
        await replaceCollection(COLLECTIONS.aiChatSessions, []);
        break;
      case 'audit-save':
        if (payload.auditId) await firestore.collection(COLLECTIONS.auditLogs).doc(String(payload.auditId)).set({ ...(payload.auditLog || {}), id: payload.auditId }, { merge: false });
        break;
      case 'knowledge-delete': {
        const id = String(payload.id || '').trim(); if (!id) break;
        const batch = firestore.batch(); batch.delete(firestore.collection(COLLECTIONS.aiKnowledge).doc(id));
        if (payload.auditLog) {
          const auditId = String(payload.auditLog.id || `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
          batch.set(firestore.collection(COLLECTIONS.auditLogs).doc(auditId), { ...payload.auditLog, id: auditId }, { merge: false });
        }
        await batch.commit();
        const cached = collectionIdCache.get(COLLECTIONS.aiKnowledge); if (cached) cached.delete(id);
        break;
      }
      case 'knowledge-delete-bulk': {
        const ids = Array.isArray(payload.ids) ? payload.ids.map((id:any)=>String(id||'').trim()).filter((id:string)=>id && id.length<=128 && !/\//.test(id)) : [];
        const operations: Array<(batch: WriteBatch) => void> = [];
        if (payload.auditLog) {
          const auditId = String(payload.auditLog.id || `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
          operations.push((batch) => batch.set(firestore.collection(COLLECTIONS.auditLogs).doc(auditId), { ...payload.auditLog, id: auditId }, { merge: false }));
        }
        for (const id of ids) operations.push((batch) => batch.delete(firestore.collection(COLLECTIONS.aiKnowledge).doc(id)));
        await commitBatches(operations);
        const cached = collectionIdCache.get(COLLECTIONS.aiKnowledge); if (cached) for (const id of ids) cached.delete(id);
        break;
      }
      default:
        throw new Error(`Unknown cloud queue job type: ${job.type}`);
    }
  };

  const actualRun = queue.then(async () => {
    try {
      await withCloudRetry(operation, `queue:${label}`, 1);
      cloudStateCache = null; cloudStateCacheAt = 0;
      const completedAt = new Date().toISOString();
      const recoveredFromPreviousProcess = Date.parse(String(job.createdAt || '')) < CLOUD_PROCESS_STARTED_AT;
      status = { ...status, ready: true, degraded: recoveredFromPreviousProcess, error: undefined, retryAt: undefined, lastSyncAt: completedAt, lastWriteAt: completedAt, lastWriteOperation: label, lastWriteError: recoveredFromPreviousProcess ? 'Queue cũ đã ghi xong sau restart; đang chờ Cloud recovery đối chiếu lại Node state.' : undefined };
    } catch (error: any) {
      await recordCloudWriteFailure(label, error);
      throw error;
    }
  });
  queue = actualRun.then(() => undefined, () => undefined);
  await actualRun;
}

export function startCloudMessageQueue(): void {
  startCloudWriteQueueWorker(runQueuedCloudOperation);
}

export async function drainCloudMessageQueue(limit = 500, timeoutMs = 45000): Promise<number> {
  return drainCloudWriteQueue(limit, timeoutMs);
}

export { getCloudWriteQueueStatus, cloudWriteQueueConfigured, retryDeadCloudWriteJobs, purgeDeadCloudWriteJobs };

export async function saveCloudPageTargeted(page: any, systemState?: any, firebaseConfig?: any): Promise<CloudWriteReceipt> {
  const payload = { page: plain(page), systemState: systemState === undefined ? undefined : plain(systemState), firebaseConfig: firebaseConfig === undefined ? undefined : plain(firebaseConfig) };
  return queueOrRunCloudWrite('page-save', `save page ${String(page?.id || 'unknown')}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'page-save', label:`save page ${String(page?.id || 'unknown')}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:page:${String(page?.id || 'unknown')}` });
}

export async function saveCloudPagesTargeted(pages: any[]): Promise<CloudWriteReceipt> {
  const payload = { pages: Array.isArray(pages) ? pages.map(plain) : [] };
  return queueOrRunCloudWrite('pages-save', 'save changed pages', payload, async () => runQueuedCloudOperation({ id:'direct', type:'pages-save', label:'save changed pages', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:'pages:bulk' });
}

export async function saveCloudPublicationTargeted(pages: any[], version: any, systemState: any, firebaseConfig?: any): Promise<CloudWriteReceipt> {
  const safePages = Array.isArray(pages) ? pages.map(plain) : [];
  if (safePages.length > 498) throw new Error('Quá nhiều trang để xuất bản trong một giao dịch Firestore.');
  const payload = { pages: safePages, version: plain(version), systemState: plain(systemState), firebaseConfig: firebaseConfig === undefined ? undefined : plain(firebaseConfig) };
  return queueOrRunCloudWrite('publication-save', 'publish CMS pages', payload, async () => runQueuedCloudOperation({ id:'direct', type:'publication-save', label:'publish CMS pages', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { timeoutMs: CLOUD_PUBLISH_TIMEOUT_MS, attempts: 1, maxAttempts: 9 });
}

export async function saveCloudSettingsTargeted(systemState: any, firebaseConfig?: any): Promise<CloudWriteReceipt> {
  const payload = { systemState: plain(systemState || {}), firebaseConfig: firebaseConfig === undefined ? undefined : plain(firebaseConfig) };
  return queueOrRunCloudWrite('settings-save', 'save CMS settings', payload, async () => runQueuedCloudOperation({ id:'direct', type:'settings-save', label:'save CMS settings', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:'settings:global' });
}

export async function saveCloudVersionTargeted(version: any): Promise<CloudWriteReceipt | void> {
  const safeVersion = plain(version); if (!safeVersion?.id) return;
  const payload = { version: safeVersion };
  return queueOrRunCloudWrite('version-save', `save version ${String(safeVersion.id)}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'version-save', label:`save version ${String(safeVersion.id)}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }));
}

export async function saveCloudTaxonomyTargeted(taxonomy: any): Promise<CloudWriteReceipt> {
  const payload = { taxonomy: plain(taxonomy || {}) };
  return queueOrRunCloudWrite('taxonomy-save', 'save AI taxonomy', payload, async () => runQueuedCloudOperation({ id:'direct', type:'taxonomy-save', label:'save AI taxonomy', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:'ai:taxonomy' });
}

export async function saveCloudTrainingTargeted(training: any): Promise<CloudWriteReceipt> {
  const safeTraining = plain(training || {}); delete safeTraining.geminiApiKey;
  const payload = { training: safeTraining };
  return queueOrRunCloudWrite('training-save', 'save AI training settings', payload, async () => runQueuedCloudOperation({ id:'direct', type:'training-save', label:'save AI training settings', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:'ai:training' });
}

export async function saveCloudKnowledgeItemTargeted(item: any): Promise<CloudWriteReceipt> {
  const safeItem = plain(item); if (!safeItem?.id) throw new Error('Knowledge item thiếu ID.');
  const payload = { item: safeItem };
  return queueOrRunCloudWrite('knowledge-save', `save AI knowledge ${String(safeItem.id)}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'knowledge-save', label:`save AI knowledge ${String(safeItem.id)}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:knowledge:${String(safeItem.id)}` });
}

export async function deleteCloudPageTargeted(pageId: string, systemState?: any): Promise<CloudWriteReceipt | void> {
  const safeId = String(pageId || '').trim(); if (!safeId) return;
  const payload = { pageId: safeId, systemState: systemState === undefined ? undefined : plain(systemState) };
  return queueOrRunCloudWrite('page-delete', `delete page ${safeId}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'page-delete', label:`delete page ${safeId}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:page:${safeId}` });
}

export async function saveCloudLeadTargeted(lead: any): Promise<CloudWriteReceipt | void> {
  const safeLead = plain(lead); if (!safeLead?.id) return;
  const payload = { lead: safeLead };
  return queueOrRunCloudWrite('lead-save', `save lead ${String(safeLead.id)}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'lead-save', label:`save lead ${String(safeLead.id)}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:lead:${String(safeLead.id)}` });
}

export async function deleteCloudLeadTargeted(leadId: string): Promise<CloudWriteReceipt | void> {
  const safeId = String(leadId || '').trim(); if (!safeId) return;
  const payload = { leadId: safeId };
  return queueOrRunCloudWrite('lead-delete', `delete lead ${safeId}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'lead-delete', label:`delete lead ${safeId}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:lead:${safeId}` });
}

export async function saveCloudAdminAccountTargeted(account: any): Promise<CloudWriteReceipt | void> {
  const safeAccount = plain(account); if (!safeAccount?.id) return;
  const payload = { account: safeAccount };
  return queueOrRunCloudWrite('admin-save', `save admin account ${String(safeAccount.id)}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'admin-save', label:`save admin account ${String(safeAccount.id)}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:admin:${String(safeAccount.id)}` });
}

export async function deleteCloudAdminAccountTargeted(accountId: string): Promise<CloudWriteReceipt | void> {
  const safeId = String(accountId || '').trim(); if (!safeId) return;
  const payload = { accountId: safeId };
  return queueOrRunCloudWrite('admin-delete', `delete admin account ${safeId}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'admin-delete', label:`delete admin account ${safeId}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }), { coalesceKey:`entity:admin:${safeId}` });
}

export async function purgeCloudChatSessions(): Promise<void> {
  const payload = {};
  await queueOrRunCloudWrite('chat-purge', 'purge legacy chat sessions', payload, async () => runQueuedCloudOperation({ id:'direct', type:'chat-purge', label:'purge legacy chat sessions', payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 }));
}

export function enqueueCloudAuditLog(auditLog: any): void {
  if (!auditLog) return;
  const safeLog = plain(auditLog); const auditId = String(safeLog.id || `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`); const payload = { auditLog: safeLog, auditId };
  queueOrRunCloudWrite('audit-save', `save audit log ${auditId}`, payload, async () => runQueuedCloudOperation({ id:'direct', type:'audit-save', label:`save audit log ${auditId}`, payload, createdAt:new Date().toISOString(), attempts:0, maxAttempts:1 })).catch((err) => console.warn('[Message Queue] Audit log failed:', err?.message || err));
}

export async function saveCloudState(state: CloudStateInput, dirty: CloudDirtyCollection[] = ['pages','leads','adminAccounts','auditLogs','versions','analytics','analyticsCosts','aiKnowledge','aiTaxonomy','aiTraining','settings']): Promise<void> {
  if (!status.ready) throw new Error(status.error || 'Firebase server persistence chưa sẵn sàng.');
  const selected = new Set(dirty);
  const operation = async () => {
    if (selected.has('pages')) {
      const pages = state.pages.map((page, index) => ({ ...page, orderIndex: index }));
      await replaceCollection(COLLECTIONS.pages, pages);
    }
    if (selected.has('leads')) await replaceCollection(COLLECTIONS.leads, state.leads);
    if (selected.has('adminAccounts')) await replaceCollection(COLLECTIONS.admins, state.adminAccounts);
    if (selected.has('auditLogs')) await replaceCollection(COLLECTIONS.auditLogs, state.auditLogs);
    if (selected.has('versions')) await replaceCollection(COLLECTIONS.versions, state.versions);
    if (selected.has('analytics')) await replaceAnalytics(state.analytics);
    if (selected.has('analyticsCosts')) await replaceCollection(COLLECTIONS.analyticsCosts, state.analyticsCosts);
    if (selected.has('aiKnowledge')) await replaceCollection(COLLECTIONS.aiKnowledge, state.aiKnowledge);
    // Active chat sessions may live briefly in Redis, but are never written to Firestore.
    if (selected.has('aiTaxonomy') || selected.has('aiTraining')) {
      const firestore = getDb();
      const aiSettings: any = { updatedAt: new Date().toISOString() };
      if (selected.has('aiTaxonomy')) aiSettings.taxonomy = plain(state.aiTaxonomy);
      if (selected.has('aiTraining')) {
        const safeTraining = plain(state.aiTraining || {});
        delete safeTraining.geminiApiKey;
        aiSettings.training = safeTraining;
      }
      await firestore.collection(META_COLLECTION).doc('ai_settings').set(aiSettings, { merge: true });
    }

    const firestore = getDb();
    if (selected.has('settings')) {
      await firestore.collection(META_COLLECTION).doc('settings').set({
        firebaseConfig: plain(state.firebaseConfig),
        systemState: plain(state.systemState),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    const updatedAt = new Date().toISOString();
    const meta = {
      initialized: true,
      schemaVersion: 4,
      projectId,
      updatedAt,
      instanceId,
      changed: dirty,
      counts: {
        pages: state.pages.length,
        leads: state.leads.length,
        adminAccounts: state.adminAccounts.length,
        auditLogs: state.auditLogs.length,
        versions: state.versions.length,
        analytics: state.analytics.length,
        analyticsCosts: state.analyticsCosts.length,
      aiKnowledge: state.aiKnowledge.length,
      chatSessions: state.chatSessions.length,
      aiInitialized: true,
      },
    };
    await firestore.collection(META_COLLECTION).doc(META_DOC).set(meta, { merge: true });
    lastRemoteUpdatedAt = updatedAt;
  };

  const label = `save(${dirty.join(',')})`;
  let callerTimedOut = false;
  const actualRun = queue.then(async () => {
    try {
      await withCloudRetry(operation, label, 1);
      const completedAt = new Date().toISOString();
      status = {
        ...status,
        lastSyncAt: lastRemoteUpdatedAt || completedAt,
        ready: true,
        degraded: callerTimedOut,
        error: undefined,
        retryAt: undefined,
        lastWriteAt: completedAt,
        lastWriteOperation: label,
        lastWriteError: callerTimedOut
          ? `Firestore đã hoàn tất "${label}" sau local timeout; đang chờ recovery đối chiếu lại state.`
          : undefined,
      };
    } catch (error: any) {
      await recordCloudWriteFailure(label, error);
      console.error('[Cloud Persistence] write failed:', error);
      throw error;
    }
  });
  queue = actualRun.then(() => undefined, () => undefined);
  try {
    await withTimeout(
      actualRun,
      CLOUD_FULL_SYNC_TIMEOUT_MS,
      `Cloud operation "${label}" vượt quá thời gian chờ (${Math.round(CLOUD_FULL_SYNC_TIMEOUT_MS / 1000)}s).`,
      new CloudOperationTimeoutError(label, CLOUD_FULL_SYNC_TIMEOUT_MS),
    );
  } catch (error: any) {
    if (isLocalCloudTimeout(error)) {
      callerTimedOut = true;
      await recordCloudWriteFailure(label, error);
    }
    throw error;
  }
}

export async function readCloudState(): Promise<CloudStateOutput> {
  if (!status.ready) throw new Error(status.error || 'Firebase server persistence chưa sẵn sàng.');
  if (cloudStateCache && Date.now() - cloudStateCacheAt < CLOUD_STATE_CACHE_TTL_MS) return plain(cloudStateCache);
  const firestore = getDb();
  try {
    const metaSnap = await firestore.collection(META_COLLECTION).doc(META_DOC).get();
    if (!metaSnap.exists || metaSnap.data()?.initialized !== true) {
      Object.values(COLLECTIONS).forEach((name) => collectionIdCache.set(name, new Set()));
      const settingsSnap = await firestore.collection(META_COLLECTION).doc('settings').get();
      const result: CloudStateOutput = {
        exists: false,
        pages: [], leads: [], adminAccounts: [], auditLogs: [], versions: [], analytics: [], analyticsCosts: [], aiKnowledge: [], aiTaxonomy: undefined, aiTraining: undefined, chatSessions: [],
        systemState: settingsSnap.data()?.systemState || { migrations: {} },
        firebaseConfig: settingsSnap.data()?.firebaseConfig || ({} as ServerFirebaseConfig),
      };
      cloudStateCache = result; cloudStateCacheAt = Date.now();
      return plain(result);
    }

    // Every collection query is bounded by limit(100). Pagination preserves the
    // complete CMS state without issuing an unbounded collection read. Collections
    // are intentionally read sequentially to avoid a cold-start read burst.
    const pages = await readCollectionAll(COLLECTIONS.pages);
    const leads = await readCollectionAll(COLLECTIONS.leads);
    const admins = await readCollectionAll(COLLECTIONS.admins);
    const auditLogs = await readCollectionAll(COLLECTIONS.auditLogs);
    const versions = await readCollectionAll(COLLECTIONS.versions);
    const chunks = await readCollectionAll(COLLECTIONS.analyticsChunks);
    const costs = await readCollectionAll(COLLECTIONS.analyticsCosts);
    const aiKnowledge = await readCollectionAll(COLLECTIONS.aiKnowledge);
    const chatSessions = await readCollectionAll(COLLECTIONS.aiChatSessions);
    const settings = await firestore.collection(META_COLLECTION).doc('settings').get();
    const aiSettings = await firestore.collection(META_COLLECTION).doc('ai_settings').get();

    rememberCollectionIds(COLLECTIONS.pages, pages);
    rememberCollectionIds(COLLECTIONS.leads, leads);
    rememberCollectionIds(COLLECTIONS.admins, admins);
    rememberCollectionIds(COLLECTIONS.auditLogs, auditLogs);
    rememberCollectionIds(COLLECTIONS.versions, versions);
    rememberCollectionIds(COLLECTIONS.analyticsChunks, chunks);
    rememberCollectionIds(COLLECTIONS.analyticsCosts, costs);
    rememberCollectionIds(COLLECTIONS.aiKnowledge, aiKnowledge);
    rememberCollectionIds(COLLECTIONS.aiChatSessions, chatSessions);

    const analytics = chunks
      .sort((a, b) => {
        const ad = a.data() || {};
        const bd = b.data() || {};
        const at = String(ad.createdAt || '');
        const bt = String(bd.createdAt || '');
        if (at || bt) return at.localeCompare(bt);
        return Number(ad.index || 0) - Number(bd.index || 0);
      })
      .flatMap((d) => Array.isArray(d.data()?.events) ? d.data().events : []);
    const sortDesc = (a: any, b: any) => String(b?.timestamp || b?.updatedAt || '').localeCompare(String(a?.timestamp || a?.updatedAt || ''));
    const result: CloudStateOutput = {
      exists: true,
      updatedAt: metaSnap.data()?.updatedAt,
      schemaVersion: Number(metaSnap.data()?.schemaVersion || 1),
      aiInitialized: metaSnap.data()?.counts?.aiInitialized === true,
      pages: pages.map((d) => d.data()).sort((a: any, b: any) => Number(a?.orderIndex || 0) - Number(b?.orderIndex || 0)),
      leads: leads.map((d) => d.data()).sort((a: any, b: any) => String(b?.submittedAt || '').localeCompare(String(a?.submittedAt || ''))),
      adminAccounts: admins.map((d) => d.data()).sort(sortDesc),
      auditLogs: auditLogs.map((d) => d.data()).sort(sortDesc),
      versions: versions.map((d) => d.data()).sort(sortDesc),
      analytics,
      analyticsCosts: costs.map((d) => d.data()).sort(sortDesc),
      aiKnowledge: aiKnowledge.map((d) => d.data()).sort(sortDesc),
      aiTaxonomy: aiSettings.data()?.taxonomy,
      aiTraining: aiSettings.data()?.training,
      chatSessions: chatSessions.map((d) => d.data()).sort(sortDesc),
      systemState: settings.data()?.systemState || { migrations: {} },
      firebaseConfig: settings.data()?.firebaseConfig || ({} as ServerFirebaseConfig),
    };
    if (!Array.isArray(result.pages) || result.pages.length === 0) {
      throw new Error('Firestore metadata tồn tại nhưng không có Landing Page. Đã chặn fallback về dữ liệu mặc định để bảo vệ dữ liệu.');
    }
    status = { ...status, lastSyncAt: result.updatedAt, ready: true, degraded: false, error: undefined, retryAt: undefined, lastWriteError: undefined };
    cloudStateCache = result; cloudStateCacheAt = Date.now();
    return plain(result);
  } catch (error: any) {
    lastConnectionProbeAt = 0;
    markQuotaBlocked(error);
    status = { ...status, ready: false, error: classifyCloudError(error), retryAt: isResourceExhausted(error) ? new Date(quotaBlockedUntil).toISOString() : undefined };
    throw error;
  }
}

export async function flushCloudPersistence(): Promise<void> {
  await queue;
}

/**
 * Server-side remote Firestore listeners are intentionally disabled on the Spark
 * plan. The previous listener re-read the entire CMS state after every meta
 * change, which multiplied document reads and could trigger RESOURCE_EXHAUSTED.
 * Draft/publish APIs already provide authoritative one-time reads/writes.
 */
export function startCloudRemoteListener(): void {
  return;
}

export function stopCloudRemoteListener(): void {
  return;
}
