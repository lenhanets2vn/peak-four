import crypto from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import { distributedCount } from './redisServer';
const production = process.env.NODE_ENV === 'production' || !!process.env.RENDER_SERVICE_ID;
const configuredOrigins = [process.env.APP_PUBLIC_URL, ...(process.env.CORS_ALLOWED_ORIGINS || '').split(',')].filter(Boolean).map(v => { try { return new URL(v!).origin; } catch { return ''; } }).filter(Boolean);
export function cookieValue(req: Request, name: string): string {
  const value = String(req.headers.cookie || '').split(';').find(v => v.trim().startsWith(`${name}=`));
  try { return value ? decodeURIComponent(value.trim().slice(name.length + 1)) : ''; } catch { return ''; }
}
const secret = process.env.SESSION_SECRET || (production ? '' : crypto.randomBytes(48).toString('hex'));
export function sessionSecretVersion(): string { return crypto.createHash('sha256').update(secret).digest('hex').slice(0,24); }
export function assertSecurityEnvironment() {
  if (production && (secret.length < 32 || !process.env.APP_PUBLIC_URL?.startsWith('https://') || !process.env.DATA_ENCRYPTION_KEY)) throw new Error('Cần SESSION_SECRET (ít nhất 32 ký tự), APP_PUBLIC_URL=https://... và DATA_ENCRYPTION_KEY (32 byte base64) trong backend.');
  encryptionKey();
  if(production && String(process.env.INTERNAL_BRIDGE_SECRET || '').length<32)throw new Error('INTERNAL_BRIDGE_SECRET cần ít nhất 32 ký tự.');
}
type JwtClaims = { jti: string; iss: string; aud: string; iat: number; exp: number; typ?: string; fid?: string };
function signJwt(claims: Record<string, unknown>): string {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${head}.${body}.${crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
}
function verifyJwt(token: string): JwtClaims | null {
  try {
    const [head, body, sig, extra] = token.split('.');
    if (extra || !head || !body || !sig || JSON.parse(Buffer.from(head,'base64url').toString()).alg !== 'HS256') return null;
    const expected = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest();
    const actual = Buffer.from(sig, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const claims = JSON.parse(Buffer.from(body,'base64url').toString()) as JwtClaims;
    if (claims.iss !== 'baoviet-cms' || claims.aud !== 'cms' || !claims.jti || claims.exp <= Date.now()/1000) return null;
    return claims;
  } catch { return null; }
}
// Legacy helper retained for tests/backward compatibility. New CMS auth uses
// signAccessSession()/verifyAccessSession() plus a rotating refresh-token family.
export function signSession(id: string, ttlMs: number): string {
  return signJwt({ jti: id, iss: 'baoviet-cms', aud: 'cms', iat: Math.floor(Date.now()/1000), exp: Math.floor((Date.now()+ttlMs)/1000) });
}
export function verifySession(token: string): string | null {
  const claims = verifyJwt(token);
  return claims && !claims.typ ? claims.jti : claims?.typ === 'access' ? claims.jti : null;
}
export function signAccessSession(id: string, familyId: string, ttlMs: number): string {
  return signJwt({ jti: id, fid: familyId, typ: 'access', iss: 'baoviet-cms', aud: 'cms', iat: Math.floor(Date.now()/1000), exp: Math.floor((Date.now()+ttlMs)/1000) });
}
export function verifyAccessSession(token: string): { sessionId: string; familyId: string; expiresAt: number } | null {
  const claims = verifyJwt(token);
  if (!claims || claims.typ !== 'access' || !claims.fid) return null;
  return { sessionId: claims.jti, familyId: claims.fid, expiresAt: claims.exp * 1000 };
}
export function createCsrfToken(): string { return crypto.randomBytes(32).toString('hex'); }
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, accessTtlMs: number, refreshTtlMs: number, csrfToken = createCsrfToken()) {
  res.cookie('bv_session', accessToken, { secure: production, sameSite: 'lax', path: '/', maxAge: accessTtlMs, httpOnly: true });
  res.cookie('bv_refresh', refreshToken, { secure: production, sameSite: 'strict', path: '/', maxAge: refreshTtlMs, httpOnly: true });
  res.cookie('bv_csrf', csrfToken, { secure: production, sameSite: 'lax', path: '/', maxAge: refreshTtlMs, httpOnly: false });
  return csrfToken;
}
export function setSessionCookies(res: Response, token: string, ttlMs: number) {
  // Compatibility helper used by legacy tests. It intentionally sets only the
  // access/session cookie; production login paths use setAuthCookies().
  const options = { secure: production, sameSite: 'lax' as const, path: '/', maxAge: ttlMs };
  res.cookie('bv_session', token, { ...options, httpOnly: true });
  res.cookie('bv_csrf', createCsrfToken(), { ...options, httpOnly: false });
}
export function clearSessionCookies(res: Response) {
  res.clearCookie('bv_session', { path: '/', secure: production, sameSite: 'lax', httpOnly: true });
  res.clearCookie('bv_refresh', { path: '/', secure: production, sameSite: 'strict', httpOnly: true });
  res.clearCookie('bv_csrf', { path: '/', secure: production, sameSite: 'lax' });
}
const sensitive = /^(apiKey|geminiApiKey|apiKeyMasked|masked|tokenMasked|botToken|accessToken|refreshToken|clientSecret|privateKey|private_key|password|passwordHash|passwordSalt|serviceAccount|serviceAccountJson|credentialJson|webhookUrl)$/i;
const knownSecrets = new Set<string>();
export function registerSecret(value: string | null | undefined) {if(value && value.length>=8 && knownSecrets.size<500)knownSecrets.add(value);}
for(const [key,value] of Object.entries(process.env)){if(/(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ACCOUNT_JSON|ENCRYPTION_KEY)$/.test(key))registerSecret(value);}
export function redactSecrets(value: any): any {
  if(typeof value==='string'){let safe=value;for(const secret of knownSecrets)safe=safe.split(secret).join('[hidden]');return safe;}
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.test(key)).map(([key,item]) => [key, redactSecrets(item)]));
}
function encryptionKey(): Buffer | null {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value) return null;
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY phải là 32 byte base64.');
  return key;
}
export function encodeStoredJson(value: unknown): string {
  const key = encryptionKey();
  if (!key) return JSON.stringify(value, null, 2);
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value),'utf8'), cipher.final()]);
  return JSON.stringify({ encrypted: 'aes-256-gcm-v1', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') });
}
export function decodeStoredJson(text: string): any {
  const value = JSON.parse(text);
  if (value?.encrypted !== 'aes-256-gcm-v1') return value; // Legacy data migrates on next write.
  const key = encryptionKey(); if (!key) throw new Error('Thiếu DATA_ENCRYPTION_KEY để đọc dữ liệu.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv,'base64'));
  decipher.setAuthTag(Buffer.from(value.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.payload,'base64')), decipher.final()]).toString('utf8'));
}
const counters = new Map<string, { count: number; expires: number }>();
export function localCount(key: string, windowMs: number): number {
  const now = Date.now();
  if (counters.size >= 20000) { for (const [k,v] of counters) if (v.expires <= now) counters.delete(k); }
  const entry = counters.get(key);
  if (entry && entry.expires > now) return ++entry.count;
  if (counters.size >= 20000) return Number.MAX_SAFE_INTEGER;
  counters.set(key, { count: 1, expires: now + windowMs }); return 1;
}
export function trustedClientIp(req: Request): string {return (process.env.ORIGIN_VERIFY_SECRET && req.get('x-origin-verify')===process.env.ORIGIN_VERIFY_SECRET ? req.get('x-waf-client-ip') : undefined) || req.ip || req.socket.remoteAddress || 'unknown';}
export function installSecurity(app: Express) {
  app.disable('x-powered-by');
  // Render gateway is on loopback. Set explicit CIDRs only for any additional trusted proxies.
  app.set('trust proxy', ['loopback', ...(process.env.TRUSTED_PROXY_CIDRS || '').split(',').filter(Boolean)]);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), geolocation=()');
    if (production) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const nonce=crypto.randomBytes(24).toString('base64');res.locals.cspNonce=nonce;
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'nonce-"+nonce+"'" + (production ? '' : " 'unsafe-inline'") + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; connect-src 'self'" + (production ? '' : ' ws: wss:') + "; frame-src https:; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
    const original = res.json.bind(res); res.json = ((body: any) => original(redactSecrets(body))) as any;
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control','no-store');
    if (production && !req.secure && !['/api/health','/health','/healthz'].includes(req.path)) return res.status(426).json({ error: 'Yêu cầu HTTPS.' });
    if (process.env.ORIGIN_VERIFY_SECRET && req.path.startsWith('/api/') && !['/api/health'].includes(req.path) && req.get('x-origin-verify') !== process.env.ORIGIN_VERIFY_SECRET) return res.status(403).json({ error: 'Nguồn truy cập không hợp lệ.' });
    next();
  });
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const mutation=['POST','PUT','PATCH','DELETE'].includes(req.method);
    if(!req.path.startsWith('/api/') && !mutation)return next();
    const origin = req.get('origin');
    const allowed = origin && (configuredOrigins.includes(origin) || (!production && origin === `${req.protocol}://${req.get('host')}`));
    if (origin && !allowed) return res.status(403).json({ error: 'Nguồn truy cập không được phép.' });
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin!); res.setHeader('Access-Control-Allow-Credentials','true'); res.vary('Origin');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, X-CSRF-Token'); res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
      if (req.get('sec-fetch-site') === 'cross-site' && !allowed) return res.status(403).json({ error:'Yêu cầu chéo trang bị từ chối.' });
      if (!/^application\/json(?:\s*;|$)/i.test(req.get('content-type') || '')) return res.status(415).json({ error: 'API chỉ nhận JSON.' });
      if ((cookieValue(req,'bv_session') || cookieValue(req,'bv_refresh')) && req.path !== '/api/auth/login') {
        const csrf = cookieValue(req,'bv_csrf');
        if (!csrf || csrf !== req.get('x-csrf-token')) return res.status(403).json({ error:'Mã CSRF không hợp lệ. Hãy tải lại trang.' });
      }
    }
    const scope = req.path === '/api/auth/login' ? 'login' : req.path === '/api/auth/refresh' ? 'refresh' : mutation && /^\/api\/ai\/(chat|tts|seo|config\/test)/.test(req.path) ? 'ai' : req.path === '/api/leads' && req.method === 'POST' ? 'lead' : 'api';
    const windowMs = scope === 'login' ? 900000 : 60000;
    const limit = scope === 'login' ? 12 : scope === 'refresh' ? 30 : scope === 'ai' ? 30 : scope === 'lead' ? 10 : 300;
    const id = trustedClientIp(req);
    // Always enforce local bounds as well as shared counters, including during Redis outages.
    const local = localCount(`${scope}:${id}`, windowMs);
    if (local > limit) { res.setHeader('Retry-After', Math.ceil(windowMs/1000)); return res.status(429).json({ error:'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }); }
    const shared = mutation ? await distributedCount(scope, id, windowMs) : null;
    if (shared !== null && shared > limit) { res.setHeader('Retry-After', Math.ceil(windowMs/1000)); return res.status(429).json({ error:'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }); }
    next();
  });
}
