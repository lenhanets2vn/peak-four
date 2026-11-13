// Server-only Upstash REST client. No credentials or cache contents are sent to the browser.
import crypto from 'node:crypto';
import {encodeStoredJson,decodeStoredJson} from './securityServer';

const url = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
const namespace = String(process.env.REDIS_NAMESPACE || 'baoviet').replace(/[^a-zA-Z0-9:_-]/g, '');
const ANSWER_TTL_SECONDS = 24 * 60 * 60;
const ANSWER_CACHE_MAX_ENTRIES = 300;
const ANSWER_GENERATION_KEY = `${namespace}:answers:generation:v2`;
const LEGACY_ANSWER_CACHE_KEY = `${namespace}:answers:v1`;

let retryAfter = 0;
let lastSuccess: string | null = null;
let localAnswerCacheGeneration = 1;

export function redisStatus() {
  return { configured: !!(url && token), available: !!lastSuccess && Date.now() >= retryAfter, lastSuccess };
}

export async function redisCommand(command: (string | number)[]): Promise<any> {
  if (!url || !token || Date.now() < retryAfter) throw new Error('REDIS_UNAVAILABLE');
  if (!url.startsWith('https://')) throw new Error('REDIS_TLS_REQUIRED');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error('REDIS_UNAVAILABLE');
    const data: any = await response.json();
    if (data.error) throw new Error('REDIS_UNAVAILABLE');
    lastSuccess = new Date().toISOString();
    return data.result;
  } catch {
    retryAfter = Date.now() + 10000;
    throw new Error('REDIS_UNAVAILABLE');
  }
}

export function redisKey(scope: string, id: string) {
  return `${namespace}:${scope}:${crypto.createHash('sha256').update(id).digest('hex')}`;
}

function answerDigest(normalizedKey: string): string {
  return crypto.createHash('sha256').update(normalizedKey).digest('hex');
}

function answerDataKey(generation: number, normalizedKey: string): string {
  return `${namespace}:answer:v2:${generation}:${answerDigest(normalizedKey)}`;
}

function answerIndexKey(generation: number): string {
  return `${namespace}:answer-index:v2:${generation}`;
}

/**
 * Returns the active cache generation. The generation is monotonic even when a
 * single replica temporarily loses Redis: a recovered replica never lowers its
 * local generation and therefore cannot resurrect an older cache namespace.
 */
export async function getAnswerCacheGeneration(): Promise<number> {
  try {
    const script = [
      "local current=tonumber(redis.call('GET',KEYS[1]) or '1')",
      "local proposed=tonumber(ARGV[1]) or 1",
      "if proposed>current then redis.call('SET',KEYS[1],proposed); current=proposed end",
      'return current',
    ].join('; ');
    const remote = Number(await redisCommand(['EVAL', script, 1, ANSWER_GENERATION_KEY, localAnswerCacheGeneration]));
    if (Number.isFinite(remote) && remote >= 1) localAnswerCacheGeneration = Math.max(localAnswerCacheGeneration, remote);
  } catch {
    // Redis is an optimization. Keep the in-process generation during outages.
  }
  return localAnswerCacheGeneration;
}

/**
 * Invalidates all answer-cache entries immediately without scanning/deleting
 * hundreds of keys. Old generations become unreachable and expire naturally.
 */
export async function bumpAnswerCacheGeneration(_reason = 'content_changed'): Promise<number> {
  localAnswerCacheGeneration += 1;
  try {
    const script = [
      "local current=tonumber(redis.call('GET',KEYS[1]) or '1')",
      "local floor=tonumber(ARGV[1]) or 1",
      'if floor>current then current=floor end',
      'current=current+1',
      "redis.call('SET',KEYS[1],current)",
      'return current',
    ].join('; ');
    const remote = Number(await redisCommand(['EVAL', script, 1, ANSWER_GENERATION_KEY, localAnswerCacheGeneration - 1]));
    if (Number.isFinite(remote) && remote >= 1) localAnswerCacheGeneration = Math.max(localAnswerCacheGeneration, remote);
    // v1 stored every answer inside one shared key. Never revive that cache after
    // moving to per-entry V2 semantics.
    await redisCommand(['DEL', LEGACY_ANSWER_CACHE_KEY]).catch(() => {});
  } catch {
    // Local invalidation still protects this replica. Once Redis recovers,
    // getAnswerCacheGeneration() pushes the monotonic floor to Redis.
  }
  return localAnswerCacheGeneration;
}

