const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'src/components/admin/AdminDashboard.tsx'), 'utf8');
const seo = fs.readFileSync(path.join(root, 'src/components/admin/SeoManager.tsx'), 'utf8');

test('dirty state ignores semantic no-op editor emissions', () => {
  assert.match(dashboard, /if\(nextFingerprint===currentConfigFingerprint\.current\)return;/);
  assert.match(dashboard, /setDirty\(nextFingerprint!==savedConfigFingerprint\.current\)/);
});

test('save draft does not write when there are no actual changes', () => {
  assert.match(dashboard, /if\(!dirty\)\{/);
  assert.match(dashboard, /Không có thay đổi mới cần lưu\./);
  assert.match(dashboard, /disabled=\{saving \|\| !dirty\}/);
});

test('SEO direct save updates only the persisted SEO baseline', () => {
  assert.match(dashboard, /const applyPersistedSeo=/);
  assert.match(seo, /onPersistedSeoChange/);
  assert.doesNotMatch(seo, /onPersistedConfigChange/);
});

test('page navigation reorder is a real dirty edit', () => {
  assert.match(dashboard, /onOrderChange=\{\(ids\)=>\{/);
  assert.match(dashboard, /change\(\{\.\.\.safeConfig,websiteSettings:/);
});
