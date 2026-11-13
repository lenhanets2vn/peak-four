import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='server-secret-token';
const redis=await import('../src/services/redisServer');
test('Redis REST uses backend auth, bounded TTL, hashed rate keys and Lua expiry',async()=>{
 const original=globalThis.fetch;const commands:any[]=[];const previousKey=process.env.DATA_ENCRYPTION_KEY;process.env.DATA_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');
 globalThis.fetch=async(_url,options)=>{assert.equal((options?.headers as any).Authorization,'Bearer server-secret-token');const command=JSON.parse(String(options?.body));commands.push(command);return new Response(JSON.stringify({result:command[0]==='GET'?JSON.stringify([{queryNormalized:'safe',response:'answer'}]):command[0]==='EVAL'?2:'OK'}));};
 try{assert.equal((await redis.readAnswerCache()).length,1);await redis.writeAnswerCache([{queryNormalized:'safe'}]);assert.equal(await redis.distributedCount('login','private-ip',60000),2);assert.ok(commands[1].includes('EX'));assert.ok(commands[1][2].includes('aes-256-gcm-v1'));assert.ok(!commands[1][2].includes('queryNormalized'));assert.equal(commands[1].at(-1),86400);assert.equal(commands[2][0],'EVAL');assert.ok(!commands[2][3].includes('private-ip'));assert.ok(redis.redisStatus().available);assert.ok(!JSON.stringify(redis.redisStatus()).includes('server-secret-token'));}finally{globalThis.fetch=original;if(previousKey)process.env.DATA_ENCRYPTION_KEY=previousKey;else delete process.env.DATA_ENCRYPTION_KEY;}
});
test('Redis outages return empty cache / local limiter fallback and circuit break',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('outage');};try{assert.deepEqual(await redis.readAnswerCache(),[]);assert.equal(await redis.distributedCount('api','id',60000),null);assert.equal(calls,1);assert.equal(redis.redisStatus().available,false);await redis.writeAnswerCache([]);}finally{globalThis.fetch=original;}});
