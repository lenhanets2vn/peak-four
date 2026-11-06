import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const problems = [];
const checked = [];
const exists = p => fs.existsSync(p);
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => {
  const p=path.join(dir,e.name);
  return e.isDirectory()?walk(p):[p];
});
const sourceFiles = walk(root).filter(p => !p.includes(`${path.sep}node_modules${path.sep}`) && /\.(ts|tsx)$/.test(p));

function resolveRelative(from, spec){
  const base=path.resolve(path.dirname(from),spec);
  for(const candidate of [base,`${base}.ts`,`${base}.tsx`,`${base}.js`,`${base}.jsx`,path.join(base,'index.ts'),path.join(base,'index.tsx')]){
    if(exists(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}
function exportedNames(file){
  const text=fs.readFileSync(file,'utf8');
  const names=new Set();
  for(const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for(const m of text.matchAll(/export\s*\{([^}]+)\}/gs)){
    for(const raw of m[1].split(',')){
      const clean=raw.trim().replace(/^type\s+/,'');
      if(!clean) continue;
      const parts=clean.split(/\s+as\s+/);
      names.add((parts[1]||parts[0]).trim());
    }
  }
  return names;
}

for(const file of sourceFiles){
  const text=fs.readFileSync(file,'utf8');
  for(const m of text.matchAll(/import\s*(?:type\s*)?\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]/g)){
    const [,block,spec]=m;
    if(!spec.startsWith('.')) continue;
    const target=resolveRelative(file,spec);
    if(!target){ problems.push(`Missing module: ${path.relative(root,file)} -> ${spec}`); continue; }
    const exports=exportedNames(target);
    for(const raw of block.split(',')){
      const clean=raw.trim().replace(/^type\s+/,'');
      if(!clean) continue;
      const imported=clean.split(/\s+as\s+/)[0].trim();
      if(!exports.has(imported)) problems.push(`Missing export: ${path.relative(root,file)} imports ${imported} from ${path.relative(root,target)}`);
    }
    checked.push(`${path.relative(root,file)} -> ${path.relative(root,target)}`);
  }
  for(const m of text.matchAll(/import\s+[^'\";]+\s+from\s*['\"]([^'\"]+)['\"]/g)){
    const spec=m[1];
    if(!spec.startsWith('.')) continue;
    if(!resolveRelative(file,spec)) problems.push(`Missing module: ${path.relative(root,file)} -> ${spec}`);
  }
}

const topEntries=fs.readdirSync(root,{withFileTypes:true});
for(const e of topEntries){
  if(e.isDirectory() && /^(step[-_ ]?\d+|patch|backup|old|temp|archive|previous)/i.test(e.name)) problems.push(`Patch/backup directory at project root: ${e.name}`);
}

const canonical=[
  'server.ts','src/services/chatbotEngine.ts','src/services/geminiServer.ts','src/services/chatbotTaxonomyRouter.ts',
  'src/services/chatbotConversationReasoner.ts','src/services/chatbotReasoningPlanner.ts','src/services/chatbotFactGuard.ts',
  'src/services/chatbotClarification.ts','src/services/chatbotDynamicKnowledge.ts','src/services/chatbotSemanticResolver.ts',
  'src/services/chatbotMultiTurnReference.ts','src/services/chatbotTopicStack.ts'
];
for(const rel of canonical){ if(!exists(path.join(root,rel))) problems.push(`Missing canonical file: ${rel}`); }

// Explicit contract that previously broke the project.
const firebaseExports=exportedNames(path.join(root,'src/services/firebaseAdminServer.ts'));
if(!firebaseExports.has('enqueueCloudAuditLog')) problems.push('firebaseAdminServer.ts must export enqueueCloudAuditLog');

if(problems.length){
  console.error(`CHATBOT_CONTRACT_AUDIT_FAILED (${problems.length})`);
  for(const p of [...new Set(problems)]) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`CHATBOT_CONTRACT_AUDIT_OK files=${sourceFiles.length} relativeContracts=${checked.length}`);
