// Durable server-side Message Queue backed by the existing Upstash Redis REST connection.
// v1.0.55: adaptive worker + latest-write-wins coalescing for mutable entities.
// Payloads are encrypted with DATA_ENCRYPTION_KEY before leaving the process.
import crypto from 'node:crypto';
import { redisCommand, redisStatus } from './redisServer';
import { encodeStoredJson, decodeStoredJson } from './securityServer';

export type CloudQueueJob = {
  id: string;
  type: string;
  label: string;
  payload: any;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
  coalesceKey?: string;
  lastError?: string;
};

const namespace = String(process.env.REDIS_NAMESPACE || 'baoviet').replace(/[^a-zA-Z0-9:_-]/g, '');
const PENDING_KEY = `${namespace}:cloud-write-queue:pending:v1`;
const PROCESSING_KEY = `${namespace}:cloud-write-queue:processing:v1`;
const DEAD_KEY = `${namespace}:cloud-write-queue:dead:v1`;
const COALESCE_KEY = `${namespace}:cloud-write-queue:coalesce:v1`;
const COALESCE_REVERSE_KEY = `${namespace}:cloud-write-queue:coalesce-reverse:v1`;
const JOB_PREFIX = `${namespace}:cloud-write-job:v1:`;
const JOB_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEAD_TTL_SECONDS = 14 * 24 * 60 * 60;
const LEASE_MS = 3 * 60_000;
const WORKER_LOCK_SECONDS = 3 * 60;
const LEASE_RECOVERY_INTERVAL_MS = 60_000;
const MAX_ATTEMPTS = Math.max(2, Math.min(30, Number(process.env.CLOUD_QUEUE_MAX_ATTEMPTS || 20)));
const QUEUE_MAX_PENDING = Math.max(100, Math.min(20000, Number(process.env.CLOUD_QUEUE_MAX_PENDING || 5000)));
const BUSY_POLL_MS = Math.max(25, Math.min(1000, Number(process.env.CLOUD_QUEUE_BUSY_POLL_MS || 100)));
const WORKER_BATCH_SIZE = Math.max(1, Math.min(25, Number(process.env.CLOUD_QUEUE_WORKER_BATCH_SIZE || 8)));
const ENABLED = !/^(0|false|no)$/i.test(String(process.env.CLOUD_WRITE_QUEUE_ENABLED || 'true'));

let workerTimer: NodeJS.Timeout | null = null;
let workerWakeAt = 0;
let leaseRecoveryTimer: NodeJS.Timeout | null = null;
let handler: ((job: CloudQueueJob) => Promise<void>) | null = null;
const workerId = `worker_${process.pid}_${crypto.randomBytes(5).toString('hex')}`;
let localProcessing = false;
let lastProcessedAt: string | null = null;
let lastError: string | null = null;
let processedCount = 0;
let failedCount = 0;
let coalescedCount = 0;
let supersededCount = 0;
let lastLeaseRecoveryAt = 0;

function jobKey(id: string) { return `${JOB_PREFIX}${id}`; }
function cleanError(error: any) { return String(error?.message || error || 'unknown').slice(0, 1000); }
function cleanCoalesceKey(value?: string) {
  return String(value || '').replace(/[^a-zA-Z0-9:_./-]/g, '_').slice(0, 180);
}
function inferCoalesceKey(job: Partial<CloudQueueJob>): string {
  const payload:any = job?.payload || {};
  switch (job?.type) {
    case 'page-save': return cleanCoalesceKey(`entity:page:${String(payload?.page?.id || '')}`);
    case 'page-delete': return cleanCoalesceKey(`entity:page:${String(payload?.pageId || '')}`);
    case 'pages-save': return 'pages:bulk';
    case 'settings-save': return 'settings:global';
    case 'taxonomy-save': return 'ai:taxonomy';
    case 'training-save': return 'ai:training';
    case 'knowledge-save': return cleanCoalesceKey(`entity:knowledge:${String(payload?.item?.id || '')}`);
    case 'knowledge-delete': return cleanCoalesceKey(`entity:knowledge:${String(payload?.id || '')}`);
    case 'lead-save': return cleanCoalesceKey(`entity:lead:${String(payload?.lead?.id || '')}`);
    case 'lead-delete': return cleanCoalesceKey(`entity:lead:${String(payload?.leadId || '')}`);
    case 'admin-save': return cleanCoalesceKey(`entity:admin:${String(payload?.account?.id || '')}`);
    case 'admin-delete': return cleanCoalesceKey(`entity:admin:${String(payload?.accountId || '')}`);
    default: return '';
  }
}
function retryDelayMs(attempts: number) {
  const base = Math.min(5 * 60_000, 1000 * (2 ** Math.max(0, attempts - 1)));
  const jitter = Math.floor(Math.random() * Math.min(1500, Math.max(100, base / 4)));
  return base + jitter;
}

