const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');

test('admin route does not await public published pages; public route still loads normally', () => {
  const app = read('src/App.tsx');
  assert.match(app, /if \(adminRequested\) \{[\s\S]*?void fetchPublishedConfig\(location.pathname\)[\s\S]*?\} else \{\s*await loadPublic\(\)/);
  assert.match(app, /if \(adminRequested\) setView\(getStoredAdminToken\(\) \? 'admin-cms' : 'admin-login'\)/);
});
test('CMS loader exposes terminal error and retry instead of an indefinite spinner', () => {
  const app = read('src/App.tsx');
  assert.match(app, /if \(adminLoadError && !adminLoading\)/);
  assert.match(app, /role="alert"/);
  assert.match(app, /Trạng thái Cloud/);
  assert.match(app, /onClick=\{\(\) => void loadAdmin\(pageId\)\.catch/);
  assert.match(app, /if \(adminLoading \|\| !adminConfig\)/);
});
test('production draft read works only before cloud configured; public read still guarded', () => {
  const server = read('server.ts');
  assert.match(server, /function requireCloudForAdminDraft[\s\S]*?if \(IS_PRODUCTION_RUNTIME && getCloudPersistenceStatus\(\)\.configured\) \{[\s\S]*?requireCloudForPublished\(req, res, next\)/);
  assert.match(server, /app\.get\('\/api\/config', requireAdminAuth, requireCloudForAdminDraft/);
  assert.match(server, /app\.get\('\/api\/config\/published', requireCloudForPublished/);
  assert.match(server, /else if \(IS_PRODUCTION_RUNTIME\) \{[\s\S]*?CLOUD_PERSISTENCE_UNAVAILABLE/);
});
test('confirmed empty Firestore bootstraps brand-neutral draft without publishing it', () => {
  const server = read('server.ts');
  const defaults = read('src/data/defaultConfig.ts');
  assert.match(server, /Khởi tạo bản nháp CMS trung tính trên Firestore mới/);
  assert.doesNotMatch(server, /Đã chặn nạp trang mẫu vào Cloud/);
  assert.match(defaults, /published: false/);
  assert.match(defaults, /brandName: ''/);
  assert.match(defaults, /heroSlides: \[\]/);
  assert.match(defaults, /sections: \[\]/);
});
test('login keeps existing component, custom appearance settings, secure first owner setup, and neutral badge', () => {
  const login = read('src/components/admin/AdminLogin.tsx');
  assert.match(login, /settings: customSettings/);
  assert.match(login, /defaultAdminLoginSettings/);
  assert.match(login, /createFirstOwner/);
  assert.doesNotMatch(login, /<span>BV<\/span>/);
  assert.match(login, /CMS WORKSPACE/);
});

test('CMS configuration request has finite timeout even if gateway never answers', () => {
  const api=read('src/services/api.ts');
  assert.match(api,/getAdminConfig[\s\S]*?const controller=new AbortController\(\)/);
  assert.match(api,/const timer=setTimeout\(\(\)=>controller\.abort\(\),30000\)/);
  assert.match(api,/signal:controller\.signal/);
  assert.match(api,/finally \{ clearTimeout\(timer\); \}/);
});
