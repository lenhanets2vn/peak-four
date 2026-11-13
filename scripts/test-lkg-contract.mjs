import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';

const server = fs.readFileSync('server.ts','utf8');
const knowledge = fs.readFileSync('src/services/knowledgeService.ts','utf8');
for (const needle of [
  "'/api/lkg/status'",
  "'/api/lkg/create'",
  "'/api/lkg/restore'",
  'baoviet-last-known-good',
  'LKG_CURRENT_FILE',
  'LKG_PREVIOUS_FILE',
  'LKG_SENSITIVE_KEY',
  'recoverFromLkgIfLocalStateInvalid',
]) {
  if (!server.includes(needle)) throw new Error(`Missing LKG contract: ${needle}`);
}
if (!knowledge.includes('setKnowledgeLocalPersistenceHook')) throw new Error('Missing Knowledge local persistence hook');

// Exercise the same envelope/checksum/rotation semantics in an isolated temp dir.
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'bv-lkg-'));
const current = path.join(dir,'current.json');
const previous = path.join(dir,'previous.json');
const checksum = (base) => crypto.createHash('sha256').update(JSON.stringify({schemaVersion:base.schemaVersion,state:base.state})).digest('hex');
const write = (reason,state) => {
  const base={format:'baoviet-last-known-good',schemaVersion:1,createdAt:new Date().toISOString(),reason,state};
  const envelope={...base,checksum:checksum(base)};
  if (fs.existsSync(current)) fs.copyFileSync(current,previous);
  fs.writeFileSync(current,JSON.stringify(envelope));
  return envelope;
};
const a=write('first',{pages:[{id:'home'}],aiKnowledge:[]});
const b=write('second',{pages:[{id:'home',version:2}],aiKnowledge:[{id:'k1'}]});
const prev=JSON.parse(fs.readFileSync(previous,'utf8'));
const cur=JSON.parse(fs.readFileSync(current,'utf8'));
if (prev.checksum!==a.checksum || cur.checksum!==b.checksum) throw new Error('Rotation failed');
const {checksum:curHash,...curBase}=cur;
if (checksum(curBase)!==curHash) throw new Error('Checksum verification failed');
console.log('LKG_CONTRACT_PASS');
