const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const refreshSource = fs.readFileSync(path.join(root, 'src/services/authRefreshServer.ts'), 'utf8');
const securitySource = fs.readFileSync(path.join(root, 'src/services/securityServer.ts'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
const serverSource = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

test('auth contract: short access JWT + rotating HttpOnly refresh cookie', () => {
  assert.match(securitySource, /signAccessSession/);
  assert.match(securitySource, /bv_session[\s\S]*httpOnly:\s*true/);
  assert.match(securitySource, /bv_refresh[\s\S]*sameSite:\s*'strict'[\s\S]*httpOnly:\s*true/);
  assert.match(serverSource, /AUTH_ACCESS_TOKEN_MINUTES\s*\|\|\s*15/);
  assert.match(serverSource, /AUTH_REFRESH_TOKEN_HOURS\s*\|\|\s*8/);
});

test('auth contract: refresh token is hashed/stored server-side and reuse revokes family', () => {
  assert.match(refreshSource, /sha256/);
  assert.match(refreshSource, /status=='used'/);
  assert.match(refreshSource, /R:reuse/);
  assert.match(refreshSource, /status:\s*'reuse'/);
  assert.match(serverSource, /REFRESH_TOKEN_REUSE_DETECTED/);
  assert.match(serverSource, /revokeRefreshFamily/);
});

test('auth contract: browser refreshes once and logout revokes server token family', () => {
  assert.match(apiSource, /refreshInFlight/);
  assert.match(apiSource, /\/api\/auth\/refresh/);
  assert.match(apiSource, /\/api\/auth\/logout/);
  assert.match(serverSource, /revokeRefreshToken\(refreshToken,'logout'\)/);
  assert.match(serverSource, /clearSessionCookies\(res\)/);
});

test('behavior: RT1 rotates to RT2; reuse of RT1 revokes RT2 family', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-auth-'));
  for (const name of ['securityServer.ts','redisServer.ts','authRefreshServer.ts']) {
    let src = fs.readFileSync(path.join(root, 'src/services', name), 'utf8');
    src = src.replaceAll("'./redisServer'", "'./redisServer.ts'").replaceAll("'./securityServer'", "'./securityServer.ts'");
    fs.writeFileSync(path.join(tmp, name), src);
  }
  fs.writeFileSync(path.join(tmp, 'run.mjs'), `
process.env.SESSION_SECRET='s'.repeat(64);
process.env.DATA_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
process.env.AUTH_REFRESH_RACE_GRACE_MS='0';
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
const m=await import('./authRefreshServer.ts');
const created=await m.createRefreshTokenFamily({token:'sess',email:'admin@example.com'},'email:admin@example.com',60000,'fp1');
const first=await m.rotateRefreshToken(created.refreshToken,'fp1','fp2','csrf2');
if(first.status!=='rotated'||first.refreshToken===created.refreshToken) throw new Error('rotation failed');
const reuse=await m.rotateRefreshToken(created.refreshToken,'fp1','fp3','csrf3');
if(reuse.status!=='reuse') throw new Error('reuse was not detected: '+reuse.status);
const after=await m.rotateRefreshToken(first.refreshToken,'fp2','fp4','csrf4');
if(after.status!=='revoked') throw new Error('family was not revoked: '+after.status);
console.log('PASS');
`);
  const out = cp.execFileSync(process.execPath, ['--experimental-strip-types', path.join(tmp,'run.mjs')], {encoding:'utf8', env:{...process.env, NODE_NO_WARNINGS:'1'}});
  assert.match(out, /PASS/);
  fs.rmSync(tmp, {recursive:true, force:true});
});


test('behavior: concurrent retry within grace returns the same RT2, not a third token', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-auth-grace-'));
  for (const name of ['securityServer.ts','redisServer.ts','authRefreshServer.ts']) {
    let src = fs.readFileSync(path.join(root, 'src/services', name), 'utf8');
    src = src.replaceAll("'./redisServer'", "'./redisServer.ts'").replaceAll("'./securityServer'", "'./securityServer.ts'");
    fs.writeFileSync(path.join(tmp, name), src);
  }
  fs.writeFileSync(path.join(tmp, 'run.mjs'), `
process.env.SESSION_SECRET='s'.repeat(64);
process.env.DATA_ENCRYPTION_KEY=Buffer.alloc(32,10).toString('base64');
process.env.AUTH_REFRESH_RACE_GRACE_MS='4000';
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
const m=await import('./authRefreshServer.ts');
const created=await m.createRefreshTokenFamily({token:'sess2',email:'admin@example.com'},'email:admin@example.com',60000,'fp1');
const first=await m.rotateRefreshToken(created.refreshToken,'fp1','fp2','csrf2');
const retry=await m.rotateRefreshToken(created.refreshToken,'fp1','unused','unused-csrf');
if(first.status!=='rotated'||retry.status!=='rotated'||!retry.recovered) throw new Error('grace recovery failed');
if(first.refreshToken!==retry.refreshToken||first.csrfToken!==retry.csrfToken) throw new Error('retry minted a different replacement');
console.log('PASS');
`);
  const out = cp.execFileSync(process.execPath, ['--experimental-strip-types', path.join(tmp,'run.mjs')], {encoding:'utf8', env:{...process.env, NODE_NO_WARNINGS:'1'}});
  assert.match(out, /PASS/);
  fs.rmSync(tmp, {recursive:true, force:true});
});