export async function readAnswerCacheEntry(normalizedKey: string, generation?: number): Promise<any | null> {
  if (!normalizedKey) return null;
  const gen = generation || await getAnswerCacheGeneration();
  try {
    const value = await redisCommand(['GET', answerDataKey(gen, normalizedKey)]);
    if (!value) return null;
    const decoded = decodeStoredJson(value);
    return decoded && decoded.queryNormalized === normalizedKey ? decoded : null;
  } catch {
    return null;
  }
}

export async function readRecentAnswerCache(generation?: number, limit = ANSWER_CACHE_MAX_ENTRIES): Promise<any[]> {
  const gen = generation || await getAnswerCacheGeneration();
  const bounded = Math.max(1, Math.min(ANSWER_CACHE_MAX_ENTRIES, Number(limit) || ANSWER_CACHE_MAX_ENTRIES));
  const indexKey = answerIndexKey(gen);
  try {
    const cutoff = Date.now() - ANSWER_TTL_SECONDS * 1000;
    await redisCommand(['ZREMRANGEBYSCORE', indexKey, '-inf', cutoff]);
    const keys = await redisCommand(['ZREVRANGE', indexKey, 0, bounded - 1]);
    if (!Array.isArray(keys) || keys.length === 0) return [];
    const values = await redisCommand(['MGET', ...keys]);
    const entries: any[] = [];
    const staleKeys: string[] = [];
    (Array.isArray(values) ? values : []).forEach((value, idx) => {
      if (!value) {
        if (keys[idx]) staleKeys.push(String(keys[idx]));
        return;
      }
      try {
        const decoded = decodeStoredJson(value);
        if (decoded?.queryNormalized) entries.push(decoded);
      } catch {
        if (keys[idx]) staleKeys.push(String(keys[idx]));
      }
    });
    if (staleKeys.length > 0) await redisCommand(['ZREM', indexKey, ...staleKeys]).catch(() => {});
    return entries;
  } catch {
    return [];
  }
}

export async function writeAnswerCacheEntry(entry: any, generation?: number): Promise<void> {
  if (!entry?.queryNormalized) return;
  const gen = generation || await getAnswerCacheGeneration();
  const dataKey = answerDataKey(gen, String(entry.queryNormalized));
  const indexKey = answerIndexKey(gen);
  const encoded = encodeStoredJson(entry);
  const now = Date.now();
  const cutoff = now - ANSWER_TTL_SECONDS * 1000;
  const script = [
    "redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2])",
    "redis.call('ZADD',KEYS[2],ARGV[3],KEYS[1])",
    "redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[4])",
    "local count=redis.call('ZCARD',KEYS[2])",
    'local maxEntries=tonumber(ARGV[5])',
    "if count>maxEntries then redis.call('ZREMRANGEBYRANK',KEYS[2],0,count-maxEntries-1) end",
    "redis.call('EXPIRE',KEYS[2],ARGV[2])",
    'return 1',
  ].join('; ');
  try {
    await redisCommand([
      'EVAL', script, 2, dataKey, indexKey,
      encoded, ANSWER_TTL_SECONDS, now, cutoff, ANSWER_CACHE_MAX_ENTRIES,
    ]);
  } catch {
    // Runtime RAM cache continues during outages; no Firestore cache writes.
  }
}

export async function deleteLegacyAnswerCache(): Promise<void> {
  try { await redisCommand(['DEL', LEGACY_ANSWER_CACHE_KEY]); } catch { /* optional cleanup */ }
}

// ---------------------------------------------------------------------------
// Backward-compatible v1 helpers. They are retained for release migration/tests
// only; Gemini runtime uses the per-entry V2 functions above.
// ---------------------------------------------------------------------------
export async function readAnswerCache(): Promise<any[]> {
  try {
    const value = await redisCommand(['GET', LEGACY_ANSWER_CACHE_KEY]);
    return value ? decodeStoredJson(value) : [];
  } catch {
    return [];
  }
}

export async function writeAnswerCache(entries: any[]): Promise<void> {
  try {
    await redisCommand(['SET', LEGACY_ANSWER_CACHE_KEY, encodeStoredJson(entries.slice(0, ANSWER_CACHE_MAX_ENTRIES)), 'EX', ANSWER_TTL_SECONDS]);
  } catch {
    /* Compatibility only. */
  }
}


// ---------------------------------------------------------------------------
// Short-lived public chat session persistence. Redis is not the CMS source of
// truth; it only keeps active conversation state across Node restarts/replicas.
// ---------------------------------------------------------------------------
const CHAT_SESSION_TTL_SECONDS = 8 * 60 * 60;
const CHAT_SESSION_MAX_ENTRIES = 100;
const CHAT_SESSION_INDEX_KEY = `${namespace}:chat-sessions:index:v1`;

