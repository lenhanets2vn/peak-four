const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const dash = read('src/components/admin/AdminDashboard.tsx');
const login = read('src/components/admin/AdminLogin.tsx');
const analytics = read('src/components/admin/AnalyticsDashboard.tsx');
const css = read('src/styles/cmsWorkspace2026.css');

test('CMS dashboard uses internal workspace shell and accessible sidebar navigation', () => {
  for (const token of ['cms-v2-shell','cms-v2-sidebar','cms-v2-content','cms-v2-workspace','cms-actual-nav-children','aria-current={tab === item.id']) assert.ok(dash.includes(token), `Missing ${token}`);
  assert.ok(dash.includes('cat.items.filter(item => item.allowed)'), 'Sidebar must respect existing RBAC');
  assert.ok(dash.includes('setTab(item.id)'), 'Sidebar must navigate existing tab system');
  assert.ok(!dash.includes('cms-ui-secondary-nav cms-v2-secondary-nav'), 'Duplicated horizontal subnavigation should be removed');
});

test('Save/Publish and dirty-state hooks stay connected to original functions', () => {
  for (const token of ['saveAdminConfig(snapshot,currentUser.email,currentPageId)','publishConfig(snapshot,currentUser.email,undefined,currentPageId)','setDirty(nextFingerprint!==savedConfigFingerprint.current)','onClick={() => save(false)}','onClick={publish}']) assert.ok(dash.includes(token), `Missing ${token}`);
});

test('Default sign in uses existing authentication form without fake Apple/LinkedIn buttons', () => {
  for(const token of ['useReferenceSignIn','cms-v2-signin','renderLoginCard()','const handleLocal = async','const handleGoogleSignIn = async','const handleQuickAdmin = async']) assert.ok(login.includes(token), `Missing ${token}`);
  assert.ok(!login.includes('signInWithApple') && !login.includes('signInWithLinkedIn'));
});

test('Analytics uses existing data API and presentation-only visual variants', () => {
  for(const token of ['getAnalyticsSummary(', 'getAnalyticsCosts()', 'cms-v2-metrics', 'cms-v2-metric-card']) assert.ok(analytics.includes(token), `Missing ${token}`);
});

test('Workspace styles are scoped and support mobile/reduced motion', () => {
  for(const token of ['.cms-v2-root', '.cms-v2-signin', '@media(max-width:1023px)', 'prefers-reduced-motion:reduce']) assert.ok(css.includes(token), `Missing ${token}`);
  assert.ok(!css.includes('@import url('), 'No new external CSS CDN');
});
