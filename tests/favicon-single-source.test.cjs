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

test('public and CMS views continue to share the favicon helper',()=>{
  const app=read('src/App.tsx');
  assert.match(app,/applySiteFavicon\(active\)/);
});

test('removed pricing page and its independent favicon code stay absent',()=>{
  assert.equal(fs.existsSync(path.join(root,'src/components/landing/PricingPage.tsx')),false);
  assert.doesNotMatch(read('src/App.tsx'),/PricingPage/);
});

test('public SPA never points tab favicon at removed RC static favicon',()=>{
  const files=['index.html','src/utils/siteFavicon.ts','server.ts'];
  for(const file of files) assert.doesNotMatch(read(file),/\/static\/images\/common\/favicon\.ico/);
});
