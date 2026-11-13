import crypto from 'node:crypto';
import { decodeStoredJson, encodeStoredJson } from './securityServer';
import { redisCommand, redisKey, redisStatus } from './redisServer';

const TOKEN_PREFIX = 'bv_rt_';
const ROTATION_GRACE_MS = Math.max(0, Math.min(15000, Number(process.env.AUTH_REFRESH_RACE_GRACE_MS || 4000)));

type LocalToken = { status: 'active'|'used'; familyId: string; expiresAt: number; fingerprint: string; usedAt?: number; replacement?: { refreshToken: string; csrfToken: string } };
type LocalFamily = { state: 'active'|'revoked'; expiresAt: number; reason?: string };
const localTokens = new Map<string, LocalToken>();
const localFamilies = new Map<string, LocalFamily>();
const localSessions = new Map<string, string>();
const localPrincipalFamilies = new Map<string, Set<string>>();

function digest(value: string): string { return crypto.createHash('sha256').update(value).digest('hex'); }
function tokenKey(token: string): string { return redisKey('auth-refresh-token-v1', digest(token)); }
function familyKey(familyId: string): string { return redisKey('auth-refresh-family-v1', familyId); }
function sessionKey(familyId: string): string { return redisKey('auth-refresh-session-v1', familyId); }
function principalKey(principal: string): string { return redisKey('auth-refresh-principal-v1', principal); }
function localTokenKey(token: string): string { return digest(token); }
function newSecret(): string { return crypto.randomBytes(48).toString('base64url'); }
function newFamilyId(): string { return crypto.randomBytes(24).toString('base64url'); }
function buildRefreshToken(familyId: string): string { return `${TOKEN_PREFIX}${familyId}.${newSecret()}`; }

export function refreshTokenFamilyId(token: string): string | null {
  const value = String(token || '');
  if (!value.startsWith(TOKEN_PREFIX)) return null;
  const body = value.slice(TOKEN_PREFIX.length);
  const dot = body.indexOf('.');
  if (dot < 16) return null;
  const familyId = body.slice(0, dot);
  const secret = body.slice(dot + 1);
  return /^[A-Za-z0-9_-]{20,80}$/.test(familyId) && /^[A-Za-z0-9_-]{40,160}$/.test(secret) ? familyId : null;
}

function cleanupLocal(now = Date.now()) {
  for (const [key, value] of localTokens) if (value.expiresAt <= now) localTokens.delete(key);
  for (const [key, value] of localFamilies) if (value.expiresAt <= now) { localFamilies.delete(key); localSessions.delete(key); }
  for (const [key, families] of localPrincipalFamilies) {
    for (const familyId of families) if (!localFamilies.has(familyId)) families.delete(familyId);
    if (!families.size) localPrincipalFamilies.delete(key);
  }
}

function useRedis(): boolean { return redisStatus().configured; }

export type RefreshCreateResult = { refreshToken: string; familyId: string; expiresAt: number; backend: 'redis'|'local' };
export async function createRefreshTokenFamily(session: unknown, principal: string, ttlMs: number, fingerprint: string): Promise<RefreshCreateResult> {
  const now = Date.now();
  const expiresAt = now + ttlMs;
  const familyId = newFamilyId();
  const refreshToken = buildRefreshToken(familyId);
  const encodedSession = encodeStoredJson(session);
  if (useRedis()) {
    const script = [
      "redis.call('SET',KEYS[1],'A','PX',ARGV[1])",
      "redis.call('SET',KEYS[2],ARGV[2],'PX',ARGV[1])",
      "redis.call('HSET',KEYS[3],'status','active','fingerprint',ARGV[3],'expiresAt',ARGV[4])",
      "redis.call('PEXPIRE',KEYS[3],ARGV[1])",
      "redis.call('SADD',KEYS[4],KEYS[1])",
      "redis.call('PEXPIRE',KEYS[4],ARGV[1])",
      'return 1',
    ].join('; ');
    await redisCommand(['EVAL', script, 4, familyKey(familyId), sessionKey(familyId), tokenKey(refreshToken), principalKey(principal), ttlMs, encodedSession, fingerprint, expiresAt]);
    return { refreshToken, familyId, expiresAt, backend: 'redis' };
  }
  cleanupLocal(now);
  localFamilies.set(familyId, { state: 'active', expiresAt });
  localSessions.set(familyId, encodedSession);
  localTokens.set(localTokenKey(refreshToken), { status: 'active', familyId, expiresAt, fingerprint });
  if (!localPrincipalFamilies.has(principal)) localPrincipalFamilies.set(principal, new Set());
  localPrincipalFamilies.get(principal)!.add(familyId);
  return { refreshToken, familyId, expiresAt, backend: 'local' };
}