export function cloudWriteQueueConfigured(): boolean {
  return ENABLED && redisStatus().configured;
}

function scheduleWorker(delayMs: number) {
  if (!handler || !cloudWriteQueueConfigured()) return;
  const safeDelay = Math.max(0, Number(delayMs) || 0);
  const targetAt = Date.now() + safeDelay;
  // Event-driven: never replace an earlier wake-up with a later one.
  if (workerTimer && workerWakeAt > 0 && workerWakeAt <= targetAt) return;
  if (workerTimer) clearTimeout(workerTimer);
  workerWakeAt = targetAt;
  workerTimer = setTimeout(async () => {
    workerTimer = null;
    workerWakeAt = 0;
    const processed = await tick(WORKER_BATCH_SIZE);
    // Only keep draining when a full burst was consumed. Empty/partial queues sleep.
    if (processed >= WORKER_BATCH_SIZE) scheduleWorker(BUSY_POLL_MS);
    else await scheduleNextPendingWake();
  }, safeDelay);
  workerTimer.unref?.();
}

async function scheduleNextPendingWake(): Promise<void> {
  if (!handler || !cloudWriteQueueConfigured() || workerTimer) return;
  try {
    const raw = await redisCommand(['ZRANGE', PENDING_KEY, 0, 0, 'WITHSCORES']);
    if (!Array.isArray(raw) || raw.length < 2) return; // Queue empty => no polling.
    const availableAt = Number(raw[1]);
    if (!Number.isFinite(availableAt)) return;
    scheduleWorker(Math.max(20, availableAt - Date.now()));
  } catch {
    // Redis outage: do not create a hot retry loop. A new enqueue/request/startup wakes it again.
  }
}

function scheduleLeaseRecovery(delayMs = LEASE_MS + 1000): void {
  if (!handler || !cloudWriteQueueConfigured() || leaseRecoveryTimer) return;
  leaseRecoveryTimer = setTimeout(() => {
    leaseRecoveryTimer = null;
    scheduleWorker(0);
  }, Math.max(1000, delayMs));
  leaseRecoveryTimer.unref?.();
}

export function wakeCloudWriteQueueWorker(): void {
  if (!handler || !cloudWriteQueueConfigured()) return;
  scheduleWorker(20);
}

