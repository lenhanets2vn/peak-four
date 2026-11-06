const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const dash=fs.readFileSync('src/components/admin/AdminDashboard.tsx','utf8');
const analytics=fs.readFileSync('src/components/admin/AnalyticsDashboard.tsx','utf8');
const styles=fs.readFileSync('src/styles/cmsTailAdminActual.css','utf8');
test('CMS uses distinct sidebar and header with no repeated tabs',()=>{
  for(const v of ['cms-actual-brand','cms-actual-nav-group','cms-actual-nav-child','cms-actual-header-title'])assert.ok(dash.includes(v),v);
  assert.ok(!dash.includes('cms-ui-secondary-nav cms-v2-secondary-nav'));
});
test('Analytics exposes actual data driven dashboard and preserves legacy report',()=>{
  for(const v of ['cms-actual-analytics-grid','cms-actual-traffic','cms-actual-conversion','cms-actual-daily','getAnalyticsSummary(days','data={dailyTrends}','dailyTrends.slice(-7).reverse()']) assert.ok(analytics.includes(v),v);
  assert.ok(analytics.includes('cms-actual-advanced'));
  assert.ok(analytics.includes('saveAnalyticsCosts(costs)'));
});
test('CMS display styles are scoped with mobile and reduced motion fallbacks',()=>{
  assert.ok(styles.includes('.cms-tailadmin-real'));
  assert.ok(styles.includes('@media(max-width:1023px)'));
  assert.ok(styles.includes('prefers-reduced-motion:reduce'));
  assert.ok(!styles.includes('@import url('));
});
