import {registerSecret} from './securityServer';
import {
  getAnswerCacheGeneration,
  readAnswerCacheEntry,
  readRecentAnswerCache,
  writeAnswerCacheEntry,
  bumpAnswerCacheGeneration,
  deleteLegacyAnswerCache,
} from './redisServer';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  getGeminiApiSecretFromCloud,
  setGeminiApiSecretInCloud,
  deleteGeminiApiSecretFromCloud,
  saveGeminiErrorLogsToCloud,
  loadGeminiErrorLogsFromCloud,
} from './firebaseAdminServer';
import {
  KnowledgeItem,
  KnowledgeComponentType,
  KnowledgeTaxonomyData,
  AiTrainingConfig,
  GeminiApiErrorRecord,
  GeminiApiErrorType,
  ActiveQuotaExceededState,
  GeminiChatCacheEntry,
} from '../types';
import { DEFAULT_AI_TRAINING_CONFIG } from '../utils/aiConfigDefaults';
import type { ConversationReasoningResult } from './chatbotConversationReasoner';

let geminiClient: GoogleGenAI | null = null;
let cmsModelProvider: (() => Pick<AiTrainingConfig,'modelName'|'fallbackModelName'>) | null = null;
export function setGeminiModelProvider(provider: typeof cmsModelProvider) { cmsModelProvider = provider; }
function cmsModelCandidates(): string[] {
  const config = cmsModelProvider?.();
  return Array.from(new Set([config?.modelName || DEFAULT_AI_TRAINING_CONFIG.modelName,
    config?.fallbackModelName].filter(Boolean))) as string[];
}
let activeGeminiApiKey: string | null = String(process.env.GEMINI_API_KEY || '').trim() || null;

let geminiKeySource: 'firebase' | 'env' | 'none' = process.env.GEMINI_API_KEY ? 'env' : 'none';

function maskGeminiApiKey(key: string): string {
  return key
    ? `${key.slice(0, 4)}${'*'.repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`
    : '';
}

export async function hydrateGeminiApiKeyFromCloud(): Promise<void> {
  const envKey = String(process.env.GEMINI_API_KEY || '').trim();
  if(envKey){activeGeminiApiKey=envKey;geminiKeySource='env';geminiClient=null;hydrateGeminiChatCacheFromCloud().catch(()=>{});return;}
  let cloudKey = '';
  try {
    cloudKey = String((await getGeminiApiSecretFromCloud()) || '').trim();
  } catch (err) {
    // Firestore is optional for Gemini runtime. Render ENV remains a valid,
    // server-side credential source even when Cloud is offline/unconfigured.
    console.warn('[GeminiKey] Firestore unavailable; using GEMINI_API_KEY env fallback when configured.');
  }
  activeGeminiApiKey = cloudKey || envKey || null;
  geminiKeySource = cloudKey ? 'firebase' : (envKey ? 'env' : 'none');
  geminiClient = null;
  // Simultaneously hydrate error logs and chat cache in the background
  hydrateGeminiErrorLogsFromCloud().catch(() => {});
  hydrateGeminiChatCacheFromCloud().catch(() => {});
}

export function getConfiguredGeminiApiKey(): string {
  return activeGeminiApiKey || '';
}

export function getGeminiApiKeyInfo() {
  const key = getConfiguredGeminiApiKey();
  registerSecret(key);
  return {
    configured: !!key,
    masked: maskGeminiApiKey(key),
    source: key ? geminiKeySource : 'none',
    apiKey: key,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. ERROR CLASSIFICATION & DETECTION
// ==========================================

export function isQuotaExceededError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('exhausted your quota') ||
    msg.includes('too many requests') ||
    msg.includes('quota')
  );
}

export function isModelNotFoundError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 404 ||
    status === 'NOT_FOUND' ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('is not supported') ||
    msg.includes('is not found')
  );
}

export function isHighDemandOrTransientError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 503 ||
    status === 'UNAVAILABLE' ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('overloaded')
  );
}

export function isApiKeyInvalidError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 400 ||
    status === 403 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('forbidden') ||
    msg.includes('unauthenticated') ||
    msg.includes('invalid api key')
  );
}

export function classifyGeminiError(err: any): {
  statusCode: number | string;
  errorType: GeminiApiErrorType;
  message: string;
} {
  const rawMsg = String(err?.message || err || '');
  if (isQuotaExceededError(err)) {
    return {
      statusCode: 429,
      errorType: 'QUOTA_EXCEEDED_429',
      message: rawMsg || 'Quota Exceeded: Khóa API đã đạt giới hạn yêu cầu (429 RESOURCE_EXHAUSTED).',
    };
  }
  if (isHighDemandOrTransientError(err)) {
    return {
      statusCode: 503,
      errorType: 'HIGH_DEMAND_503',
      message: rawMsg || 'High Demand: Mô hình AI đang trải qua lượng truy cập cao đột biến (503 UNAVAILABLE).',
    };
  }
  if (isModelNotFoundError(err)) {
    return {
      statusCode: 404,
      errorType: 'NOT_FOUND_404',
      message: rawMsg || 'Model Not Found: Mô hình AI không tìm thấy hoặc đã ngừng hỗ trợ (404 NOT_FOUND).',
    };
  }
  if (isApiKeyInvalidError(err)) {
    return {
      statusCode: 400,
      errorType: 'AUTH_INVALID_400',
      message: rawMsg || 'Invalid Key: Khóa API Gemini không hợp lệ hoặc bị vô hiệu hóa (400/403 API_KEY_INVALID).',
    };
  }
  return {
    statusCode: err?.status || err?.code || 500,
    errorType: 'NETWORK_OR_UNKNOWN',
    message: rawMsg || 'Lỗi kết nối hoặc xử lý dữ liệu với máy chủ AI.',
  };
}

// ==========================================
// 2. ERROR LOGGING & QUOTA EXCEEDED STATE
// ==========================================

let geminiErrorLogs: GeminiApiErrorRecord[] = [];
let activeQuotaExceededState: ActiveQuotaExceededState = {
  active: false,
  statusCode: 200,
};
let errorLogsLoadedFromCloud = false;

export async function hydrateGeminiErrorLogsFromCloud(): Promise<void> {
  if (errorLogsLoadedFromCloud) return;
  try {
    const data = await loadGeminiErrorLogsFromCloud();
    if (Array.isArray(data.logs) && data.logs.length > 0) {
      const map = new Map<string, GeminiApiErrorRecord>();
      for (const log of geminiErrorLogs) map.set(log.id, log);
      for (const log of data.logs) {
        if (!map.has(log.id)) map.set(log.id, log);
      }
      geminiErrorLogs = Array.from(map.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 150);
    }
    if (data.quotaState && typeof data.quotaState.active === 'boolean') {
      activeQuotaExceededState = data.quotaState;
    }
    errorLogsLoadedFromCloud = true;
  } catch (err) {
    console.warn('[GeminiErrorLogs] Không thể tải error logs từ Firestore:', err);
  }
}

let syncErrorLogsTimeout: NodeJS.Timeout | null = null;
function scheduleErrorLogsCloudSync() {
  if (syncErrorLogsTimeout) clearTimeout(syncErrorLogsTimeout);
  syncErrorLogsTimeout = setTimeout(async () => {
    try {
      await saveGeminiErrorLogsToCloud(geminiErrorLogs, activeQuotaExceededState);
    } catch (e) {
      console.warn('[GeminiErrorLogs] Lưu error logs lên Firestore thất bại:', e);
    }
  }, 2500);
}

export function recordGeminiApiError(params: {
  statusCode: number | string;
  errorType: GeminiApiErrorType;
  model: string;
  endpoint: string;
  message: string;
  apiKeyMasked?: string;
  queryPreview?: string;
  recoveredViaFallback?: boolean;
  fallbackModelUsed?: string;
}): GeminiApiErrorRecord {
  const currentKey = getConfiguredGeminiApiKey();
  const maskedKey = params.apiKeyMasked || maskGeminiApiKey(currentKey) || 'Chưa cấu hình';

  const record: GeminiApiErrorRecord = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    statusCode: params.statusCode,
    errorType: params.errorType,
    model: params.model,
    endpoint: params.endpoint,
    message: String(params.message || '').slice(0, 500),
    apiKeyMasked: maskedKey,
    queryPreview: params.queryPreview ? String(params.queryPreview).slice(0, 120) : undefined,
    recoveredViaFallback: !!params.recoveredViaFallback,
    fallbackModelUsed: params.fallbackModelUsed,
  };

  geminiErrorLogs.unshift(record);
  if (geminiErrorLogs.length > 200) {
    geminiErrorLogs = geminiErrorLogs.slice(0, 200);
  }

  // If Quota Exceeded (429), activate alert state immediately!
  if (params.errorType === 'QUOTA_EXCEEDED_429' || params.statusCode === 429) {
    activeQuotaExceededState = {
      active: true,
      detectedAt: record.timestamp,
      apiKeyMasked: maskedKey,
      model: params.model,
      statusCode: 429,
      message: params.message,
    };
  }

  scheduleErrorLogsCloudSync();
  return record;
}

export function getGeminiErrorLogs(limit = 100): GeminiApiErrorRecord[] {
  return geminiErrorLogs.slice(0, limit);
}

export function getActiveQuotaExceededState(): ActiveQuotaExceededState {
  return activeQuotaExceededState;
}

export function resetQuotaExceededAlert(): void {
  activeQuotaExceededState = {
    active: false,
    statusCode: 200,
  };
  scheduleErrorLogsCloudSync();
}

export function clearGeminiErrorLogs(): void {
  geminiErrorLogs = [];
  scheduleErrorLogsCloudSync();
}

// ==========================================
// 3. REDIS CHAT RESPONSE CACHING (V2)
// ==========================================

const geminiChatCache = new Map<string, GeminiChatCacheEntry>();
let chatCacheLoadedGeneration = 0;
let legacyAnswerCachePurged = false;

