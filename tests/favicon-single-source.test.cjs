const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('SPA favicon helper always resolves to Node /favicon.ico',()=>{
  const helper=read('src/utils/siteFavicon.ts');
  assert.match(helper,/return '\/favicon\.ico'/);
});

test('Calculator page and Python static favicon removed',()=>{
  assert.ok(!fs.existsSync(path.join(root,'src/components/landing/PricingPage.tsx')));
  assert.ok(!fs.existsSync(path.join(root,'rc_backend')));
});

test('public SPA never points tab favicon at RC4.20 static favicon',()=>{
  const files=['index.html','src/utils/siteFavicon.ts','server.ts'];
  for(const file of files) assert.doesNotMatch(read(file),/\/static\/images\/common\/favicon\.ico/);
});
