import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.UPSTASH_REDIS_REST_URL = 'https://redis-v2.example.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-v2-secret';
process.env.REDIS_NAMESPACE = 'test-chat-v2';
process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

const strings = new Map<string,string>();
const zsets = new Map<string,Map<string,number>>();
const expires = new Map<string,number>();

function cleanup(key:string) {
  const at = expires.get(key);
  if (at && at <= Date.now()) {
    strings.delete(key); zsets.delete(key); expires.delete(key);
  }
}
function zset(key:string) {
  cleanup(key);
  let value = zsets.get(key);
  if (!value) { value = new Map(); zsets.set(key, value); }
  return value;
}
function evalScript(command:any[]) {
  const script = String(command[1]);
  const keyCount = Number(command[2]);
  const keys = command.slice(3, 3 + keyCount).map(String);
  const args = command.slice(3 + keyCount);

  if (script.includes("current=tonumber(redis.call('GET',KEYS[1]) or '1')") && script.includes('current=current+1')) {
    cleanup(keys[0]);
    let current = Number(strings.get(keys[0]) || 1);
    const floor = Number(args[0]) || 1;
    if (floor > current) current = floor;
    current += 1;
    strings.set(keys[0], String(current));
    return current;
  }
  if (script.includes("current=tonumber(redis.call('GET',KEYS[1]) or '1')") && script.includes('proposed>current')) {
    cleanup(keys[0]);
    let current = Number(strings.get(keys[0]) || 1);
    const proposed = Number(args[0]) || 1;
    if (proposed > current) { current = proposed; strings.set(keys[0], String(current)); }
    return current;
  }
  if (script.includes("redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2])") && script.includes('maxEntries')) {
    strings.set(keys[0], String(args[0]));
    expires.set(keys[0], Date.now() + Number(args[1]) * 1000);
    const index = zset(keys[1]);
    index.set(keys[0], Number(args[2]));
    if (args.length >= 5) {
      const cutoff = Number(args[3]);
      for (const [member, score] of [...index]) if (score <= cutoff) index.delete(member);
      const max = Number(args[4]);
      const ordered = [...index.entries()].sort((a,b) => a[1] - b[1]);
      while (ordered.length > max) index.delete(ordered.shift()![0]);
    } else {
      const max = Number(args[3]);
      const ordered = [...index.entries()].sort((a,b) => a[1] - b[1]);
      while (ordered.length > max) index.delete(ordered.shift()![0]);
    }
    expires.set(keys[1], Date.now() + Number(args[1]) * 1000);
    return 1;
  }
  if (script.includes("current=redis.call('GET',KEYS[1])") && script.includes("return 'conflict'")) {
    cleanup(keys[0]);
    const current = strings.get(keys[0]);
    if (!current) {
      strings.set(keys[0], String(args[0]));
      expires.set(keys[0], Date.now() + Number(args[1]) * 1000);
      return 'claimed';
    }
    if (current === String(args[0])) {
      expires.set(keys[0], Date.now() + Number(args[1]) * 1000);
      return 'owned';
    }
    return 'conflict';
  }
  if (script.includes("local n=redis.call('INCR',KEYS[1])")) {
    cleanup(keys[0]);
    const count = Number(strings.get(keys[0]) || 0) + 1;
    strings.set(keys[0], String(count));
    if (count === 1) expires.set(keys[0], Date.now() + Number(args[0]));
    return count;
  }
  throw new Error(`Unsupported EVAL in fake Redis: ${script.slice(0,80)}`);
}
function execute(command:any[]) {
  const op = String(command[0]).toUpperCase();
  if (op === 'EVAL') return evalScript(command);
  if (op === 'GET') { cleanup(String(command[1])); return strings.get(String(command[1])) ?? null; }
  if (op === 'DEL') {
    let count = 0;
    for (const raw of command.slice(1)) {
      const key = String(raw); cleanup(key);
      if (strings.delete(key) || zsets.delete(key)) count += 1;
      expires.delete(key);
    }
    return count;
  }
  if (op === 'ZREMRANGEBYSCORE') {
    const index = zset(String(command[1])); const max = Number(command[3]); let count = 0;
    for (const [member,score] of [...index]) if (score <= max) { index.delete(member); count += 1; }
    return count;
  }
  if (op === 'ZREVRANGE') {
    const entries = [...zset(String(command[1])).entries()].sort((a,b) => b[1] - a[1]).map(([member]) => member);
    return entries.slice(Number(command[2]), Number(command[3]) + 1);
  }
  if (op === 'MGET') return command.slice(1).map((raw) => { const key=String(raw); cleanup(key); return strings.get(key) ?? null; });
  if (op === 'ZREM') {
    const index = zset(String(command[1])); let count = 0;
    for (const raw of command.slice(2)) if (index.delete(String(raw))) count += 1;
    return count;
  }
  if (op === 'SET') {
    const key=String(command[1]); strings.set(key,String(command[2]));
    const ex=command.indexOf('EX'); if(ex>=0)expires.set(key,Date.now()+Number(command[ex+1])*1000);
    return 'OK';
  }
  throw new Error(`Unsupported fake Redis command: ${op}`);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url:any, options:any) => {
  assert.equal(options?.headers?.Authorization, 'Bearer redis-v2-secret');
  const command = JSON.parse(String(options?.body));
  return new Response(JSON.stringify({ result: execute(command) }), { status: 200, headers: { 'Content-Type':'application/json' } });
};