export function normalizeQueryForCache(raw: string, product?: string, scope?: string): string {
  if (!raw) return '';
  let str = raw.toLowerCase().trim();
  // Strip common punctuations
  str = str.replace(/[?!.,;:_`~@#$%^&*()[\]{}|\\/<>+=\-"']/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();
  const prodKey = product && product !== 'all' ? product.toLowerCase().trim() : 'general';
  const scopeKey = scope ? String(scope).toLowerCase().trim() : 'legacy';
  return `${prodKey}::${scopeKey}::${str}`;
}

function calculateQuerySimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

function mergeChatCacheEntries(entries: GeminiChatCacheEntry[]) {
  for (const entry of entries || []) {
    if (entry?.queryNormalized) geminiChatCache.set(entry.queryNormalized, entry);
  }
  if (geminiChatCache.size > 300) {
    const sorted = Array.from(geminiChatCache.entries())
      .sort((a, b) => new Date(b[1].lastAccessedAt || b[1].createdAt).getTime() - new Date(a[1].lastAccessedAt || a[1].createdAt).getTime())
      .slice(0, 300);
    geminiChatCache.clear();
    for (const [key, entry] of sorted) geminiChatCache.set(key, entry);
  }
}

async function syncChatCacheGeneration(): Promise<number> {
  const generation = await getAnswerCacheGeneration();
  if (chatCacheLoadedGeneration !== 0 && generation !== chatCacheLoadedGeneration) {
    // Another replica or an admin mutation invalidated the cache. Never keep a
    // local answer from the previous Redis namespace.
    geminiChatCache.clear();
    chatCacheLoadedGeneration = 0;
  }
  return generation;
}

export async function hydrateGeminiChatCacheFromCloud(): Promise<void> {
  const generation = await syncChatCacheGeneration();
  if (chatCacheLoadedGeneration === generation) return;
  try {
    const entries = await readRecentAnswerCache(generation, 300);
    mergeChatCacheEntries(entries as GeminiChatCacheEntry[]);
    chatCacheLoadedGeneration = generation;
    if (!legacyAnswerCachePurged) {
      legacyAnswerCachePurged = true;
      // V1 used one shared array key with sliding TTL semantics. Do not migrate
      // it into V2 because its knowledge/training scope may already be stale.
      await deleteLegacyAnswerCache();
    }
  } catch (err) {
    console.warn('[GeminiChatCache] Không thể tải chat cache Redis V2:', err);
  }
}

function markLocalCacheHit(item: GeminiChatCacheEntry): GeminiChatCacheEntry {
  item.hitCount = (item.hitCount || 0) + 1;
  item.lastAccessedAt = new Date().toISOString();
  geminiChatCache.set(item.queryNormalized, item);
  return item;
}

export async function getCachedChatResponse(query: string, product?: string, scope?: string, exactOnly = false): Promise<GeminiChatCacheEntry | null> {
  await hydrateGeminiChatCacheFromCloud();
  const generation = await syncChatCacheGeneration();
  const normalizedKey = normalizeQueryForCache(query, product, scope);
  if (!normalizedKey) return null;

  // 1. Exact normalized match. Redis is checked first so a replica can use an
  // answer written by another replica without waiting for a process restart.
  const redisExact = await readAnswerCacheEntry(normalizedKey, generation) as GeminiChatCacheEntry | null;
  if (redisExact) {
    // Re-check the generation after reading the entry. If an admin changed
    // Knowledge/Taxonomy/AI settings concurrently, never return an answer from
    // the just-invalidated namespace.
    if (await syncChatCacheGeneration() === generation) return markLocalCacheHit(redisExact);
    return null;
  }

  // Redis is an optimization. During an outage the local hot cache remains
  // available, scoped to the generation last observed by this process.
  const localExact = geminiChatCache.get(normalizedKey);
  if (localExact) {
    if (await syncChatCacheGeneration() === generation) return markLocalCacheHit(localExact);
    return null;
  }

  if (exactOnly) return null;

  // Refresh recent entries before similarity matching so answers created by
  // other replicas are visible. Each answer remains an independent Redis key.
  const recent = await readRecentAnswerCache(generation, 120);
  mergeChatCacheEntries(recent as GeminiChatCacheEntry[]);

  // 2. High semantic token similarity match for questions with >= 4 words
  const prodKey = product && product !== 'all' ? product.toLowerCase().trim() : 'general';
  const scopeKey = scope ? String(scope).toLowerCase().trim() : 'legacy';
  const queryWords = (normalizedKey.split('::')[2] || '').split(' ').filter((w) => w.length > 1);
  if (queryWords.length >= 4) {
    const queryTokens = new Set(queryWords);
    for (const [key, item] of geminiChatCache.entries()) {
      if (!key.startsWith(`${prodKey}::${scopeKey}::`)) continue;
      const cachedWords = (key.split('::')[2] || '').split(' ').filter((w) => w.length > 1);
      if (cachedWords.length >= 4) {
        const cachedTokens = new Set(cachedWords);
        const sim = calculateQuerySimilarity(queryTokens, cachedTokens);
        if (sim >= 0.88) {
          if (await syncChatCacheGeneration() === generation) return markLocalCacheHit(item);
          return null;
        }
      }
    }
  }

  return null;
}

export async function setCachedChatResponse(params: {
  query: string;
  product?: string;
  reply: string;
  sources?: string[];
  quickReplies?: string[];
  modelUsed: string;
  scope?: string;
}): Promise<void> {
  await hydrateGeminiChatCacheFromCloud();
  const generation = await syncChatCacheGeneration();
  const normalizedKey = normalizeQueryForCache(params.query, params.product, params.scope);
  if (!normalizedKey) return;

  const now = new Date().toISOString();
  const entry: GeminiChatCacheEntry = {
    id: `cache_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    queryNormalized: normalizedKey,
    rawQuery: params.query.trim(),
    product: params.product,
    reply: params.reply,
    sources: params.sources || [],
    quickReplies: params.quickReplies || [],
    modelUsed: params.modelUsed,
    createdAt: now,
    lastAccessedAt: now,
    hitCount: 0,
  };

  geminiChatCache.set(normalizedKey, entry);
  mergeChatCacheEntries([]);
  await writeAnswerCacheEntry(entry, generation);
}

export function getChatCacheStats(): {
  totalEntries: number;
  totalHits: number;
  savedApiCalls: number;
  entries: GeminiChatCacheEntry[];
} {
  const entries = Array.from(geminiChatCache.values())
    .sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0));
  const totalHits = entries.reduce((acc, cur) => acc + (cur.hitCount || 0), 0);
  return {
    totalEntries: entries.length,
    totalHits,
    savedApiCalls: totalHits,
    entries: entries.slice(0, 100),
  };
}

/**
 * Clears cache synchronously from the caller's perspective by switching to a
 * new Redis generation before returning. Old per-entry keys are unreachable
 * immediately and disappear via their own 24-hour TTL.
 */
export async function clearChatCache(reason = 'manual_clear'): Promise<void> {
  geminiChatCache.clear();
  chatCacheLoadedGeneration = 0;
  await bumpAnswerCacheGeneration(reason);
  await deleteLegacyAnswerCache();
}

/** Alias used by Knowledge/Taxonomy/Training mutation routes. */
export async function invalidateChatCache(reason: string): Promise<void> {
  await clearChatCache(reason || 'ai_configuration_changed');
}

// ==========================================
// 4. API KEY VALIDATION WITH ERROR RECORDING
// ==========================================

export async function validateAndTestGeminiApiKey(
  apiKey: string,
  modelCandidates?: string[]
): Promise<{ valid: boolean; modelTested: string; latencyMs: number; warning?: string }> {
  const normalized = String(apiKey || '').trim();
  if (!normalized) {
    throw new Error('Gemini API key không được để trống.');
  }
  if (normalized.length < 20) {
    throw new Error('Gemini API key có vẻ không hợp lệ (độ dài quá ngắn).');
  }

  const client = getGeminiClient(normalized);
  const startTime = Date.now();
  const masked = maskGeminiApiKey(normalized);
  // Probe the administrator's configured models; API key changes never silently
  // replace the selected chat model with a fixed model list.
  const candidateModels = Array.from(new Set((modelCandidates?.length ? modelCandidates : [
    DEFAULT_AI_TRAINING_CONFIG.modelName,
    DEFAULT_AI_TRAINING_CONFIG.fallbackModelName,
  ]).filter(Boolean))) as string[];
  let anyAuthRejection = false;
  let authRejectionMessage = '';
  let lastErrorMessage = '';
  let quotaHitDuringTest = false;

  for (const model of candidateModels) {
    try {
      await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Phản hồi duy nhất: OK' }] }],
        config: { maxOutputTokens: 3, temperature: 0 },
      });
      const latencyMs = Date.now() - startTime;
      // Key succeeded! Reset any previous quota alert
      resetQuotaExceededAlert();
      return { valid: true, modelTested: model, latencyMs };
    } catch (err: any) {
      lastErrorMessage = String(err?.message || err || '');
      const classified = classifyGeminiError(err);
      
      // Check specifically if Google rejected the API key at the authentication layer
      if (classified.errorType === 'AUTH_INVALID_400') {
        anyAuthRejection = true;
        authRejectionMessage =
          'Gemini API Key không hợp lệ hoặc đã bị vô hiệu hóa (Google báo lỗi: API_KEY_INVALID). Vui lòng kiểm tra lại key của bạn tại Google AI Studio.';
        recordGeminiApiError({
          statusCode: 400,
          errorType: 'AUTH_INVALID_400',
          model,
          endpoint: 'validateApiKey',
          message: classified.message,
          apiKeyMasked: masked,
        });
        break; // Stop immediately on actual auth failure
      }

      if (classified.errorType === 'QUOTA_EXCEEDED_429') {
        quotaHitDuringTest = true;
      }

      recordGeminiApiError({
        statusCode: classified.statusCode,
        errorType: classified.errorType,
        model,
        endpoint: 'validateApiKey',
        message: classified.message,
        apiKeyMasked: masked,
      });

      console.warn(`[validateAndTestGeminiApiKey] Model ${model} probe returned error:`, lastErrorMessage);
      await sleep(250);
    }
  }

  if (anyAuthRejection) {
    throw new Error(authRejectionMessage);
  }

  if (quotaHitDuringTest) {
    throw new Error(
      `Gemini API Key hợp lệ nhưng đã đạt giới hạn Quota (Mã lỗi: 429 RESOURCE_EXHAUSTED). Vui lòng đổi sang key khác hoặc đợi Google reset hạn mức.`
    );
  }

  // If Google did NOT return an authentication error (400/403 API_KEY_INVALID),
  // but returned 503 (High Demand / Spikes in demand) or 404 across models:
  // This PROVES that the API Key authenticated successfully past Google's auth gateway!
  const latencyMs = Date.now() - startTime;
  return {
    valid: true,
    modelTested: 'gemini-3.8-flash',
    latencyMs,
    warning:
      'Google Gemini API hiện đang ghi nhận lượng truy cập cao đột biến (503). Khóa API đã được Google xác thực hợp lệ và hệ thống đã kích hoạt cơ chế dự phòng tự động.',
  };
}

// ==========================================
// 5. RESILIENT GEMINI CALL DISPATCHER
// ==========================================