export async function enqueueCloudWriteJob(
  type: string,
  label: string,
  payload: any,
  maxAttempts = MAX_ATTEMPTS,
  coalesceKey?: string,
): Promise<{ queued: boolean; id?: string; reason?: string; coalesced?: boolean }> {
  if (!cloudWriteQueueConfigured()) return { queued: false, reason: 'queue_not_configured' };
  const id = `cq_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const normalizedCoalesceKey = cleanCoalesceKey(coalesceKey);
  const job: CloudQueueJob = {
    id,
    type: String(type || '').slice(0, 96),
    label: String(label || type || 'cloud write').slice(0, 180),
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: Math.max(1, Math.min(30, Number(maxAttempts) || MAX_ATTEMPTS)),
    ...(normalizedCoalesceKey ? { coalesceKey: normalizedCoalesceKey } : {}),
  };
  const encoded = encodeStoredJson(job);
  // Latest-write-wins only while a job is still pending. Once it is leased/processing,
  // a newer save receives its own pending job so the newer state cannot be lost.
  const script = [
    "local ckey=ARGV[6]",
    "if ckey~='' then local existing=redis.call('HGET',KEYS[3],ckey); if existing and redis.call('ZSCORE',KEYS[1],existing) then redis.call('SET',ARGV[7]..existing,ARGV[1],'EX',ARGV[2]); redis.call('ZADD',KEYS[1],ARGV[3],existing); redis.call('HSET',KEYS[4],existing,ckey); return existing elseif existing then redis.call('HDEL',KEYS[3],ckey) end end",
    "local count=redis.call('ZCARD',KEYS[1])",
    "if count>=tonumber(ARGV[4]) then return '' end",
    "redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[2])",
    "redis.call('ZADD',KEYS[1],ARGV[3],ARGV[5])",
    "redis.call('EXPIRE',KEYS[1],ARGV[2])",
    "if ckey~='' then redis.call('HSET',KEYS[3],ckey,ARGV[5]); redis.call('HSET',KEYS[4],ARGV[5],ckey) end",
    'return ARGV[5]',
  ].join('; ');
  try {
    const actualId = String(await redisCommand(['EVAL', script, 4, PENDING_KEY, jobKey(id), COALESCE_KEY, COALESCE_REVERSE_KEY, encoded, JOB_TTL_SECONDS, Date.now(), QUEUE_MAX_PENDING, id, normalizedCoalesceKey, JOB_PREFIX]) || '');
    if (!actualId) return { queued: false, reason: 'queue_full' };
    const coalesced = actualId !== id;
    if (coalesced) coalescedCount += 1;
    wakeCloudWriteQueueWorker();
    return { queued: true, id: actualId, coalesced };
  } catch {
    return { queued: false, reason: 'redis_unavailable' };
  }
}

async function recoverExpiredLeases(now = Date.now()): Promise<void> {
  if (now - lastLeaseRecoveryAt < LEASE_RECOVERY_INTERVAL_MS) return;
  lastLeaseRecoveryAt = now;
  const script = [
    "local ids=redis.call('ZRANGEBYSCORE',KEYS[1],'-inf',ARGV[1],'LIMIT',0,100)",
    "for _,id in ipairs(ids) do redis.call('ZREM',KEYS[1],id); redis.call('ZADD',KEYS[2],ARGV[1],id) end",
    'return #ids',
  ].join('; ');
  await redisCommand(['EVAL', script, 2, PROCESSING_KEY, PENDING_KEY, now]).catch(() => undefined);
}

async function hasDuePending(now = Date.now()): Promise<boolean> {
  try {
    const ids = await redisCommand(['ZRANGEBYSCORE', PENDING_KEY, '-inf', now, 'LIMIT', 0, 1]);
    return Array.isArray(ids) && ids.length > 0;
  } catch {
    return false;
  }
}

async function acquireWorkerLock(): Promise<boolean> {
  try {
    const result = await redisCommand(['SET', WORKER_LOCK_KEY, workerId, 'NX', 'EX', WORKER_LOCK_SECONDS]);
    return String(result || '').toUpperCase() === 'OK';
  } catch { return false; }
}

async function releaseWorkerLock(): Promise<void> {
  const script = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
  await redisCommand(['EVAL', script, 1, WORKER_LOCK_KEY, workerId]).catch(() => undefined);
}

async function claimOne(): Promise<CloudQueueJob | null> {
  const now = Date.now();
  const leaseUntil = now + LEASE_MS;
  const script = [
    "local ids=redis.call('ZRANGEBYSCORE',KEYS[1],'-inf',ARGV[1],'LIMIT',0,1)",
    "if #ids==0 then return nil end",
    'local id=ids[1]',
    "if redis.call('ZREM',KEYS[1],id)==0 then return nil end",
    "redis.call('ZADD',KEYS[2],ARGV[2],id)",
    "local ckey=redis.call('HGET',KEYS[4],id)",
    "if ckey then if redis.call('HGET',KEYS[3],ckey)==id then redis.call('HDEL',KEYS[3],ckey) end; redis.call('HDEL',KEYS[4],id) end",
    'return id',
  ].join('; ');
  const id = await redisCommand(['EVAL', script, 4, PENDING_KEY, PROCESSING_KEY, COALESCE_KEY, COALESCE_REVERSE_KEY, now, leaseUntil]);
  if (!id) return null;
  const actualId = String(id);
  scheduleLeaseRecovery();
  const raw = await redisCommand(['GET', jobKey(actualId)]);
  if (!raw) {
    await redisCommand(['ZREM', PROCESSING_KEY, actualId]).catch(() => undefined);
    return null;
  }
  try {
    const decoded = decodeStoredJson(raw) as CloudQueueJob;
    const inferred = cleanCoalesceKey(decoded.coalesceKey || inferCoalesceKey(decoded));
    return { ...decoded, id: actualId, ...(inferred ? { coalesceKey: inferred } : {}) };
  } catch {
    await moveToDead(actualId, null, 'Không giải mã được queue payload.');
    return null;
  }
}

async function complete(job: CloudQueueJob): Promise<void> {
  const script = [
    "redis.call('ZREM',KEYS[1],ARGV[1])",
    "redis.call('DEL',KEYS[2])",
    "redis.call('HDEL',KEYS[3],ARGV[1])",
    'return 1',
  ].join('; ');
  await redisCommand(['EVAL', script, 3, PROCESSING_KEY, jobKey(job.id), COALESCE_REVERSE_KEY, job.id]);
  processedCount += 1;
  lastProcessedAt = new Date().toISOString();
  lastError = null;
}

async function moveToDead(id: string, job: CloudQueueJob | null, error: string): Promise<void> {
  const deadJob = job ? { ...job, lastError: error } : { id, type: 'unknown', label: 'unknown', payload: null, createdAt: new Date().toISOString(), attempts: 1, maxAttempts: 1, lastError: error };
  const ckey = cleanCoalesceKey(deadJob.coalesceKey);
  const script = [
    "redis.call('ZREM',KEYS[1],ARGV[1])",
    "redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3])",
    "redis.call('ZADD',KEYS[3],ARGV[4],ARGV[1])",
    "redis.call('EXPIRE',KEYS[3],ARGV[3])",
    "if ARGV[5]~='' and redis.call('HGET',KEYS[4],ARGV[5])==ARGV[1] then redis.call('HDEL',KEYS[4],ARGV[5]) end",
    "redis.call('HDEL',KEYS[5],ARGV[1])",
    'return 1',
  ].join('; ');
  await redisCommand(['EVAL', script, 5, PROCESSING_KEY, jobKey(id), DEAD_KEY, COALESCE_KEY, COALESCE_REVERSE_KEY, id, encodeStoredJson(deadJob), DEAD_TTL_SECONDS, Date.now(), ckey]).catch(() => undefined);
  failedCount += 1;
  lastError = error;
}

async function retry(job: CloudQueueJob, error: any): Promise<void> {
  const attempts = Number(job.attempts || 0) + 1;
  const errorText = cleanError(error);
  if (attempts >= Number(job.maxAttempts || MAX_ATTEMPTS)) {
    await moveToDead(job.id, { ...job, attempts }, errorText);
    return;
  }
  const next: CloudQueueJob = { ...job, attempts, lastError: errorText };
  const availableAt = Date.now() + retryDelayMs(attempts);
  const ckey = cleanCoalesceKey(job.coalesceKey);
  const script = [
    "if ARGV[6]~='' then local newer=redis.call('HGET',KEYS[4],ARGV[6]); if newer and newer~=ARGV[1] and redis.call('ZSCORE',KEYS[3],newer) then redis.call('ZREM',KEYS[1],ARGV[1]); redis.call('DEL',KEYS[2]); return 2 end end",
    "redis.call('ZREM',KEYS[1],ARGV[1])",
    "redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3])",
    "redis.call('ZADD',KEYS[3],ARGV[4],ARGV[1])",
    "redis.call('EXPIRE',KEYS[3],ARGV[3])",
    "if ARGV[6]~='' then redis.call('HSET',KEYS[4],ARGV[6],ARGV[1]); redis.call('HSET',KEYS[5],ARGV[1],ARGV[6]) end",
    'return 1',
  ].join('; ');
  const result = Number(await redisCommand(['EVAL', script, 5, PROCESSING_KEY, jobKey(job.id), PENDING_KEY, COALESCE_KEY, COALESCE_REVERSE_KEY, job.id, encodeStoredJson(next), JOB_TTL_SECONDS, availableAt, '', ckey]));
  if (result === 2) supersededCount += 1;
  else scheduleWorker(Math.max(20, availableAt - Date.now()));
  lastError = errorText;
}

async function tick(maxJobs = WORKER_BATCH_SIZE): Promise<number> {
  if (!handler || !cloudWriteQueueConfigured() || localProcessing) return 0;
  localProcessing = true;
  let lock = false;
  let handled = 0;
  try {
    await recoverExpiredLeases();
    // Do not acquire/release a distributed lock while the queue is empty.
    if (!await hasDuePending()) return 0;
    lock = await acquireWorkerLock();
    if (!lock) return 0;
    for (let index = 0; index < Math.max(1, maxJobs); index += 1) {
      const job = await claimOne();
      if (!job) break;
      handled += 1;
      try {
        await handler(job);
        await complete(job);
      } catch (error: any) {
        await retry(job, error);
      }
    }
  } catch (error: any) {
    lastError = cleanError(error);
  } finally {
    if (lock) await releaseWorkerLock();
    localProcessing = false;
  }
  return handled;
}

export function startCloudWriteQueueWorker(jobHandler: (job: CloudQueueJob) => Promise<void>): void {
  handler = jobHandler;
  if (!cloudWriteQueueConfigured()) return;
  scheduleWorker(100); // one startup replay probe, then sleep if empty
  scheduleLeaseRecovery();
}

export async function compactPendingCloudWriteJobs(limit = 2000): Promise<number> {
  if (!cloudWriteQueueConfigured()) return 0;
  const bounded = Math.max(1, Math.min(5000, Number(limit) || 2000));
  try {
    const rawIds = await redisCommand(['ZRANGE', PENDING_KEY, 0, bounded - 1]);
    const ids = Array.isArray(rawIds) ? rawIds.map(String) : [];
    if (ids.length < 2) return 0;
    const rawJobs = await redisCommand(['MGET', ...ids.map(jobKey)]);
    const values = Array.isArray(rawJobs) ? rawJobs : [];
    const latest = new Map<string, { id:string; created:number }>();
    const decodedById = new Map<string, CloudQueueJob>();
    ids.forEach((id,index) => {
      const raw = values[index]; if (!raw) return;
      try {
        const job = decodeStoredJson(raw) as CloudQueueJob;
        const ckey = cleanCoalesceKey(job.coalesceKey || inferCoalesceKey(job));
        if (!ckey) return;
        job.coalesceKey = ckey; decodedById.set(id, job);
        const created = Date.parse(String(job.createdAt || '')) || index;
        const current = latest.get(ckey);
        if (!current || created >= current.created) latest.set(ckey, { id, created });
      } catch { /* keep malformed job for normal DLQ handling */ }
    });
    const obsolete:string[] = [];
    for (const [id,job] of decodedById) {
      const ckey = String(job.coalesceKey || '');
      if (ckey && latest.get(ckey)?.id !== id) obsolete.push(id);
    }
    if (obsolete.length) {
      await redisCommand(['ZREM', PENDING_KEY, ...obsolete]).catch(() => undefined);
      await redisCommand(['DEL', ...obsolete.map(jobKey)]).catch(() => undefined);
      await redisCommand(['HDEL', COALESCE_REVERSE_KEY, ...obsolete]).catch(() => undefined);
      supersededCount += obsolete.length;
    }
    const pairs:string[] = [];
    const reversePairs:string[] = [];
    for (const [ckey,entry] of latest) { pairs.push(ckey,entry.id); reversePairs.push(entry.id,ckey); }
    if (pairs.length) await redisCommand(['HSET', COALESCE_KEY, ...pairs]).catch(() => undefined);
    if (reversePairs.length) await redisCommand(['HSET', COALESCE_REVERSE_KEY, ...reversePairs]).catch(() => undefined);
    return obsolete.length;
  } catch (error:any) {
    lastError = cleanError(error);
    return 0;
  }
}

export async function drainCloudWriteQueue(limit = 200, timeoutMs = 45000): Promise<number> {
  if (!handler || !cloudWriteQueueConfigured()) return 0;
  await compactPendingCloudWriteJobs(Math.max(limit, 2000));
  const bounded = Math.max(1, Math.min(2000, Number(limit) || 200));
  const deadline = Date.now() + Math.max(1000, Number(timeoutMs) || 45000);
  let total = 0;
  if (workerTimer) { clearTimeout(workerTimer); workerTimer = null; }
  while (total < bounded && Date.now() < deadline) {
    const handled = await tick(Math.min(WORKER_BATCH_SIZE, bounded - total));
    total += handled;
    if (!handled) break;
  }
  await scheduleNextPendingWake();
  return total;
}

export async function retryDeadCloudWriteJobs(limit = 50): Promise<number> {
  if (!cloudWriteQueueConfigured()) return 0;
  const bounded = Math.max(1, Math.min(200, Number(limit) || 50));
  let ids: string[] = [];
  try {
    const raw = await redisCommand(['ZRANGE', DEAD_KEY, 0, bounded - 1]);
    ids = Array.isArray(raw) ? raw.map(String) : [];
  } catch { return 0; }
  let moved = 0;
  for (const id of ids) {
    try {
      const raw = await redisCommand(['GET', jobKey(id)]);
      if (!raw) { await redisCommand(['ZREM', DEAD_KEY, id]).catch(() => undefined); continue; }
      const job = decodeStoredJson(raw) as CloudQueueJob;
      const reset: CloudQueueJob = { ...job, id, attempts: 0, maxAttempts: Math.max(MAX_ATTEMPTS, Number(job.maxAttempts || 0)), lastError: undefined };
      const ckey = cleanCoalesceKey(reset.coalesceKey);
      if (ckey) {
        const newer = await redisCommand(['HGET', COALESCE_KEY, ckey]).catch(() => null);
        if (newer && String(newer) !== id) continue;
      }
      const script = [
        "redis.call('ZREM',KEYS[1],ARGV[1])",
        "redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3])",
        "redis.call('ZADD',KEYS[3],ARGV[4],ARGV[1])",
        "if ARGV[5]~='' then redis.call('HSET',KEYS[4],ARGV[5],ARGV[1]); redis.call('HSET',KEYS[5],ARGV[1],ARGV[5]) end",
        'return 1',
      ].join('; ');
      await redisCommand(['EVAL', script, 5, DEAD_KEY, jobKey(id), PENDING_KEY, COALESCE_KEY, COALESCE_REVERSE_KEY, id, encodeStoredJson(reset), JOB_TTL_SECONDS, Date.now(), ckey]);
      moved += 1;
    } catch { /* keep in DLQ */ }
  }
  if (moved) wakeCloudWriteQueueWorker();
  return moved;
}

export async function purgeDeadCloudWriteJobs(limit = 200): Promise<number> {
  if (!cloudWriteQueueConfigured()) return 0;
  const bounded = Math.max(1, Math.min(1000, Number(limit) || 200));
  try {
    const raw = await redisCommand(['ZRANGE', DEAD_KEY, 0, bounded - 1]);
    const ids = Array.isArray(raw) ? raw.map(String) : [];
    if (!ids.length) return 0;
    for (const id of ids) await redisCommand(['DEL', jobKey(id)]).catch(() => undefined);
    await redisCommand(['ZREM', DEAD_KEY, ...ids]);
    return ids.length;
  } catch { return 0; }
}

export async function getCloudWriteQueueStatus() {
  const base = {
    enabled: ENABLED,
    configured: cloudWriteQueueConfigured(),
    processing: localProcessing,
    processedCount,
    failedCount,
    coalescedCount,
    supersededCount,
    workerBatchSize: WORKER_BATCH_SIZE,
    workerMode: 'event-driven',
    idlePollMs: 0,
    lastProcessedAt,
    lastError,
  };
  if (!cloudWriteQueueConfigured()) return { ...base, pending: 0, leased: 0, deadLetter: 0 };
  try {
    const [pending, leased, deadLetter] = await Promise.all([
      redisCommand(['ZCARD', PENDING_KEY]), redisCommand(['ZCARD', PROCESSING_KEY]), redisCommand(['ZCARD', DEAD_KEY]),
    ]);
    return { ...base, pending: Number(pending || 0), leased: Number(leased || 0), deadLetter: Number(deadLetter || 0) };
  } catch {
    return { ...base, pending: null, leased: null, deadLetter: null, lastError: lastError || 'REDIS_UNAVAILABLE' };
  }
}