const redis = await import('../src/services/redisServer');

test('answer cache V2 uses generation invalidation and independent encrypted entries', async () => {
  const generation = await redis.getAnswerCacheGeneration();
  assert.equal(generation, 1);
  const entry = {
    id:'cache_1', queryNormalized:'an-gia::kb-a:cfg-a::quyen loi la gi', rawQuery:'Quyền lợi là gì?',
    product:'An Gia', reply:'Câu trả lời', sources:['kb_1'], modelUsed:'gemini-test',
    createdAt:new Date().toISOString(), lastAccessedAt:new Date().toISOString(), hitCount:0,
  };
  await redis.writeAnswerCacheEntry(entry, generation);
  assert.equal((await redis.readAnswerCacheEntry(entry.queryNormalized, generation))?.reply, 'Câu trả lời');
  assert.equal((await redis.readRecentAnswerCache(generation, 10)).length, 1);
  assert.ok([...strings.values()].some((value) => value.includes('aes-256-gcm-v1')));
  assert.ok(![...strings.keys()].some((key) => key.includes('quyen loi')));

  const nextGeneration = await redis.bumpAnswerCacheGeneration('knowledge_update');
  assert.equal(nextGeneration, 2);
  assert.equal(await redis.readAnswerCacheEntry(entry.queryNormalized, nextGeneration), null);
});

test('active chat session survives via encrypted Redis and owner token is never stored raw', async () => {
  const session = { id:'session_secure_1', status:'ai_active', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), messages:[{role:'user',text:'Xin chào'}] };
  await redis.writeChatSession(session);
  assert.equal((await redis.readChatSession(session.id))?.messages?.[0]?.text, 'Xin chào');
  assert.equal((await redis.readRecentChatSessions(10)).length, 1);

  const visitorA = 'a'.repeat(64); const visitorB = 'b'.repeat(64);
  assert.equal(await redis.claimChatSessionOwner(session.id, visitorA), 'claimed');
  assert.equal(await redis.claimChatSessionOwner(session.id, visitorA), 'owned');
  assert.equal(await redis.claimChatSessionOwner(session.id, visitorB), 'conflict');
  assert.ok(![...strings.values()].includes(visitorA));

  await redis.deleteChatSession(session.id);
  assert.equal(await redis.readChatSession(session.id), null);
});

test.after(() => { globalThis.fetch = originalFetch; });