function chatSessionDataKey(sessionId: string): string {
  return redisKey('chat-session-v1', sessionId);
}

function chatOwnerKey(sessionId: string): string {
  return redisKey('chat-owner-v1', sessionId);
}

function visitorDigest(visitor: string): string {
  return crypto.createHash('sha256').update(visitor).digest('hex');
}

export async function readChatSession(sessionId: string): Promise<any | null> {
  if (!sessionId) return null;
  try {
    const value = await redisCommand(['GET', chatSessionDataKey(sessionId)]);
    if (!value) return null;
    const decoded = decodeStoredJson(value);
    return decoded?.id === sessionId ? decoded : null;
  } catch {
    return null;
  }
}

export async function writeChatSession(session: any): Promise<void> {
  if (!session?.id) return;
  const dataKey = chatSessionDataKey(String(session.id));
  const encoded = encodeStoredJson(session);
  const score = Date.now();
  const script = [
    "redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2])",
    "redis.call('ZADD',KEYS[2],ARGV[3],KEYS[1])",
    "local count=redis.call('ZCARD',KEYS[2])",
    'local maxEntries=tonumber(ARGV[4])',
    "if count>maxEntries then redis.call('ZREMRANGEBYRANK',KEYS[2],0,count-maxEntries-1) end",
    "redis.call('EXPIRE',KEYS[2],ARGV[2])",
    'return 1',
  ].join('; ');
  try {
    await redisCommand(['EVAL', script, 2, dataKey, CHAT_SESSION_INDEX_KEY, encoded, CHAT_SESSION_TTL_SECONDS, score, CHAT_SESSION_MAX_ENTRIES]);
  } catch {
    // RAM session remains active when Redis is unavailable.
  }
}

export async function readRecentChatSessions(limit = CHAT_SESSION_MAX_ENTRIES): Promise<any[]> {
  const bounded = Math.max(1, Math.min(CHAT_SESSION_MAX_ENTRIES, Number(limit) || CHAT_SESSION_MAX_ENTRIES));
  try {
    const keys = await redisCommand(['ZREVRANGE', CHAT_SESSION_INDEX_KEY, 0, bounded - 1]);
    if (!Array.isArray(keys) || keys.length === 0) return [];
    const values = await redisCommand(['MGET', ...keys]);
    const sessions: any[] = [];
    const staleKeys: string[] = [];
    (Array.isArray(values) ? values : []).forEach((value, idx) => {
      if (!value) {
        if (keys[idx]) staleKeys.push(String(keys[idx]));
        return;
      }
      try {
        const decoded = decodeStoredJson(value);
        if (decoded?.id) sessions.push(decoded);
      } catch {
        if (keys[idx]) staleKeys.push(String(keys[idx]));
      }
    });
    if (staleKeys.length > 0) await redisCommand(['ZREM', CHAT_SESSION_INDEX_KEY, ...staleKeys]).catch(() => {});
    return sessions;
  } catch {
    return [];
  }
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const dataKey = chatSessionDataKey(sessionId);
  try {
    await redisCommand(['DEL', dataKey, chatOwnerKey(sessionId)]);
    await redisCommand(['ZREM', CHAT_SESSION_INDEX_KEY, dataKey]);
  } catch {
    // Best-effort cleanup; both records also have bounded TTL.
  }
}

/**
 * Atomically claims/refreshes ownership of a public chat session. Only a hash of
 * the HttpOnly visitor token is stored. null means Redis is unavailable.
 */
export async function claimChatSessionOwner(sessionId: string, visitor: string): Promise<'claimed' | 'owned' | 'conflict' | null> {
  if (!sessionId || !visitor) return null;
  const ownerHash = visitorDigest(visitor);
  const script = [
    "local current=redis.call('GET',KEYS[1])",
    "if not current then redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return 'claimed' end",
    "if current==ARGV[1] then redis.call('EXPIRE',KEYS[1],ARGV[2]); return 'owned' end",
    "return 'conflict'",
  ].join('; ');
  try {
    const result = String(await redisCommand(['EVAL', script, 1, chatOwnerKey(sessionId), ownerHash, CHAT_SESSION_TTL_SECONDS]));
    return result === 'claimed' || result === 'owned' || result === 'conflict' ? result : null;
  } catch {
    return null;
  }
}

export async function distributedCount(scope: string, id: string, windowMs: number): Promise<number | null> {
  try {
    return Number(await redisCommand([
      'EVAL',
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n",
      1,
      redisKey(scope, `${Math.floor(Date.now() / windowMs)}:${id}`),
      windowMs,
    ]));
  } catch {
    return null;
  }
}