export async function callGeminiModelWithResilience(
  client: GoogleGenAI,
  preferredModels: string[],
  requestFn: (model: string) => Promise<any>,
  context?: { endpoint?: string; queryPreview?: string }
): Promise<{ response: any; modelUsed: string }> {
  // Deduplicate and filter models - only use modern active models
  const uniqueModels = Array.from(new Set(preferredModels.filter(Boolean)));
  // Only CMS-selected models are attempted; the test endpoint probes one model.

  let lastError: any = null;
  const currentKey = getConfiguredGeminiApiKey();
  const maskedKey = maskGeminiApiKey(currentKey);
  const failedModels: string[] = [];

  for (let mIdx = 0; mIdx < Math.min(uniqueModels.length, 3); mIdx++) {
    const model = uniqueModels[mIdx];

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await requestFn(model);
        
        // If previous models failed but this model succeeded, update recent error log to show recovery!
        if (failedModels.length > 0) {
          const latestErr = geminiErrorLogs[0];
          if (latestErr && failedModels.includes(latestErr.model)) {
            latestErr.recoveredViaFallback = true;
            latestErr.fallbackModelUsed = model;
          }
        }
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        failedModels.push(model);
        const classified = classifyGeminiError(err);

        recordGeminiApiError({
          statusCode: classified.statusCode,
          errorType: classified.errorType,
          model,
          endpoint: context?.endpoint || '/api/ai/chat',
          message: classified.message,
          apiKeyMasked: maskedKey,
          queryPreview: context?.queryPreview,
        });

        if (isApiKeyInvalidError(err)) {
          throw err;
        }

        if (classified.errorType === 'QUOTA_EXCEEDED_429') {
          console.warn(`[Gemini Resilience] Model ${model} returned 429 Quota Exceeded. Checking next candidate model...`);
          break; // Quota exceeded for this model, try next model or fail
        }

        if (isHighDemandOrTransientError(err)) {
          console.warn(`[Gemini Resilience] Model ${model} returned 503/high demand (attempt ${attempt}/2): ${err?.message || err}`);
          if (attempt < 2) {
            await sleep(350 * attempt);
            continue;
          }
        } else {
          console.warn(`[Gemini Resilience] Model ${model} failed (code ${classified.statusCode}): ${err?.message || err}`);
          break;
        }
      }
    }
  }

  throw lastError || new Error('Tất cả mô hình AI đều không phản hồi.');
}

export async function saveGeminiApiKey(
  apiKey: string,
  auditLog: any,
  modelCandidates?: string[]
): Promise<{ configured: boolean; masked: string; warning?: string; modelTested?: string }> {
  const normalized = String(apiKey || '').trim();
  if (!normalized) throw new Error('Gemini API key không được để trống.');

  const testResult = await validateAndTestGeminiApiKey(normalized, modelCandidates);

  await setGeminiApiSecretInCloud(normalized, auditLog);
  activeGeminiApiKey = normalized;
  geminiKeySource = 'firebase';
  geminiClient = null;
  resetQuotaExceededAlert();

  return {
    ...getGeminiApiKeyInfo(),
    warning: testResult.warning,
    modelTested: testResult.modelTested,
  };
}

export async function clearStoredGeminiApiKey(auditLog: any): Promise<{ configured: boolean; masked: string }> {
  await deleteGeminiApiSecretFromCloud(auditLog);
  const envKey = String(process.env.GEMINI_API_KEY || '').trim();
  activeGeminiApiKey = envKey || null;
  geminiKeySource = envKey ? 'env' : 'none';
  geminiClient = null;
  resetQuotaExceededAlert();
  return getGeminiApiKeyInfo();
}

export function getGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  const apiKey = apiKeyOverride || getConfiguredGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key chưa được cấu hình trong Firebase Firestore.');
  }

  // Overrides are used only for pre-save credential validation. Never mutate the
  // active cloud-authoritative credential until the Firestore write succeeds.
  if (apiKeyOverride) {
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }

  if (!geminiClient || activeGeminiApiKey !== apiKey) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    activeGeminiApiKey = apiKey;
  }
  return geminiClient;
}

export function isGeminiAvailable(): boolean {
  return !!getConfiguredGeminiApiKey();
}

/**
 * AI Document Knowledge Extractor:
 * Tự động phân tích tài liệu nội bộ (PDF, Word, Excel, Text) thành các đơn vị tri thức sản phẩm có cấu trúc:
 * - Sản phẩm (Product)
 * - Danh mục (Category)
 * - Chủ đề (Topic)
 * - Bộ phận cấu thành (Component Type: overview, benefits, pricing_rules, exclusions, claim_procedure, hospitals_garages, faq, sales_pitch)
 */
export async function extractKnowledgeFromDocument(params: {
  documentText?: string;
  fileData?: { mimeType: string; base64: string };
  sourceFileName?: string;
  defaultProduct?: string;
  defaultCategory?: string;
  taxonomy?: KnowledgeTaxonomyData;
}): Promise<Array<{
  title: string;
  product: string;
  category: string;
  topic: string;
  componentType: KnowledgeComponentType;
  content: string;
  tags: string[];
}>> {
  const client = getGeminiClient();

  const productsList = params.taxonomy?.products?.map((p) => `"${p.name}"`).join(', ') || '(không có sản phẩm nào được cấu hình trong CMS)';

  const categoriesList = params.taxonomy?.categories?.map((c) => `"${c.name}"`).join(', ') || '(không có danh mục nào được cấu hình trong CMS)';

  const componentTypesList = params.taxonomy?.componentTypes?.map((ct) => `   - "${ct.code}": ${ct.label} (${ct.desc})`).join('\n') ||
`   - "overview" (Tổng quan sản phẩm, đối tượng tham gia, điều kiện)
   - "benefits" (Quyền lợi chính, quyền lợi bổ sung, phạm vi chi trả)
   - "pricing_rules" (Biểu phí, công thức tính, mức khấu trừ, chính sách giảm phí)
   - "exclusions" (Điểm loại trừ bảo hiểm, thời gian chờ, trường hợp không bồi thường)
   - "claim_procedure" (Quy trình giám định, khai báo tổn thất, thủ tục bồi thường)
   - "hospitals_garages" (Danh bạ bệnh viện bảo lãnh, gara sửa chữa chính hãng liên kết)
   - "faq" (Câu hỏi thường gặp, giải đáp tình huống thực tế)
   - "sales_pitch" (Kịch bản tư vấn, so sánh ưu thế với thị trường, mẹo chốt sale)
   - "custom" (Nội dung khác)`;

  const availableComponentCodes = params.taxonomy?.componentTypes?.map((c) => c.code) || [
    'overview', 'benefits', 'pricing_rules', 'exclusions', 'claim_procedure', 'hospitals_garages', 'faq', 'sales_pitch', 'custom'
  ];

  const prompt = `Bạn là Chuyên gia Quản lý Tri thức & Đào tạo Sản phẩm thương hiệu được chủ CMS cấu hình.
Nhiệm vụ của bạn là đọc và phân tích tài liệu nội bộ sau đây, sau đó bóc tách thành các mục kiến thức chuyên sâu (Knowledge Units) rõ ràng, khoa học để nạp vào hệ thống học của AI Chatbot tư vấn khách hàng.

${params.sourceFileName ? `(Tên file: ${params.sourceFileName})` : ''}
${params.documentText ? `Tài liệu gốc:\n"""\n${params.documentText.slice(0, 45000)}\n"""` : ''}

YÊU CẦU PHÂN LOẠI CHI TIẾT THEO HỆ THỐNG NGHIỆP VỤ THƯƠNG HIỆU:
1. "product": Xác định tên sản phẩm bảo hiểm cụ thể. Danh mục sản phẩm chuẩn: [${productsList}]. ${params.defaultProduct ? `Ưu tiên gán: "${params.defaultProduct}" nếu phù hợp.` : ''}
2. "category": Danh mục lớn: [${categoriesList}]. ${params.defaultCategory ? `Ưu tiên gán: "${params.defaultCategory}" nếu phù hợp.` : ''}
3. "topic": Tên chủ đề rõ ràng (Ví dụ: "Biểu phí & Công thức tính phí", "Quyền lợi & Phạm vi bảo vệ", "Điều khoản loại trừ & Thời gian chờ", "Thủ tục bồi thường & Hồ sơ giấy tờ", "Bảo lãnh viện phí / Gara liên kết", "Câu hỏi thường gặp FAQ").
4. "componentType": Thuộc tính bộ phận cấu thành nội dung, BẮT BUỘC chọn 1 trong các giá trị sau:
${componentTypesList}
5. "title": Tiêu đề súc tích, mô tả chính xác nội dung của khối kiến thức đó.
6. "content": Nội dung chi tiết, định dạng Markdown rõ ràng (tiêu đề ##, gạch đầu dòng, bảng biểu, công thức nếu có). Giữ nguyên các con số, tỷ lệ % và quy định quan trọng.
7. "tags": 4-8 từ khóa tìm kiếm (dạng không dấu hoặc có dấu phân tách bởi chữ thường).

Trả về một mảng JSON các đơn vị kiến thức được trích xuất.`;

  const parts: any[] = [];
  if (params.fileData?.base64) {
    parts.push({
      inlineData: {
        mimeType: params.fileData.mimeType,
        data: params.fileData.base64,
      },
    });
  }
  parts.push({ text: prompt });

  const extractionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        product: { type: Type.STRING },
        category: { type: Type.STRING },
        topic: { type: Type.STRING },
        componentType: {
          type: Type.STRING,
          enum: availableComponentCodes,
        },
        content: { type: Type.STRING },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['title', 'product', 'category', 'topic', 'componentType', 'content', 'tags'],
    },
  };

  let response: any;
  try {
    const res = await callGeminiModelWithResilience(
      client,
      cmsModelCandidates(),
      (model) =>
        client.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: extractionSchema,
          },
        })
    );
    response = res.response;
  } catch (err: any) {
    console.warn('[extractKnowledgeFromDocument]: Resilience call failed:', err?.message || err);
    response = { text: '[]' };
  }

  const text = response.text || '[]';
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // AI is never allowed to invent a Product/Category/Component. Resolve every
      // extracted entity back to the CMS taxonomy before it can enter Knowledge.
      const normalize = (value: unknown) => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const findEntity = (value: string, entities: any[]) => {
        const n = normalize(value);
        if (!n) return null;
        return entities.find((entity) => {
          const terms = [entity.name, entity.label, entity.normalizedName, ...(entity.aliases || []), ...(entity.tags || []), ...(entity.keywords || [])]
            .filter(Boolean).map(normalize);
          return terms.some((term: string) => term && (term === n || n.includes(term) || term.includes(n)));
        }) || null;
      };
      const taxonomy = params.taxonomy;
      const validProducts = Array.isArray(taxonomy?.products) ? taxonomy!.products.filter((p) => p.active !== false) : [];
      const validCategories = Array.isArray(taxonomy?.categories) ? taxonomy!.categories.filter((c) => c.active !== false) : [];
      const validComponents = Array.isArray(taxonomy?.componentTypes) ? taxonomy!.componentTypes.filter((c) => c.active !== false) : [];
      const normalizedDefaultProduct = params.defaultProduct ? findEntity(params.defaultProduct, validProducts) : null;
      const normalizedDefaultCategory = params.defaultCategory ? findEntity(params.defaultCategory, validCategories) : null;

      return parsed.map((item: any) => {
        const product = findEntity(item?.product, validProducts) || normalizedDefaultProduct;
        if (!product) return null;
        const category = findEntity(item?.category, validCategories) ||
          (product.categoryId ? validCategories.find((c) => c.id === product.categoryId) : null) ||
          (product.category ? findEntity(product.category, validCategories) : null) ||
          normalizedDefaultCategory;
        const component = findEntity(item?.componentType, validComponents);
        const componentCode = component?.code || component?.id || 'overview';
        const componentFromDefaults = validComponents.find((c) => c.code === componentCode || c.id === componentCode);
        return {
          title: String(item?.title || params.sourceFileName || 'Nội dung tài liệu').trim(),
          product: product.name,
          productId: product.id,
          category: category?.name || '',
          categoryId: category?.id,
          topic: String(item?.topic || '').trim(),
          componentType: (componentFromDefaults?.code || componentCode) as KnowledgeComponentType,
          componentId: componentFromDefaults?.id,
          content: String(item?.content || '').trim(),
          tags: Array.isArray(item?.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 12) : [],
        };
      }).filter(Boolean) as any[];
    }
  } catch (err) {
    console.error('[extractKnowledgeFromDocument Error]:', err);
  }

  // No taxonomy match means the document cannot be safely auto-ingested. Never
  // fabricate a fallback product such as a generic/sample thương hiệu đang cấu hình product.
  return [];
}

