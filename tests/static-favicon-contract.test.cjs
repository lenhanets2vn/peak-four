const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.ts'),'utf8');
const helper=fs.readFileSync(path.join(root,'src/utils/siteFavicon.ts'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('favicon endpoint prefers public/dist favicon.ico',()=>{
  assert.match(server,/dist','favicon\.ico/);
  assert.match(server,/public','favicon\.ico/);
  assert.match(server,/no-store, max-age=0/);
});
test('browser runtime uses stable favicon endpoint',()=>{
  assert.match(helper,/return '\/favicon\.ico'/);
  assert.match(html,/href="\/favicon\.ico"/);
});