export type RefreshRotateResult =
  | { status: 'rotated'; refreshToken: string; csrfToken: string; familyId: string; session: any; expiresAt: number; recovered?: boolean }
  | { status: 'reuse'|'revoked'|'invalid'|'expired'|'unavailable'; familyId?: string };

export async function rotateRefreshToken(refreshToken: string, presentedFingerprint: string, nextFingerprint: string, nextCsrfToken: string): Promise<RefreshRotateResult> {
  const familyId = refreshTokenFamilyId(refreshToken);
  if (!familyId) return { status: 'invalid' };
  const nextToken = buildRefreshToken(familyId);
  const now = Date.now();
  const replacementEnvelope = encodeStoredJson({ refreshToken: nextToken, csrfToken: nextCsrfToken });
  if (useRedis()) {
    const script = [
      "local status=redis.call('HGET',KEYS[1],'status')",
      "if not status then return {'invalid'} end",
      "local storedFp=redis.call('HGET',KEYS[1],'fingerprint') or ''",
      "local usedAt=tonumber(redis.call('HGET',KEYS[1],'usedAt') or '0')",
      "local ttl=redis.call('PTTL',KEYS[3])",
      "if ttl<=0 then return {'expired'} end",
      "local familyState=redis.call('GET',KEYS[3])",
      "if familyState~='A' then return {'revoked'} end",
      "if status=='used' then",
      "  if tonumber(ARGV[4])>0 and storedFp==ARGV[1] and usedAt>0 and (tonumber(ARGV[3])-usedAt)<=tonumber(ARGV[4]) then local payload=redis.call('GET',KEYS[4]); local replacement=redis.call('HGET',KEYS[1],'replacement'); if payload and replacement then return {'recovered',payload,replacement,tostring(ttl)} end end",
      "  redis.call('SET',KEYS[3],'R:reuse','PX',ttl)",
      "  return {'reuse'}",
      "end",
      "if status~='active' then return {'invalid'} end",
      "if storedFp~=ARGV[1] then redis.call('SET',KEYS[3],'R:fingerprint','PX',ttl); return {'reuse'} end",
      "local payload=redis.call('GET',KEYS[4])",
      "if not payload then redis.call('SET',KEYS[3],'R:session-missing','PX',ttl); return {'invalid'} end",
      "redis.call('HSET',KEYS[1],'status','used','usedAt',ARGV[3],'replacement',ARGV[5])",
      "redis.call('PEXPIRE',KEYS[1],ttl)",
      "redis.call('HSET',KEYS[2],'status','active','fingerprint',ARGV[2],'expiresAt',tostring(tonumber(ARGV[3])+ttl))",
      "redis.call('PEXPIRE',KEYS[2],ttl)",
      "return {'rotated',payload,tostring(ttl)}",
    ].join('; ');
    try {
      const result = await redisCommand(['EVAL', script, 4, tokenKey(refreshToken), tokenKey(nextToken), familyKey(familyId), sessionKey(familyId), presentedFingerprint, nextFingerprint, now, ROTATION_GRACE_MS, replacementEnvelope]);
      const status = Array.isArray(result) ? String(result[0] || '') : String(result || '');
      if (status === 'rotated') {
        const session = decodeStoredJson(String(result[1] || ''));
        const ttl = Math.max(1, Number(result[2] || 1));
        return { status: 'rotated', refreshToken: nextToken, csrfToken: nextCsrfToken, familyId, session, expiresAt: now + ttl };
      }
      if (status === 'recovered') {
        const session = decodeStoredJson(String(result[1] || ''));
        const replacement = decodeStoredJson(String(result[2] || ''));
        const ttl = Math.max(1, Number(result[3] || 1));
        if (!replacement?.refreshToken || !replacement?.csrfToken) return { status: 'invalid', familyId };
        return { status: 'rotated', refreshToken: String(replacement.refreshToken), csrfToken: String(replacement.csrfToken), familyId, session, expiresAt: now + ttl, recovered: true };
      }
      if (['reuse','revoked','invalid','expired'].includes(status)) return { status: status as any, familyId };
      return { status: 'unavailable', familyId };
    } catch {
      return { status: 'unavailable', familyId };
    }
  }

  cleanupLocal(now);
  const family = localFamilies.get(familyId);
  const key = localTokenKey(refreshToken);
  const record = localTokens.get(key);
  if (!record) return { status: 'invalid', familyId };
  if (!family || family.expiresAt <= now) return { status: 'expired', familyId };
  if (family.state !== 'active') return { status: 'revoked', familyId };
  if (record.status === 'used') {
    if (ROTATION_GRACE_MS > 0 && record.fingerprint === presentedFingerprint && record.usedAt && now - record.usedAt <= ROTATION_GRACE_MS && record.replacement) { const encoded=localSessions.get(familyId); if(encoded)return { status:'rotated',refreshToken:record.replacement.refreshToken,csrfToken:record.replacement.csrfToken,familyId,session:decodeStoredJson(encoded),expiresAt:family.expiresAt,recovered:true }; }
    family.state = 'revoked'; family.reason = 'reuse'; return { status: 'reuse', familyId };
  }
  if (record.fingerprint !== presentedFingerprint) { family.state = 'revoked'; family.reason = 'fingerprint'; return { status: 'reuse', familyId }; }
  const encoded = localSessions.get(familyId);
  if (!encoded) { family.state = 'revoked'; family.reason = 'session-missing'; return { status: 'invalid', familyId }; }
  record.status = 'used'; record.usedAt = now; record.replacement = { refreshToken: nextToken, csrfToken: nextCsrfToken };
  localTokens.set(localTokenKey(nextToken), { status: 'active', familyId, expiresAt: family.expiresAt, fingerprint: nextFingerprint });
  return { status: 'rotated', refreshToken: nextToken, csrfToken: nextCsrfToken, familyId, session: decodeStoredJson(encoded), expiresAt: family.expiresAt };
}