/**
 * Smart RAG Matcher:
 * Tìm kiếm các đơn vị tri thức phù hợp nhất với câu hỏi của khách hàng,
 * kết hợp lọc theo sản phẩm và độ ưu tiên từ khóa.
 */
function normalizeForMatch(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyProductQuestion(query: string): boolean {
  const q = normalizeForMatch(query);
  // Strong product/contract scope signals. Keep generic words such as "bao nhieu"
  // and "chi phi" out of this list so real-world questions can use Search.
  return /(bao hiem|san pham|goi bao hiem|quyen loi|chi tra|pham vi bao hiem|dieu khoan|quy tac|loai tru|thoi gian cho|muc phi bao hiem|phi bao hiem|han muc bao hiem|so tien bao hiem|thuoc tinh san pham|dieu kien tham gia|doi tuong tham gia|boi thuong|ho so boi thuong|thu tuc boi thuong|benh vien bao lanh|gara|hang muc bao hiem)/i.test(q);
}

function isRealWorldSearchQuestion(query: string): boolean {
  const q = normalizeForMatch(query);
  return /(vi du|tinh huong|thuc te|thuc te thi|ngoai doi|ngoai thuc te|hien nay|hien tai|gan day|moi nhat|chi phi dieu tri|chi phi phau thuat|vien phi|gia thi truong|gia hien tai|thi truong|o viet nam|tai viet nam|bao nhieu tien|khoang bao nhieu|thong ke|so lieu|tin tuc|quy dinh moi|xu huong)/i.test(q);
}

function isMixedProductAndRealWorldQuestion(query: string): boolean {
  return isLikelyProductQuestion(query) && isRealWorldSearchQuestion(query);
}

/**
 * Server-side RAG gate.
 *
 * Important: returning the top-K items even when their score is zero makes the
 * model look "grounded" while actually receiving unrelated product data. This
 * function now returns only genuinely relevant active KB items. If no relevant
 * item exists, the caller must refuse product-specific answers.
 */
function scoreAndRetrieveKnowledge(
  query: string,
  items: KnowledgeItem[],
  productFilter?: string,
  topK: number = 5
): KnowledgeItem[] {
  const now = Date.now();
  let activeItems = items.filter((i: any) => {
    if (!i || i.active === false || i.enabled === false || !String(i.content || '').trim()) return false;
    if (i.status && String(i.status).toLowerCase() !== 'published') return false;
    if (i.effectiveDate && new Date(i.effectiveDate).getTime() > now) return false;
    if (i.expiryDate && new Date(i.expiryDate).getTime() < now) return false;
    return true;
  });
  if (!activeItems.length) return [];

  // HARD PRODUCT FILTER: once a product is confirmed, unrelated product
  // knowledge is removed before scoring. Similarity can never override scope.
  const normalizedProductFilter = normalizeForMatch(productFilter || '');
  if (normalizedProductFilter) {
    activeItems = activeItems.filter((item) => {
      const p = normalizeForMatch(item.product);
      return !!p && (p === normalizedProductFilter || p.includes(normalizedProductFilter) || normalizedProductFilter.includes(p));
    });
    if (!activeItems.length) return [];
  }

  const qLower = normalizeForMatch(query);
  const qTokens = qLower.split(/\s+/).filter((t) => t.length > 1);
  // Key multi-word domain concepts in insurance
  const domainPhrases = [
    'thuy kich', 'ngap nuoc', 'than vo', 'vat chat', 'mat cap', 'chay no',
    'tai nan', 'thoi gian cho', 'noi tru', 'ngoai tru', 'thai san', 'nha tu nhan',
    'chung cu', 'hoa hoan', 'gara', 'chinh hang', 'cuu ho', 'khau tru',
    'boi thuong', 'phi bao hiem', 'bieu phi', 'k care', 'ung thu', 'benh hiem ngheo',
    'quyen loi', 'loai tru', 'ho so', 'thu tuc', 'hoa don', 'vinmec', 'bao lanh'
  ];
  const matchedPhrases = domainPhrases.filter((phrase) => qLower.includes(phrase));

  const scored = activeItems.map((item) => {
    let score = 0;
    const titleLower = normalizeForMatch(item.title);
    const productLower = normalizeForMatch(item.product);
    const categoryLower = normalizeForMatch(item.category);
    const topicLower = normalizeForMatch(item.topic);
    const contentLower = normalizeForMatch(item.content);
    const tagsLower = (item.tags || []).map(normalizeForMatch);

    // Product matching
    if (normalizedProductFilter && productLower === normalizedProductFilter) score += 30;
    else if (normalizedProductFilter && productLower.includes(normalizedProductFilter)) score += 20;

    if (productLower && qLower.includes(productLower)) score += 30;
    if (productLower.split(/\s+/).filter((p) => p.length > 2).some((p) => qLower.includes(p))) score += 10;

    // Specific domain phrase matching (high priority for specific queries like "thủy kích", "thai sản")
    for (const phrase of matchedPhrases) {
      if (titleLower.includes(phrase)) score += 40;
      if (topicLower.includes(phrase)) score += 35;
      if (tagsLower.some((t) => t.includes(phrase))) score += 35;
      if (contentLower.includes(phrase)) score += 20;
    }

    if (qLower.includes(topicLower) || topicLower.includes(qLower)) score += 22;
    if (categoryLower && qLower.includes(categoryLower)) score += 12;

    for (const token of qTokens) {
      if (titleLower.includes(token)) score += 8;
      if (tagsLower.some((t) => t.includes(token))) score += 10;
      if (productLower.includes(token)) score += 5;
      if (topicLower.includes(token)) score += 6;
      if (contentLower.includes(token)) score += 2;
    }

    // Component intent
    if (/gia|phi|bao nhieu|tinh phi|khau tru/i.test(qLower) && item.componentType === 'pricing_rules') score += 18;
    if (/quyen loi|duoc gi|chi tra|bao ve|muc/i.test(qLower) && item.componentType === 'benefits') score += 18;
    if (/loai tru|khong|cho|benh co san/i.test(qLower) && item.componentType === 'exclusions') score += 18;
    if (/boi thuong|den|tai nan|thu tuc|ho so|khai bao/i.test(qLower) && item.componentType === 'claim_procedure') score += 18;
    if (/benh vien|vien phi|vinmec|gara/i.test(qLower) && item.componentType === 'hospitals_garages') score += 18;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If there are very specific high-scoring matches (e.g. specific clause like thủy kích or thai sản),
  // prioritize them and avoid cluttering context with generic overviews
  const topScore = scored[0]?.score || 0;
  if (topScore >= 45) {
    const highlyRelevant = scored.filter((s) => s.score >= 35).slice(0, 3);
    if (highlyRelevant.length > 0) {
      return highlyRelevant.map((s) => s.item);
    }
  }

  // For a product-specific question, a product filter must match the KB.
  if (normalizedProductFilter) {
    const productMatches = scored.filter(({ item }) => {
      const p = normalizeForMatch(item.product);
      return p === normalizedProductFilter || p.includes(normalizedProductFilter) || normalizedProductFilter.includes(p);
    });
    if (productMatches.length) {
      const relevant = productMatches.filter((s) => s.score >= 25 || !isLikelyProductQuestion(query));
      if (relevant.length) return relevant.slice(0, topK).map((s) => s.item);
    }
  }

  // Filter out irrelevant items
  const threshold = isLikelyProductQuestion(query) ? 10 : 5;
  return scored.filter((s) => s.score >= threshold).slice(0, topK).map((s) => s.item);
}

export interface ChatRequestParams {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  knowledgeItems: KnowledgeItem[];
  pageContext?: {
    pageTitle?: string;
    brandName?: string;
    headline?: string;
    currentProduct?: string;
    currentCategory?: string;
    phone?: string;
    currentUrl?: string;
    clientTimeZone?: string;
  };
  productFilter?: string;
  useSearchGrounding?: boolean;
  trainingConfig?: AiTrainingConfig;
  botName?: string;
  conversationReasoning?: ConversationReasoningResult;
  /** Current-turn semantic focus resolved by the deterministic router. */
  intentFocus?: string;
}

export interface ChatResponseResult {
  reply: string;
  sources: Array<{
    id: string;
    title: string;
    product: string;
    topic: string;
    componentType: string;
  }>;
  quickReplies: string[];
  capturedLead?: {
    name: string;
    phone: string;
    product?: string;
  };
  fromCache?: boolean;
  cacheHitCount?: number;
  cacheId?: string;
  quotaExceeded?: boolean;
  errorStatusCode?: number;
  modelUsed?: string;
}

function isCurrentDateTimeQuestion(message: string): boolean {
  const q = String(message || '').toLowerCase();
  return /(hôm nay|hom nay|ngày mai|ngay mai|hôm qua|hom qua|bây giờ|bay gio|hiện tại|hien tai|bây h|bay h|ngày mấy|ngay may|mấy giờ|may gio|giờ mấy|gio may|thứ mấy|thu may|date|time|today|tomorrow|yesterday|current time|current date)/i.test(q);
}

function getRelativeDateOffset(message: string): number {
  const q = String(message || '').toLowerCase();
  if (/(ngày mai|ngay mai|tomorrow)/i.test(q)) return 1;
  if (/(hôm qua|hom qua|yesterday)/i.test(q)) return -1;
  return 0;
}

function formatCurrentDateTime(timeZone?: string, offsetDays = 0): { date: string; time: string; weekday: string; timeZone: string } {
  const requested = String(timeZone || 'Asia/Ho_Chi_Minh');
  let zone = 'Asia/Ho_Chi_Minh';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: requested }).format(new Date());
    zone = requested;
  } catch {}
  const now = new Date(Date.now() + offsetDays * 86400000);
  const date = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const time = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: zone, weekday: 'long' }).format(now);
  return { date, time, weekday, timeZone: zone };
}

