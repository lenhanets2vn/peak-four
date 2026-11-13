const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
test('no pricing code/assets or Python RC deployment',()=>{
  for (const rel of ['rc_backend','src/components/landing/PricingPage.tsx','src/components/admin/ProductKnowledgePricingManager.tsx','scripts/verify-rc420-canonical-pricing.mjs'])
    assert.equal(fs.existsSync(path.join(base,rel)),false,rel);
  assert.doesNotMatch(read('Dockerfile'),/python3|gunicorn|rc_backend/i);
  assert.doesNotMatch(read('start-hybrid.sh'),/gunicorn|RC_PID|RC_BACKEND_URL/);
});
test('frontend has no pricing entry, tab or UI editor',()=>{
  assert.doesNotMatch(read('src/App.tsx'),/PricingPage|isPricingRoute/);
  assert.doesNotMatch(read('src/components/admin/WebsiteSettings.tsx'),/tab==='pricing'|cms:open-pricing-settings|PRICING_PRODUCTS/);
  assert.doesNotMatch(read('src/components/admin/PageManager.tsx'),/onManagePricing|isPricing/);
  assert.doesNotMatch(read('src/data/defaultConfig.ts'),/pricingPage:/);
});
test('server has no pricing routes, calculator APIs, built-in pricing navigation or pricing search',()=>{
  const s=read('server.ts');
  assert.doesNotMatch(s,/app\.(get|post)\(['"]\/api\/rc\/pricing/);
  assert.doesNotMatch(s,/RC_CANONICAL_PREMIUM_ASSETS|rcPricingFetch|pricingSystemNavItem|getPricingSystemSummary|pricingSeo\(|RC_LEAD_BACKEND_URL|rcLeadId/);
  assert.match(s,/app\.all\(\['\/tinh-phi'/);
  assert.match(s,/p\.id !== 'page_pricing'/);
});
test('core CMS features and safe first-install setup remain',()=>{
  const s=read('server.ts');
  for (const required of ['/api/leads','/api/search','/api/setup/owner','CMS_SETUP_TOKEN','/api/config/published'])assert.ok(s.includes(required),required);
  assert.ok(read('src/components/landing/HeroSection.tsx').includes('cms-hero-responsive-media'));
  assert.ok(read('src/components/landing/SiteHeader.tsx').includes('compactOnScroll'));
  assert.ok(read('src/services/api.ts').includes('createFirstOwner'));
});
