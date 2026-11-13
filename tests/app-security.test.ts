import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import {spawn,ChildProcess} from 'node:child_process';

test('full CMS: login cookies, bypass blocked, secret status, RBAC, logout and restart persistence',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cms-security-'));const salt=crypto.randomBytes(16).toString('hex');const password='Test-Only-Password-925';const digest=crypto.scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
 fs.writeFileSync(path.join(directory,'admin_users.json'),JSON.stringify([{id:'test-admin',username:'testadmin',displayName:'Test Admin',role:'superadmin',enabled:true,passwordSalt:salt,passwordHash:'scrypt-v2:'+digest,createdAt:new Date().toISOString()},{id:'test-viewer',username:'testviewer',displayName:'Viewer',role:'viewer',enabled:true,passwordSalt:salt,passwordHash:'scrypt-v2:'+digest,createdAt:new Date().toISOString()}]));
 const socket=net.createServer();await new Promise<void>(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=(socket.address() as net.AddressInfo).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));const base=`http://127.0.0.1:${port}`;let child:ChildProcess;let output='';
 const env={...process.env,NODE_ENV:'development',PORT:String(port),APP_PORT:'',DATA_DIR:directory,LKG_DIR:path.join(directory,'lkg'),DATA_ENCRYPTION_KEY:crypto.randomBytes(32).toString('base64'),SESSION_SECRET:crypto.randomBytes(48).toString('base64'),APP_PUBLIC_URL:base,CMS_ALLOW_DEV_BYPASS:'false',GEMINI_API_KEY:'',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:'',FIREBASE_SERVICE_ACCOUNT_JSON:'',FIREBASE_PROJECT_ID:''};
 const start=async()=>{child=spawn(process.execPath,['--import','tsx','server.ts'],{env,stdio:['ignore','pipe','pipe']});child.stdout?.on('data',value=>{output+=value.toString();});child.stderr?.on('data',value=>{output+=value.toString();});for(let attempt=0;attempt<100;attempt++){try{const response=await fetch(base+'/api/health');if(response.ok)return;}catch{}if(child.exitCode!==null)throw new Error('Server exited: '+output.slice(-2000));await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Server did not become ready: '+output.slice(-2000));};
 const stop=async()=>{if(child && child.exitCode===null){const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGTERM');await exited;}};
 const login=async(username='testadmin')=>{const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(response.status,200);const data:any=await response.json();assert.equal(data.token,'cookie-session');const cookies=response.headers.getSetCookie();assert.ok(cookies.find(value=>value.startsWith('bv_session='))?.includes('HttpOnly'));const cookie=cookies.map(value=>value.split(';')[0]).join('; ');const csrf=cookies.find(value=>value.startsWith('bv_csrf='))!.split(';')[0].slice(8);return {cookie,headers:{Cookie:cookie,'X-CSRF-Token':decodeURIComponent(csrf),'Content-Type':'application/json'}};};
 try{
  await start();let response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quickAdmin:true})});assert.equal(response.status,403);
  response=await fetch(base+'/api/firebase/config');const firebase:any=await response.json();assert.ok(!JSON.stringify(firebase).includes('"apiKey"'));
  response=await fetch(base+'/api/ai/chat/session-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'visitor-private',messages:[{role:'user',text:'Private visitor message'}]})});assert.equal(response.status,200);const visitorCookie=response.headers.getSetCookie().find(cookie=>cookie.startsWith('bv_visitor='))!.split(';')[0];
  response=await fetch(base+'/api/ai/chat/sessions/visitor-private/sync');assert.equal(response.status,403);
  response=await fetch(base+'/api/ai/chat/sessions/visitor-private/sync',{headers:{Cookie:visitorCookie}});assert.equal(response.status,200);
  const auth=await login();response=await fetch(base+'/api/config',{headers:auth.headers});assert.equal(response.status,200);const config:any=await response.json();config.brandName='Saved security regression brand';
  response=await fetch(base+'/api/config',{method:'POST',headers:{Cookie:auth.cookie,'Content-Type':'application/json'},body:JSON.stringify(config)});assert.equal(response.status,403);
  response=await fetch(base+'/api/config',{method:'POST',headers:auth.headers,body:JSON.stringify(config)});assert.equal(response.status,200);
  const saved:any=await (await fetch(base+'/api/config',{headers:auth.headers})).json();assert.equal(saved.brandName,config.brandName);assert.ok(!fs.readFileSync(path.join(directory,'pages.json'),'utf8').includes(config.brandName));
  response=await fetch(base+'/api/ai/config/gemini-key?reveal=true',{headers:auth.headers});const info:any=await response.json();assert.ok(!('apiKey' in info));assert.ok(!('masked' in info));
  const viewer=await login('testviewer');response=await fetch(base+'/api/config',{method:'POST',headers:viewer.headers,body:JSON.stringify(config)});assert.equal(response.status,403);
  await stop();await start();response=await fetch(base+'/api/auth/me',{headers:auth.headers});assert.equal(response.status,401);const renewed=await login();const restored:any=await (await fetch(base+'/api/config',{headers:renewed.headers})).json();assert.equal(restored.brandName,config.brandName);
  response=await fetch(base+'/api/auth/logout',{method:'POST',headers:renewed.headers});assert.equal(response.status,200);response=await fetch(base+'/api/auth/me',{headers:renewed.headers});assert.equal(response.status,401);
 }finally{await stop();fs.rmSync(directory,{recursive:true,force:true});}
});