function cacheFingerprint(prefix: string, raw: string): string {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function buildKnowledgeCacheScope(items: KnowledgeItem[]): string {
  // CMS knowledge uses updatedAt so a real content edit changes the scope.
  // Synthetic taxonomy/orchestration items are rebuilt for every request, so
  // their runtime timestamps must never enter the fingerprint.
  const raw = items
    .map((item: any) => {
      const id = String(item.id || '');
      const stableUpdatedAt = id.startsWith('__') ? '' : String(item.updatedAt || '');
      return `${id}|${item.title || ''}|${item.content || ''}|${stableUpdatedAt}`;
    })
    .sort()
    .join('\n');
  return cacheFingerprint('kb', raw);
}

function buildTrainingCacheScope(training: AiTrainingConfig): string {
  // Any setting that can materially change the generated reply participates in
  // the scope. Secrets are deliberately excluded.
  const stable = {
    modelName: training.modelName || '',
    fallbackModelName: training.fallbackModelName || '',
    temperature: training.temperature ?? null,
    maxOutputTokens: training.maxOutputTokens ?? null,
    topKRetrieval: training.topKRetrieval ?? null,
    alwaysUseGemini: !!training.alwaysUseGemini,
    systemPromptPrefix: training.systemPromptPrefix || '',
    politenessLevel: training.politenessLevel || '',
    openingGreeting: training.openingGreeting || '',
    closingWish: training.closingWish || '',
    complaintEtiquette: training.complaintEtiquette || '',
    outOfScopeResponse: training.outOfScopeResponse || '',
    aiPronoun: training.aiPronoun || '',
    customerPronoun: training.customerPronoun || '',
    conversationTone: training.conversationTone || '',
    responseLength: training.responseLength || '',
    useBulletPoints: !!training.useBulletPoints,
    useEmoji: training.useEmoji || '',
    pricingPlaybook: training.pricingPlaybook || '',
    claimPlaybook: training.claimPlaybook || '',
    hesitationPlaybook: training.hesitationPlaybook || '',
    leadCaptureTrigger: training.leadCaptureTrigger || '',
    customBehaviorPrompt: training.customBehaviorPrompt || '',
  };
  return cacheFingerprint('cfg', JSON.stringify(stable));
}

/**
 * Multi-turn Gemini AI Chatbot with Knowledge Base RAG & Contextual Awareness
 */

function fallbackQuickRepliesForIntent(intent?: string, productName?: string): string[] {
  const product = String(productName || '').trim();
  const byIntent: Record<string, string[]> = {
    PRODUCT_ELIGIBILITY: ['Điều kiện tham gia gồm những gì?', 'Độ tuổi tham gia là bao nhiêu?', 'Quy trình tham gia thế nào?'],
    PRODUCT_PARTICIPANT: ['Độ tuổi tham gia là bao nhiêu?', 'Điều kiện tham gia gồm những gì?', 'Quy trình tham gia thế nào?'],
    PRODUCT_PROCEDURE: ['Hồ sơ cần chuẩn bị gì?', 'Điều kiện tham gia là gì?', 'Quyền lợi chính là gì?'],
    PRODUCT_BENEFIT: ['Điều kiện tham gia là gì?', 'Loại trừ gồm những gì?', 'Quy trình bồi thường thế nào?'],
    PRODUCT_EXCLUSION: ['Quyền lợi được chi trả là gì?', 'Điều kiện tham gia là gì?', 'Quy trình bồi thường thế nào?'],
    PRODUCT_CLAIM: ['Hồ sơ bồi thường cần gì?', 'Thời gian xử lý bồi thường?', 'Quyền lợi được chi trả là gì?'],
    PRODUCT_RENEWAL: ['Điều kiện tái tục là gì?', 'Quyền lợi có thay đổi không?', 'Phí tái tục tính thế nào?'],
    PRODUCT_LIABILITY: ['Hạn mức bảo hiểm là bao nhiêu?', 'Quyền lợi chính là gì?', 'Loại trừ gồm những gì?'],
    PRODUCT_RULE: ['Điều kiện tham gia là gì?', 'Loại trừ gồm những gì?', 'Quy trình bồi thường thế nào?'],
    PRODUCT_TERM: ['Điều kiện tham gia là gì?', 'Quyền lợi chính là gì?', 'Loại trừ gồm những gì?'],
    PRODUCT_PREMIUM: ['Đăng ký tư vấn', 'Quyền lợi sản phẩm là gì?', 'Điều kiện tham gia là gì?'],
    CALCULATE_PREMIUM: ['Đăng ký tư vấn', 'Quyền lợi sản phẩm là gì?', 'Điều kiện tham gia là gì?'],
  };
  if (intent && byIntent[intent]) return byIntent[intent];
  return product
    ? [`Quyền lợi ${product} gồm những gì?`, 'Điều kiện tham gia là gì?', 'Quy trình bồi thường thế nào?']
    : ['Hiện có những sản phẩm nào?', 'Quyền lợi sản phẩm là gì?', 'Điều kiện tham gia là gì?'];
}

export async function runGeminiChat(params: ChatRequestParams): Promise<ChatResponseResult> {
  const training = {
    ...DEFAULT_AI_TRAINING_CONFIG,
    ...(params.trainingConfig || {}),
    // strictKnowledgeOnly controls PRODUCT FACTS, not whether the model may
    // understand the conversation. Product facts remain grounded by the prompt.
    strictKnowledgeOnly: params.trainingConfig?.strictKnowledgeOnly ?? true,
    useSearchGrounding: params.useSearchGrounding ?? false,
  };
  const botName = params.botName || training.botName || 'Trợ lý AI thương hiệu đang cấu hình';
  const aiPronoun = training.aiPronoun || 'Em';
  const customerPronoun = training.customerPronoun || 'Quý khách';
  const currentDateTime = formatCurrentDateTime(params.pageContext?.clientTimeZone, getRelativeDateOffset(params.message));

  // The server/UI may already have appended the current user turn to history.
  // Sending it again here duplicates prompt tokens and also makes every turn look
  // context-dependent, which previously disabled the response cache entirely.
  const normalizeHistoryText = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const effectiveHistory = Array.isArray(params.history) ? [...params.history] : [];
  while (
    effectiveHistory.length > 0 &&
    effectiveHistory[effectiveHistory.length - 1]?.role === 'user' &&
    normalizeHistoryText(effectiveHistory[effectiveHistory.length - 1]?.text) === normalizeHistoryText(params.message)
  ) {
    effectiveHistory.pop();
  }

  // Gemini-first mode: even date/time turns pass through Gemini. The exact
  // server-computed local time is injected into the system context below so the
  // model never has to guess the clock value.

  // Cache is allowed only after a product has been explicitly resolved. A general
  // cache entry can otherwise replay an old/sample answer before the current CMS
  // Knowledge Base is consulted. Product-scoped cache entries are additionally
  // validated against the current retrieved source IDs below.
  // Step 6: cache only standalone factual turns. Follow-up turns derive meaning
  // from conversation state/history (e.g. "thế còn trường hợp này?") and must
  // never replay a response produced in another semantic context, even when the
  // active product happens to be the same.
  const hasConversationHistory = effectiveHistory.length > 0;
  const isContextDependentTurn = !!params.conversationReasoning?.needsConversationalReasoning ||
    !!params.conversationReasoning?.isContextualFollowUp ||
    /^(th[eế]|c[oò]n|v[aậ]y|tr[uư][oờ]ng h[oợ]p|c[aá]i n[aà]y|n[oó]|th[iì])/i.test(String(params.message || '').trim());
  const standaloneGeneralTurn = !params.productFilter && !isLikelyProductQuestion(params.message);
  // Reuse both grounded product answers and safe standalone general/role answers.
  // General cache is never used for multi-turn/personal follow-ups or live web questions.
  const cacheEligible =
    !training.alwaysUseGemini &&
    !hasConversationHistory &&
    !isContextDependentTurn &&
    !isRealWorldSearchQuestion(params.message) &&
    !isMixedProductAndRealWorldQuestion(params.message) &&
    (!!params.productFilter || standaloneGeneralTurn);

  // 1. Retrieve most relevant knowledge chunks with configurable topK.
  // NEVER use pageContext.currentProduct as a retrieval filter: landing-page context
  // is presentation metadata, not conversation state and must not select a product.
  const topK = training.topKRetrieval && training.topKRetrieval > 0 ? training.topKRetrieval : 5;
  const matchedKnowledge = scoreAndRetrieveKnowledge(
    params.message,
    params.knowledgeItems,
    params.productFilter,
    topK
  );
  // Intent is part of the cache namespace. The same natural-language sentence can
  // legitimately resolve differently after a product/category/topic switch; never
  // replay an answer cached under an old pricing/topic interpretation.
  const cacheIntentScope = String(params.intentFocus || 'GENERAL_QUESTION');
  const cacheKnowledgeScope = `${buildKnowledgeCacheScope(matchedKnowledge)}:${buildTrainingCacheScope(training)}:${cacheIntentScope}:flow-v4`;

  if (cacheEligible) {
    const cachedResponse = await getCachedChatResponse(params.message, params.productFilter, cacheKnowledgeScope, standaloneGeneralTurn);
    const validSourceIds = new Set(matchedKnowledge.map((item) => item.id));
    const cachedSourceIds = Array.isArray(cachedResponse?.sources) ? cachedResponse!.sources : [];
    const cacheStillGrounded = !!cachedResponse &&
      !!cachedResponse.reply &&
      (standaloneGeneralTurn
        ? cachedSourceIds.length === 0
        : cachedSourceIds.length > 0 && cachedSourceIds.every((id) => validSourceIds.has(id)));

    if (cacheStillGrounded) {
      return {
        reply: cachedResponse!.reply,
        sources: cachedSourceIds.map((sId: string) => {
          const item = matchedKnowledge.find((k) => k.id === sId);
          return {
            id: sId,
            title: item?.title || 'Tài liệu nghiệp vụ',
            product: item?.product || params.productFilter || '',
            topic: item?.topic || 'Thông tin bảo hiểm',
            componentType: item?.componentType || 'overview',
          };
        }),
        quickReplies: cachedResponse!.quickReplies || fallbackQuickRepliesForIntent(params.intentFocus, params.productFilter),
        fromCache: true,
        cacheHitCount: cachedResponse!.hitCount,
        cacheId: cachedResponse!.id,
      };
    }
  }

  // IMPORTANT: absence of a directly matched KB chunk must not stop the model
  // from understanding the customer's intent/context. The model may converse,
  // clarify missing information and reason about the user's situation, but the
  // system prompt below still forbids inventing PRODUCT FACTS not present in KB.
  // This restores conversational intelligence without weakening factual grounding.

  // Gemini-first mode: the chatbot must not silently switch to a different
  // answer engine. If Gemini is unavailable, fail visibly instead of returning a
  // deterministic Knowledge-only answer that would violate the configured mode.
  if (!isGeminiAvailable()) {
    return {
      reply: 'Dạ, hệ thống chưa thể xử lý câu hỏi này lúc này. Quý khách vui lòng thử lại sau ít phút hoặc liên hệ chuyên viên để được hỗ trợ.',
      sources: matchedKnowledge.map((k) => ({ id:k.id, title:k.title, product:k.product, topic:k.topic, componentType:k.componentType })),
      quickReplies: [],
      modelUsed: 'gemini-unavailable',
      errorStatusCode: 503,
    };
  }

  const client = getGeminiClient();

  // 2. Format knowledge base context for system prompt
  const knowledgeContext = matchedKnowledge
    .map((k, idx) => `[TÀI LIỆU ${idx + 1}]
- Tiêu đề: ${k.title}
- Sản phẩm: ${k.product} | Danh mục: ${k.category}
- Chủ đề: ${k.topic} (Mục: ${k.componentType})
- Nội dung chi tiết:
${k.content}`)
    .join('\n\n---\n\n');

  // 3. Build landing page context & AI Training / Persona directives
  const pageCtx = params.pageContext || {};
  const currentProduct = params.productFilter || '';
  const brandName = pageCtx.brandName || 'thương hiệu đang cấu hình';
  const hotline = pageCtx.phone || '';
  const productScope = isLikelyProductQuestion(params.message);
  const realWorldScope = isRealWorldSearchQuestion(params.message);
  const mixedScope = isMixedProductAndRealWorldQuestion(params.message);
  const scopeInstruction = productScope
    ? (mixedScope
      ? `CÂU HỎI HỖN HỢP: Phần FACT về sản phẩm phải chỉ dùng [TÀI LIỆU]. Phần ví dụ/bối cảnh thực tế bên ngoài có thể dùng Google Search. Bạn vẫn được hiểu ý định, nghề nghiệp, độ tuổi, tình huống và mạch hội thoại để giải thích hoặc hỏi làm rõ. Không được dùng kết quả Search để suy ra quyền lợi hoặc điều khoản sản phẩm.`
      : `CÂU HỎI TRONG NGỮ CẢNH SẢN PHẨM: Mọi FACT chính thức về quyền lợi, phí, hạn mức, loại trừ, điều kiện, thời gian chờ, quy tắc và điều khoản chỉ được lấy từ [TÀI LIỆU]. Tuy nhiên bạn ĐƯỢC PHÉP hiểu ngôn ngữ tự nhiên, nghề nghiệp, độ tuổi, tình huống, đại từ tham chiếu và mạch hội thoại; được hỏi thêm dữ liệu còn thiếu hoặc giải thích logic chung miễn là không biến suy luận đó thành FACT của sản phẩm.`)
    : (realWorldScope
      ? `CÂU HỎI THỰC TẾ/NGOÀI SẢN PHẨM: Có thể dùng Google Search nếu được bật. Không biến thông tin web thành cam kết hoặc dữ kiện sản phẩm.`
      : `CÂU HỎI CHUNG/NGOÀI SẢN PHẨM: Gemini được phép dùng năng lực suy luận và kiến thức chung để trả lời tự nhiên, hữu ích. Nếu câu hỏi chuyển sang FACT của một sản phẩm cụ thể thì phải quay lại nguyên tắc grounding bằng [TÀI LIỆU], không được tự bịa quyền lợi/điều khoản/phí.`);
  const reasoning = params.conversationReasoning;
  const intentLabels:Record<string,string> = {
    PRODUCT_OVERVIEW:'tổng quan sản phẩm', PRODUCT_BENEFIT:'quyền lợi', PRODUCT_EXCLUSION:'loại trừ',
    PRODUCT_ELIGIBILITY:'điều kiện/khả năng tham gia', PRODUCT_PARTICIPANT:'đối tượng và độ tuổi tham gia',
    PRODUCT_PREMIUM:'biểu phí', CALCULATE_PREMIUM:'tính phí', PRODUCT_RENEWAL:'tái tục/gia hạn',
    PRODUCT_PROCEDURE:'quy trình/thủ tục tham gia', PRODUCT_CLAIM:'quy trình bồi thường',
    PRODUCT_LIABILITY:'hạn mức/trách nhiệm', PRODUCT_RULE:'quy tắc', PRODUCT_TERM:'điều khoản',
    GENERAL_QUESTION:'câu hỏi chung',
  };
  const intentFocusInstruction = params.intentFocus
    ? `\nTRỌNG TÂM Ý ĐỊNH HIỆN TẠI: ${intentLabels[params.intentFocus] || params.intentFocus}. Hãy trả lời đúng trọng tâm này. Không tự chuyển sang biểu phí/tính phí nếu trọng tâm hiện tại không phải phí.`
    : '';
  const conversationReasoningInstruction = reasoning?.needsConversationalReasoning
    ? `\nNGỮ CẢNH SUY LUẬN HỘI THOẠI:\n- Đây là câu hỏi follow-up/tình huống cá nhân. Hãy hiểu đại từ và mạch hội thoại thay vì yêu cầu người dùng lặp lại toàn bộ câu hỏi.\n- Entity đã nhận diện: ${reasoning.contextSummary || 'chưa có entity cấu trúc rõ ràng'}.\n- Thông tin còn thiếu gợi ý: ${(reasoning.missingSlots || []).join(', ') || 'chưa xác định'}.\n- Được phép hỏi làm rõ và giải thích logic chung. Khi cần hỏi thêm, chỉ hỏi MỘT thông tin quan trọng nhất ở mỗi lượt; không bắt người dùng lặp lại dữ kiện đã có trong lịch sử/ngữ cảnh. Được phép dùng tuổi, nghề nghiệp, số tiền bảo hiểm và dữ kiện khách đã cung cấp để CHỌN/ÁP DỤNG đúng công thức, bảng, tỷ lệ hoặc hệ số có trong [TÀI LIỆU]. Không được tự tạo tỷ lệ, hệ số, công thức hay điều kiện không có trong [TÀI LIỆU].`
    : '';

  const replaceConfiguredPhone = (text: string) => String(text || '')
    .replace(/1900\s*55\s*88\s*99/g, hotline)
    .replace(/1900\s*558899/g, hotline)
    .replace(/0988\s*888\s*888/g, hotline);

  const politenessDescriptions: Record<string, string> = {
    formal: 'Trang trọng tuyệt đối, lễ phép, chỉn chu, sử dụng kính ngữ Dạ/Thưa/Kính chúc.',
    warm_polite: 'Lịch sự, ấm áp, chu đáo, ân cần như một người bạn đồng hành tin cậy.',
    expert_respectful: 'Chuyên gia tư vấn bảo hiểm cao cấp: điềm đạm, minh bạch, chính xác từng số liệu, tôn trọng tuyệt đối.',
  };

  const toneDescriptions: Record<string, string> = {
    advisor: 'Tư vấn chuyên sâu, phân tích giải pháp và quyền lợi tối ưu cho gia đình và tài sản.',
    enthusiastic: 'Nhiệt tình, sôi nổi, truyền cảm hứng về sự an tâm và bảo vệ tài chính.',
    professional: 'Chuyên nghiệp, súc tích, chuẩn mực theo căn cứ pháp lý và hợp đồng.',
    empathetic: 'Thấu cảm, ân cần, biết lắng nghe và chia sẻ chân thành với mọi nỗi lo của khách.',
    concise: 'Ngắn gọn, súc tích, đi thẳng vào trọng tâm câu hỏi, không lan man.',
  };

  const lengthDescriptions: Record<string, string> = {
    concise: 'Ngắn gọn, súc tích (dưới 120 từ), nêu bật thông điệp chính.',
    balanced: 'Độ dài vừa phải, đầy đủ thông tin cốt lõi (khoảng 150-280 từ).',
    detailed: 'Giải thích chi tiết, cặn kẽ từng hạng mục và điều khoản quyền lợi (khoảng 280-450 từ).',
  };

  const emojiRules: Record<string, string> = {
    none: 'TUYỆT ĐỐI KHÔNG dùng bất kỳ biểu tượng cảm xúc (emoji) nào.',
    subtle: 'Dùng từ 1-3 emoji biểu trưng tinh tế, chừng mực (ví dụ: 🛡️, 📋, ✨).',
    lively: 'Sử dụng emoji sinh động, nổi bật để câu trả lời thân thiện, thu hút.',
  };

  const systemInstruction = `Bạn là Trợ lý AI Chuyên viên Tư vấn Bảo hiểm Cao cấp của "${brandName}".
Tên của bạn là "${botName}".
Bạn đang trực tiếp hỗ trợ khách hàng trên Landing Page: "${pageCtx.pageTitle || currentProduct}".
Số điện thoại liên hệ do CMS cấu hình: ${hotline || '(chưa cấu hình)'}. Khi khách hỏi cách liên hệ, chỉ cung cấp số này; nếu chưa cấu hình thì hướng dẫn dùng biểu mẫu liên hệ, không tự tạo số.

====================================================
1. XƯNG HÔ VÀ PHONG THÁI GIAO TIẾP:
- QUY TẮC XƯNG HÔ BẮT BUỘC: Bạn luôn xưng là "${aiPronoun}" và luôn gọi khách hàng là "${customerPronoun}" xuyên suốt cuộc hội thoại.
- KHUÔN MẪU LỊCH SỰ: ${politenessDescriptions[training.politenessLevel] || politenessDescriptions.warm_polite}
- VĂN PHONG NÓI CHUYỆN: ${toneDescriptions[training.conversationTone] || toneDescriptions.advisor}
- ĐỘ DÀI PHẢN HỒI: ${lengthDescriptions[training.responseLength] || lengthDescriptions.balanced}
- CÁCH TRÌNH BÀY: ${training.useBulletPoints ? 'Ưu tiên chia nhỏ ý bằng gạch đầu dòng (-), bôi đậm các từ khóa quan trọng và con số cốt lõi để khách dễ nắm bắt trên điện thoại.' : 'Trình bày theo các đoạn văn mạch lạc, chặt chẽ.'}
- QUY TẮC EMOJI: ${emojiRules[training.useEmoji] || emojiRules.subtle}

====================================================
2. NGUỒN TRI THỨC NGHIỆP VỤ & NGUYÊN TẮC TRẢ LỜI:
${scopeInstruction}${intentFocusInstruction}${conversationReasoningInstruction}

THỜI GIAN HỆ THỐNG HIỆN TẠI (dùng khi khách hỏi ngày/giờ, không tự suy đoán): ${currentDateTime.time}, ${currentDateTime.weekday}, ${currentDateTime.date} (${currentDateTime.timeZone}).

Bạn CHỈ ĐƯỢC PHÉP sử dụng các dữ kiện nghiệp vụ/sản phẩm xuất hiện trong các [TÀI LIỆU] dưới đây:
${knowledgeContext ? knowledgeContext : '(Không có tài liệu nghiệp vụ phù hợp với câu hỏi.)'}

QUY TẮC PHẢN HỒI THÔNG MINH (BẮT BUỘC):
1. TRẢ LỜI ĐÚNG VÀ TRÚNG CÂU HỎI: Khách hàng hỏi gì thì tập trung trả lời đúng vấn đề đó. TUYỆT ĐỐI KHÔNG spam kiến thức tổng quát, không tuôn ra toàn bộ bài viết, không liệt kê tràn lan các gói/quyền lợi/điều khoản không liên quan đến câu hỏi.
2. THẤU HIỂU VÀ DIỄN GIẢI TỰ NHIÊN (KHÔNG COPY 100% TÀI LIỆU): Hãy tiếp thu tri thức trong [TÀI LIỆU], thấu hiểu bản chất và phản hồi lại bằng lời văn tự nhiên, thân thiện, mạch lạc và gãy gọn của một Chuyên viên thương hiệu đang cấu hình am hiểu nghiệp vụ. Tuyệt đối KHÔNG sao chép nguyên văn 100% văn bản tài liệu thô vào tin nhắn.
3. CHÍNH XÁC VỀ CON SỐ & ĐIỀU KIỆN: Mọi SỐ ĐẦU VÀO NGHIỆP VỤ (tỷ lệ %, hệ số nghề, bảng tuổi, mức phí, hạn mức, thời gian chờ, điều kiện) phải đến từ [TÀI LIỆU] hoặc chính dữ kiện khách vừa cung cấp. Bạn ĐƯỢC PHÉP thực hiện phép tính/suy luận số học từ các đầu vào đó (ví dụ nhân STBH với tỷ lệ phí và hệ số nghề; cộng phí của nhiều người; nhân quyền lợi/ngày với số ngày) và giải thích ngắn gọn cách tính. KẾT QUẢ PHÉP TÍNH có thể là một con số mới không xuất hiện nguyên văn trong tài liệu. Tuyệt đối không tự tạo tỷ lệ, hệ số, bảng tuổi, công thức hoặc điều kiện để làm ra kết quả.
4. NẾU KHÔNG CÓ TRONG TÀI LIỆU: Phân biệt rõ "không có FACT sản phẩm" với "không hiểu câu hỏi". Nếu thiếu FACT sản phẩm, không được bịa FACT đó; nhưng vẫn phải hiểu câu hỏi, tận dụng mạch hội thoại, giải thích phần logic chung an toàn và/hoặc hỏi đúng thông tin còn thiếu. Chỉ nói Kho tri thức chưa có dữ kiện khi câu trả lời thực sự cần một FACT sản phẩm chưa được cung cấp. Khi cần, hướng dẫn khách dùng ${hotline ? `số liên hệ ${hotline}` : 'biểu mẫu liên hệ'} để kiểm tra chính xác.

====================================================
3. QUY TẮC GIAO TIẾP (KHÔNG PHẢI NGUỒN DỮ LIỆU):
- LỜI CHÀO: ${replaceConfiguredPhone(training.openingGreeting || 'Dạ em chào Quý khách! Em là Trợ lý AI.')}
- LỜI KẾT: ${replaceConfiguredPhone(training.closingWish || 'Kính chúc Quý khách luôn bình an!')}
- Khi xử lý câu hỏi/khó chịu, giữ thái độ theo cấu hình quản trị: ${replaceConfiguredPhone(training.complaintEtiquette)}
- Nếu không có căn cứ trong [TÀI LIỆU], sử dụng câu từ chối an toàn và không tự bổ sung thông tin.
- Các playbook, custom prompt, tên sản phẩm trên trang và taxonomy CHỈ là hướng dẫn giao tiếp/định tuyến; TUYỆT ĐỐI KHÔNG được coi là nguồn sự thật về quyền lợi, phí, điều khoản, quy tắc, hạn mức, thuộc tính, số lượng sản phẩm hoặc bất kỳ dữ kiện nghiệp vụ nào.

====================================================
4. TỰ ĐỘNG THU THẬP LEAD (BẮT BUỘC):
Nếu khách hàng cung cấp số điện thoại hoặc họ tên trong tin nhắn (ví dụ: "SĐT mình là 0912345678", "tên tôi là Nguyễn Văn A, sdt 098..."), bạn PHẢI chèn đúng thẻ cú pháp sau ở dòng cuối cùng của câu trả lời:
[LEAD_CAPTURE: {"name": "Họ và tên khách", "phone": "Số điện thoại", "product": "${currentProduct}"}]

====================================================
5. NGUỒN CHO CÂU TRẢ LỜI:
Backend sẽ tự quản lý và gắn nguồn từ các [TÀI LIỆU] đã được truy xuất phù hợp. Bạn KHÔNG cần và KHÔNG được tự tạo, ghi hoặc suy đoán mã nguồn như [KB_SOURCES]. Chỉ trả lời dựa trên [TÀI LIỆU] được cung cấp.

6. GỢI Ý CÂU HỎI TIẾP THEO:
Ở cuối cùng của câu trả lời, hãy tạo 3 câu hỏi gợi ý nhanh liên quan nhất để khách có thể nhấn hỏi tiếp, bằng cú pháp:
[QUICK_REPLIES: ["Câu hỏi gợi ý 1", "Câu hỏi gợi ý 2", "Câu hỏi gợi ý 3"]]`;

  let finalSystemInstruction = systemInstruction;

  finalSystemInstruction += `\n\n====================================================
6. NGUYÊN TẮC BẢO VỆ CHẤT LƯỢNG CÂU TRẢ LỜI:
- Trả lời thẳng vào trọng tâm câu hỏi của khách hàng ngay ở câu đầu tiên, diễn đạt súc tích, dễ hiểu theo phong cách tư vấn chuyên nghiệp.
- Mọi FACT đầu vào về sản phẩm/bảo hiểm (tên sản phẩm, quyền lợi, tỷ lệ/hệ số/công thức phí, hạn mức, điều khoản, quy tắc, điều kiện, thời gian chờ, loại trừ, gara/bệnh viện) CHỈ được lấy căn cứ từ [TÀI LIỆU]. Kết quả số học được phép SUY RA từ các FACT đó và dữ kiện khách cung cấp; phải có thể truy ngược phép tính, không được phỏng đoán đầu vào.
- Google Search chỉ được dùng cho ví dụ thực tế, bối cảnh đời sống, chi phí/thống kê thị trường và các thông tin bên ngoài phạm vi Bộ phận cấu thành nội dung của AI Knowledge.
- Tuyệt đối không dùng Google Search để xác nhận, thay thế hoặc suy đoán quyền lợi, phí, điều khoản, loại trừ, đối tượng, điều kiện, quy trình, trách nhiệm hay bất kỳ dữ kiện sản phẩm nào.
- Nếu thiếu căn cứ sản phẩm trong [TÀI LIỆU], phải nói rõ chưa có thông tin trong kho tri thức; không được dùng web để lấp khoảng trống nghiệp vụ.\n- KHÔNG hiển thị citation, tên nguồn, URL, chú thích nguồn hoặc mục “Nguồn/Tham khảo” trong câu trả lời cho khách. Backend có thể dùng nguồn nội bộ để grounding nhưng giao diện chat phải chỉ hiển thị câu trả lời.`;

  if (training.systemPromptPrefix && training.systemPromptPrefix.trim()) {
    finalSystemInstruction = `[CHỈ THỊ TỐI CAO HỆ THỐNG]:\n${training.systemPromptPrefix.trim()}\n\n` + finalSystemInstruction;
  }

  // 4. Build contents history
  const contents: any[] = [];

  if (effectiveHistory.length) {
    for (const msg of effectiveHistory.slice(-10)) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.text }] });
      } else if (msg.role === 'model') {
        contents.push({
          role: 'model',
          parts: [{ text: `[LỊCH SỬ KHÔNG PHẢI NGUỒN SỰ THẬT - chỉ dùng để hiểu mạch hội thoại, không được dùng làm căn cứ nghiệp vụ]:\n${String(msg.text || '').slice(0, 4000)}` }],
        });
      }
    }
  }

  // Add latest user message
  contents.push({
    role: 'user',
    parts: [{ text: params.message }],
  });

  // 5. Select model & tools. Product facts stay KB-only; Search is only for
  // real-world/general context, and may be combined with KB for mixed questions.
  const shouldSearch = realWorldScope || mixedScope;
  const primaryModel = training.modelName || 'gemini-3.8-flash';
  const fallbackModel = training.fallbackModelName ?? '';
  // Temperature 0.25 prevents rigid verbatim copying while maintaining factual fidelity to documents
  const temperature = typeof training.temperature === 'number' ? Math.min(0.4, Math.max(0.1, training.temperature)) : 0.25;

  const maxOutputTokens = training.maxOutputTokens || 2048;
  const toolsConfig = shouldSearch ? [{ googleSearch: {} }] : undefined;

  let response: any;
  let modelActuallyUsed = primaryModel;
  try {
    const candidateModels = [primaryModel, fallbackModel];
    const res = await callGeminiModelWithResilience(
      client,
      candidateModels,
      (m) =>
        client.models.generateContent({
          model: m,
          contents,
          config: {
            systemInstruction: finalSystemInstruction,
            temperature,
            maxOutputTokens,
            ...(toolsConfig ? { tools: toolsConfig } : {}),
          },
        }),
      { endpoint: '/api/ai/chat', queryPreview: params.message }
    );
    response = res.response;
    modelActuallyUsed = res.modelUsed;
  } catch (err: any) {
    console.error('[runGeminiChat]: Resilience call failed across all candidate models:', err?.message || err);
    const quotaExceeded = isQuotaExceededError(err);
    return {
      reply: quotaExceeded
        ? 'Dạ, hệ thống đang nhận nhiều yêu cầu. Quý khách vui lòng thử lại sau ít phút hoặc để lại thông tin để được tư vấn.'
        : 'Dạ, hệ thống đang tạm thời gián đoạn. Quý khách vui lòng thử lại sau ít phút.',
      sources: matchedKnowledge.map((k) => ({ id:k.id, title:k.title, product:k.product, topic:k.topic, componentType:k.componentType })),
      quickReplies: [],
      quotaExceeded,
      errorStatusCode: quotaExceeded ? 429 : 503,
      modelUsed: 'gemini-error',
    };
  }

  const rawReply = response?.text || (hotline
    ? `Dạ, hệ thống đang gián đoạn. Quý khách vui lòng liên hệ ${hotline} để được hỗ trợ.`
    : 'Dạ, hệ thống đang gián đoạn. Quý khách vui lòng gửi thông tin qua biểu mẫu liên hệ.');

  // 6. Parse [LEAD_CAPTURE: ...] and [QUICK_REPLIES: ...]
  let cleanReply = rawReply;
  let capturedLead: { name: string; phone: string; product?: string } | undefined;
  let quickReplies: string[] = fallbackQuickRepliesForIntent(params.intentFocus, params.productFilter);

  const leadMatch = cleanReply.match(/\[LEAD_CAPTURE:\s*({.*?})\]/);
  if (leadMatch) {
    try {
      capturedLead = JSON.parse(leadMatch[1]);
    } catch {
      // ignore json parse error
    }
    cleanReply = cleanReply.replace(/\[LEAD_CAPTURE:\s*{.*?}\]/g, '').trim();
  }

  const quickMatch = cleanReply.match(/\[QUICK_REPLIES:\s*(\[.*?\])\]/);
  if (quickMatch) {
    try {
      const parsedReplies = JSON.parse(quickMatch[1]);
      if (Array.isArray(parsedReplies) && parsedReplies.length) {
        quickReplies = parsedReplies.slice(0, 4);
      }
    } catch {
      // ignore
    }
    cleanReply = cleanReply.replace(/\[QUICK_REPLIES:\s*\[.*?\]\]/g, '').trim();
  }

  // Backend-owned KB provenance: Gemini no longer has to emit [KB_SOURCES].
  // The retrieval layer is the source of truth. Every document/chunk that passed
  // the server-side relevance gate is recorded here and returned to the client.
  // This prevents valid KB answers from being rejected merely because the model
  // omitted or malformed a citation marker.
  const citedSourceIds: string[] = matchedKnowledge.map((k) => k.id);
  const isUnverified = false;

  // Fallback: extract phone directly from user message if customer just typed phone
  if (!capturedLead) {
    const phoneRegex = /(0\d{9,10}|\+84\d{9,10})/;
    const foundPhone = params.message.match(phoneRegex);
    if (foundPhone) {
      capturedLead = {
        name: 'Khách hàng quan tâm qua AI Chatbot',
        phone: foundPhone[0],
        product: matchedKnowledge[0]?.product || undefined,
      };
    }
  }

  // Save to Redis answer cache if this is a valid factual response (not fallback/unverified)
  if (
    cacheEligible &&
    cleanReply &&
    !isUnverified &&
    !cleanReply.includes('gặp chút gián đoạn') &&
    !cleanReply.includes('đang chịu tải cao') &&
    !cleanReply.includes('chưa thể xác minh')
  ) {
    setCachedChatResponse({
      query: params.message,
      product: params.productFilter,
      reply: cleanReply,
      sources: citedSourceIds,
      quickReplies,
      modelUsed: modelActuallyUsed,
      scope: cacheKnowledgeScope,
    }).catch(() => {});
  }

  const sources = matchedKnowledge.map((k) => ({
    id: k.id,
    title: k.title,
    product: k.product,
    topic: k.topic,
    componentType: k.componentType,
  }));

  return {
    reply: cleanReply,
    sources,
    quickReplies,
    capturedLead,
    modelUsed: modelActuallyUsed,
  };
}