export async function readRefreshFamilySession(familyId: string): Promise<any | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(familyId || ''))) return null;
  if (useRedis()) {
    const script = "if redis.call('GET',KEYS[1])~='A' then return nil end; return redis.call('GET',KEYS[2])";
    try {
      const value = await redisCommand(['EVAL', script, 2, familyKey(familyId), sessionKey(familyId)]);
      return value ? decodeStoredJson(String(value)) : null;
    } catch { return null; }
  }
  cleanupLocal();
  const family = localFamilies.get(familyId);
  const value = family?.state === 'active' ? localSessions.get(familyId) : null;
  return value ? decodeStoredJson(value) : null;
}

export async function updateRefreshFamilySession(familyId: string, session: unknown): Promise<boolean> {
  if (!familyId) return false;
  const encoded = encodeStoredJson(session);
  if (useRedis()) {
    const script = "if redis.call('GET',KEYS[1])~='A' then return 0 end; local ttl=redis.call('PTTL',KEYS[1]); if ttl<=0 then return 0 end; redis.call('SET',KEYS[2],ARGV[1],'PX',ttl); return 1";
    try { return Number(await redisCommand(['EVAL', script, 2, familyKey(familyId), sessionKey(familyId), encoded])) === 1; } catch { return false; }
  }
  cleanupLocal();
  const family = localFamilies.get(familyId);
  if (!family || family.state !== 'active') return false;
  localSessions.set(familyId, encoded); return true;
}

export async function revokeRefreshFamily(familyId: string, reason = 'logout'): Promise<boolean> {
  if (!familyId) return false;
  if (useRedis()) {
    const script = "local ttl=redis.call('PTTL',KEYS[1]); if ttl<=0 then return 0 end; redis.call('SET',KEYS[1],ARGV[1],'PX',ttl); return 1";
    try { return Number(await redisCommand(['EVAL', script, 1, familyKey(familyId), `R:${reason}`])) === 1; } catch { return false; }
  }
  cleanupLocal();
  const family = localFamilies.get(familyId); if (!family) return false;
  family.state = 'revoked'; family.reason = reason; return true;
}

export async function revokeRefreshToken(refreshToken: string, reason = 'logout'): Promise<{ familyId?: string; revoked: boolean }> {
  const familyId = refreshTokenFamilyId(refreshToken) || undefined;
  return { familyId, revoked: familyId ? await revokeRefreshFamily(familyId, reason) : false };
}

export async function revokePrincipalRefreshFamilies(principal: string, reason = 'account-change'): Promise<number> {
  if (!principal) return 0;
  if (useRedis()) {
    const script = [
      "local families=redis.call('SMEMBERS',KEYS[1])",
      'local changed=0',
      'for _,key in ipairs(families) do',
      " local ttl=redis.call('PTTL',key)",
      " if ttl>0 then redis.call('SET',key,ARGV[1],'PX',ttl); changed=changed+1 end",
      'end',
      'return changed',
    ].join('; ');
    try { return Number(await redisCommand(['EVAL', script, 1, principalKey(principal), `R:${reason}`])) || 0; } catch { return 0; }
  }
  cleanupLocal();
  let count = 0;
  for (const familyId of localPrincipalFamilies.get(principal) || []) {
    const family = localFamilies.get(familyId);
    if (family && family.state === 'active') { family.state = 'revoked'; family.reason = reason; count++; }
  }
  return count;
}

export function authRefreshStatus() {
  return { backend: useRedis() ? 'redis' : 'local', rotation: true, singleUse: true, reuseDetection: true, raceGraceMs: ROTATION_GRACE_MS };
}
