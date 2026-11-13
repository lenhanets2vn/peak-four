const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const server=fs.readFileSync('server.ts','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');
const helper=fs.readFileSync('src/utils/siteFavicon.ts','utf8');

test('server exposes dynamic favicon.ico and cache-busted favicon links',()=>{
  assert.match(server,/app\.get\('\/favicon\.ico'/);
  assert.match(server,/cms_favicon_v=/);
  assert.match(server,/rel="shortcut icon"/);
});

test('admin SPA applies site favicon',()=>{
  assert.match(app,/applySiteFavicon/);
  assert.match(app,/view === 'admin-cms'/);
});

test('favicon helper recreates icon links from the stable Node favicon endpoint',()=>{
  assert.match(helper,/return '\/favicon\.ico'/);
  assert.match(helper,/shortcut icon/);
});