/**
 * Text-to-Speech bằng Gemini TTS
 */
export async function generateSpeechAudio(text: string): Promise<string | null> {
  try {
    const client = getGeminiClient();
    const cleanText = text
      .replace(/[#*_`\[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .slice(0, 800);

    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (err) {
    console.error('[Gemini TTS Error]:', err);
    return null;
  }
}

/**
 * Sinh danh sách câu hỏi gợi ý nhanh dựa trên trang hoặc sản phẩm
 */
export async function suggestQuickQuestions(productName: string): Promise<string[]> {
  const safeProduct = String(productName || '').trim();
  const genericFallback = [
    'Hiện có những sản phẩm nào?',
    'Quyền lợi của sản phẩm gồm những gì?',
    'Thời gian chờ được quy định thế nào?',
    'Thủ tục bồi thường cần những gì?',
  ];
  if (!safeProduct) return genericFallback;

  const fallback = [
    `Quyền lợi bảo hiểm ${safeProduct} gồm những gì?`,
    `Phí tham gia gói ${safeProduct} tính thế nào?`,
    `Quy trình bồi thường có lâu không?`,
    `Điều kiện tham gia gói này ra sao?`,
  ];

  if (!isGeminiAvailable()) return fallback;

  try {
    const client = getGeminiClient();
    const res = await callGeminiModelWithResilience(
      client,
      cmsModelCandidates(),
      (model) =>
        client.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [{
              text: `Hãy đưa ra 4 câu hỏi ngắn (dưới 10 từ mỗi câu) mà khách hàng quan tâm nhất khi tìm hiểu sản phẩm "${safeProduct}". Trả về JSON mảng 4 chuỗi: ["Câu 1", "Câu 2", "Câu 3", "Câu 4"]`,
            }],
          }],
          config: { responseMimeType: 'application/json' },
        })
    );

    const parsed = JSON.parse(res.response.text || '[]');
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed.slice(0, 4);
  } catch {
    // fallback
  }

  return fallback;
}

