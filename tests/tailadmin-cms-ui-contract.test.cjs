const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file),'utf8');

test('TailAdmin design scope is CMS only and has responsive/reduced-motion support', () => {
 const css = read('src/styles/tailadminCms.css');
 assert.match(css,/\.cms-tailadmin/);
 assert.match(css, /\.cms-v2-signin\.cms-tail-signin/);
 assert.match(css, /@media\(max-width:650px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css, /(^|\s)(body|html)\s*\{/m);
});
test('Dashboard uses new visible page context without modifying save publish or RBAC actions', () => {
 const admin=read('src/components/admin/AdminDashboard.tsx');
 for(const token of ['cms-tailadmin','cms-tail-context','cms-tail-breadcrumb','cms-tail-status','saveAdminConfig(', 'publishConfig(', 'isTabAllowed(', 'canPublish']) assert.ok(admin.includes(token), token);
});
test('Analytics retains backend metrics and chart engine and groups rather than dropping values', () => {
 const analytics=read('src/components/admin/AnalyticsDashboard.tsx');
 for(const token of ['primaryCards','secondaryCards','cms-tail-other-metrics','getAnalyticsSummary(', 'getAnalyticsCosts()', 'ResponsiveContainer','resetDashboardData(']) assert.ok(analytics.includes(token),token);
 assert.match(analytics,/secondaryCards = cards\.filter/);
 assert.match(analytics,/primaryCards = cards\.filter/);
});
test('Page search does not change page backend API or reorder when filtered',()=>{
 const pages=read('src/components/admin/PageManager.tsx');
 for(const token of ['searchPages','displayedPages','normalizedSearch','getPages(true)','reorderPages(ids)','Boolean(normalizedSearch)']) assert.ok(pages.includes(token),token);
});
test('Login uses styling but retains original login actions',()=>{
 const login=read('src/components/admin/AdminLogin.tsx');
 for(const token of ['cms-tail-signin','handleLocal','handleGoogleSignIn','handleQuickAdmin','loginAdmin(']) assert.ok(login.includes(token),token);
});
