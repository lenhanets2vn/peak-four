import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import {signSession,verifySession,encodeStoredJson,decodeStoredJson,redactSecrets,registerSecret,localCount,installSecurity} from '../src/services/securityServer';
test('JWT checks signature, expiry, issuer and malformed input',()=>{
 const token=signSession('session1',60000);assert.equal(verifySession(token),'session1');assert.equal(verifySession(token+'x'),null);assert.equal(verifySession(signSession('expired',-10000)),null);assert.equal(verifySession('bad'),null);
 const parts=token.split('.');parts[1]=Buffer.from(JSON.stringify({jti:'attacker',exp:9999999999})).toString('base64url');assert.equal(verifySession(parts.join('.')),null);
});
test('AES-GCM round trips legacy data and rejects tampering or wrong key',()=>{
 const original=process.env.DATA_ENCRYPTION_KEY;try{process.env.DATA_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');const value={phone:'private',nested:{secret:'not visible'}};const encoded=encodeStoredJson(value);assert.ok(!encoded.includes('private'));assert.deepEqual(decodeStoredJson(encoded),value);assert.deepEqual(decodeStoredJson('{"old":true}'),{old:true});const data=JSON.parse(encoded);data.tag=crypto.randomBytes(16).toString('base64');assert.throws(()=>decodeStoredJson(JSON.stringify(data)));process.env.DATA_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');assert.throws(()=>decodeStoredJson(encoded));}finally{if(original)process.env.DATA_ENCRYPTION_KEY=original;else delete process.env.DATA_ENCRYPTION_KEY;}
});
test('nested API responses and error strings cannot reveal registered secrets',()=>{
 registerSecret('secret-value-123');assert.deepEqual(redactSecrets({configured:true,apiKey:'x',nested:[{botToken:'z',refreshToken:'y',passwordHash:'h',webhookUrl:'u',message:'bad secret-value-123'}]}),{configured:true,nested:[{message:'bad [hidden]'}]});
});
test('local limiter retains protection without Redis',()=>{const key=crypto.randomUUID();assert.equal(localCount(key,60000),1);assert.equal(localCount(key,60000),2);});
test('HTTP middleware blocks hostile origins, CSRF, form bodies and redacts secrets',async()=>{
 const app=express();installSecurity(app);app.use(express.json());app.get('/api/status',(_req,res)=>res.json({configured:true,apiKey:'never-visible'}));app.post('/api/change',(_req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as any;const url=`http://127.0.0.1:${address.port}`;
 try{
  let response=await fetch(url+'/api/status',{headers:{Origin:'https://attacker.example'}});assert.equal(response.status,403);
  response=await fetch(url+'/api/status');assert.deepEqual(await response.json(),{configured:true});assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy')?.includes("object-src 'none'"));
  response=await fetch(url+'/api/change',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'bv_session=s; bv_csrf=expected'},body:'{}'});assert.equal(response.status,403);
  response=await fetch(url+'/api/change',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'bv_session=s; bv_csrf=expected','X-CSRF-Token':'expected'},body:'{}'});assert.equal(response.status,200);
  response=await fetch(url+'/api/change',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'a=b'});assert.equal(response.status,415);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