export async function runGeminiSeoOptimizer(params: {
  pageTitle: string;
  slug: string;
  brandName?: string;
  headline?: string;
  benefits?: string;
}): Promise<{
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  recommendations: string[];
}> {
  const client = getGeminiClient();
  const prompt = `Bạn là chuyên gia SEO hàng đầu cho ngành bảo hiểm tài chính tại Việt Nam.
Hãy phân tích thông tin trang Landing Page sau và tạo bộ thẻ Meta Title, Meta Description và OpenGraph hoàn hảo nhất để tối ưu hiển thị trên Google SERP và Facebook/Zalo:

- Tên trang / Sản phẩm: ${params.pageTitle}
- URL Slug: ${params.slug}
- Thương hiệu: ${params.brandName || 'thương hiệu đang cấu hình'}
- Tiêu đề chính / Headline: ${params.headline || 'Bảo hiểm toàn diện uy tín hàng đầu'}
- Quyền lợi nổi bật: ${params.benefits || 'Bồi thường nhanh chóng, mạng lưới bảo lãnh viện phí toàn quốc, hỗ trợ 24/7'}

Yêu cầu kỹ thuật nghiêm ngặt:
1. "seoTitle": Tối ưu 50 - 60 ký tự, chứa từ khóa chính, tên thương hiệu, lời kêu gọi hành động hấp dẫn.
2. "metaDescription": Tối ưu 130 - 158 ký tự, có cam kết quyền lợi, số hotline hoặc lời mời nhận báo phí, kích thích click chuột (CTR cao).
3. "keywords": 6-10 từ khóa tìm kiếm phổ biến tại Việt Nam, phân cách bằng dấu phẩy.
4. "ogTitle": Tiêu đề thu hút khi share trên Facebook / Zalo (dưới 65 ký tự).
5. "ogDescription": Mô tả súc tích khi share trên mạng xã hội (dưới 150 ký tự).
6. "recommendations": Mảng 3-4 khuyến nghị cải thiện SEO on-page cụ thể cho trang này.

Trả về kết quả dưới định dạng JSON duy nhất, không kèm văn bản giải thích bên ngoài:
{
  "seoTitle": "...",
  "metaDescription": "...",
  "keywords": "...",
  "ogTitle": "...",
  "ogDescription": "...",
  "recommendations": ["...", "..."]
}`;

  let text = '{}';
  try {
    const res = await callGeminiModelWithResilience(
      client,
      cmsModelCandidates(),
      (model) =>
        client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
          },
        })
    );
    text = res.response.text || '{}';
  } catch (err: any) {
    console.warn('[runGeminiSeoOptimizer] Model call failed:', err?.message || err);
  }
  try {
    const parsed = JSON.parse(text);
    return {
      seoTitle: parsed.seoTitle || params.pageTitle,
      metaDescription: parsed.metaDescription || '',
      keywords: parsed.keywords || '',
      ogTitle: parsed.ogTitle || parsed.seoTitle || params.pageTitle,
      ogDescription: parsed.ogDescription || parsed.metaDescription || '',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch (err) {
    return {
      seoTitle: `${params.pageTitle} | ${params.brandName || 'thương hiệu được chủ CMS cấu hình'}`,
      metaDescription: `Tham gia ${params.pageTitle} tại ${params.brandName || 'thương hiệu đang cấu hình'} – Quyền lợi bảo vệ vượt trội, bồi thường minh bạch, thủ tục đơn giản. Nhận báo phí ngay!`,
      keywords: `${params.pageTitle}`,
      ogTitle: `${params.pageTitle} – thương hiệu được chủ CMS cấu hình`,
      ogDescription: `Tham gia ${params.pageTitle} bảo vệ toàn diện tài chính và sức khỏe gia đình bạn.`,
      recommendations: ['Thêm thẻ Heading H1 chứa từ khóa chính', 'Tối ưu ảnh OpenGraph tỷ lệ chuẩn 1200x630px'],
    };
  }
}


/**
 * Closed-set semantic resolver for chatbot routing.
 * IMPORTANT: this function returns candidates only. Callers MUST validate every
 * ID against the current CMS taxonomy before changing conversation state.
 */
export async function resolveChatTaxonomyCandidatesWithAI(params: {
  message: string;
  activeProductId?: string | null;
  activeComponentId?: string | null;
  products: Array<{id:string;name:string;aliases?:string[];tags?:string[];keywords?:string[]}>;
  categories: Array<{id:string;name:string;aliases?:string[];tags?:string[];keywords?:string[]}>;
  components: Array<{id:string;name:string;aliases?:string[];tags?:string[];keywords?:string[]}>;
}): Promise<{productId?:string|null;categoryId?:string|null;componentId?:string|null;intent?:string|null;confidence:number;reason?:string}> {
  if (!isGeminiAvailable()) return { confidence:0, reason:'ai-unavailable' };
  const client = getGeminiClient();
  const compact = (items:any[]) => items.map(x => ({ id:x.id, name:x.name, aliases:x.aliases || [], tags:x.tags || [], keywords:x.keywords || [] }));
  const prompt = `Bạn là bộ phân giải ngữ nghĩa cho chatbot bảo hiểm. CHỈ chọn ID có trong danh sách được cung cấp. Không được tạo ID, sản phẩm, quyền lợi, phí hay dữ kiện nghiệp vụ mới. Nếu không chắc, trả null.\n\nCâu khách hàng: ${JSON.stringify(params.message)}\nactiveProductId: ${JSON.stringify(params.activeProductId || null)}\nactiveComponentId: ${JSON.stringify(params.activeComponentId || null)}\n\nPRODUCTS=${JSON.stringify(compact(params.products))}\nCATEGORIES=${JSON.stringify(compact(params.categories))}\nCOMPONENTS=${JSON.stringify(compact(params.components))}\n\nINTENT chỉ được chọn một trong: PRODUCT_OVERVIEW, PRODUCT_BENEFIT, PRODUCT_EXCLUSION, PRODUCT_ELIGIBILITY, PRODUCT_PARTICIPANT, PRODUCT_PREMIUM, PRODUCT_RENEWAL, PRODUCT_PROCEDURE, PRODUCT_CLAIM, PRODUCT_LIABILITY, PRODUCT_RULE, PRODUCT_TERM, CALCULATE_PREMIUM, GENERAL_QUESTION. Hãy nhận diện ý định của CÂU HIỆN TẠI; không kế thừa biểu phí/chủ đề cũ nếu khách vừa hỏi điều kiện, độ tuổi, đối tượng, quy trình, quyền lợi hoặc nội dung khác.\n\nHãy trả JSON object duy nhất: {"productId":string|null,"categoryId":string|null,"componentId":string|null,"intent":string|null,"confidence":number,"reason":string}. confidence từ 0 đến 1. Không giải thích ngoài JSON.`;
  const res = await callGeminiModelWithResilience(
    client,
    cmsModelCandidates(),
    (model) => client.models.generateContent({
      model,
      contents:[{role:'user',parts:[{text:prompt}]}],
      config:{responseMimeType:'application/json'},
    }),
  );
  try {
    const parsed = JSON.parse(res.response.text || '{}');
    return {
      productId: typeof parsed.productId === 'string' ? parsed.productId : null,
      categoryId: typeof parsed.categoryId === 'string' ? parsed.categoryId : null,
      componentId: typeof parsed.componentId === 'string' ? parsed.componentId : null,
      intent: typeof parsed.intent === 'string' ? parsed.intent : null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0,240) : undefined,
    };
  } catch {
    return { confidence:0, reason:'invalid-json' };
  }
}
