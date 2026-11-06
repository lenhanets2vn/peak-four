const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const root = process.cwd();
const dashboard = readFileSync(root + '/src/components/admin/AdminDashboard.tsx', 'utf8');
const cloud = readFileSync(root + '/src/components/admin/CloudStatusHeaderBadge.tsx', 'utf8');
const css = readFileSync(root + '/src/styles/cmsTailAdminActual.css', 'utf8');
const analytics = readFileSync(root + '/src/components/admin/AnalyticsDashboard.tsx', 'utf8');

test('only one visible Search trigger; keyboard command remains wired', () => {
  assert.equal((dashboard.match(/setShowQuickJump\(true\)/g)||[]).length, 1); // one visible Search button; keyboard handler tested below
  assert.equal((dashboard.match(/className="cms-topbar-search /g)||[]).length, 1);
  assert.match(dashboard, /window.addEventListener\('keydown', handleKeyDown\)/);
  assert.equal((dashboard.match(/<button[^>]+cms-actual-search-shortcut/g)||[]).length, 0);
});
test('only one logout button uses existing auth handler', () => {
  assert.equal((dashboard.match(/onClick=\{logout\}/g)||[]).length, 1);
  assert.match(dashboard,/className="cms-sidebar-logout"/);
  assert.match(dashboard,/const logout=async/);
});
test('menu collapse control not duplicated', () => {
  assert.equal((dashboard.match(/className="cms-v2-menu-toggle"/g)||[]).length, 1);
  assert.doesNotMatch(dashboard,/className="cms-actual-collapse"/);
});
test('primary action buttons always exist in the same toolbar', () => {
  for (const action of ['cms-topbar-preview', 'cms-topbar-save','cms-topbar-publish']) {
    assert.match(dashboard,new RegExp(action));
  }
  assert.match(dashboard,/role="toolbar" aria-label="Tác vụ CMS"/);
  assert.match(css,/\.cms-topbar-actions\{[^}]*flex-wrap:wrap/);
  assert.match(css,/@media\(max-width:1370px\)/);
  assert.match(css,/max-width:calc\(100% - var\(--cms-v2-sidebar\)\)/);
  assert.match(css,/@media\(max-width:650px\)/);
});
test('collapsed account retains visible logout and responsive Cloud popover', () => {
  assert.match(css,/\.cms-v2-sidebar-bottom \.cms-sidebar-logout\{display:inline-flex!important/);
  assert.match(css,/\.cms-topbar-cloud \.absolute\{left:0!important/);
  assert.match(cloud,/max-w-\[calc\(100vw-24px\)\]/);
});
test('chart visual refresh keeps same API bindings and data fields', () => {
  assert.match(analytics,/getAnalyticsSummary\(days, scope === 'page' \? pageId : undefined\)/);
  assert.match(analytics,/dataKey="views"/);
  assert.match(analytics,/dataKey="leads"/);
  assert.match(analytics,/cms-actual-kpi-icon/);
  assert.match(css,/cms-actual-advanced-body/);
});
