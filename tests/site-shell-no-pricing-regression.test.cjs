const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(base, relative), 'utf8');

test('site shell uses column flex layout so footer stays at viewport bottom on short pages', () => {
  const landing = read('src/components/landing/LandingPage.tsx');
  assert.match(landing, /cms-modern-landing min-h-screen flex flex-col/);
  assert.match(landing, /<main className="flex-1 min-w-0">\{sections\.map/);
  assert.ok(landing.indexOf('<SiteHeader') < landing.indexOf('<main className'));
  assert.ok(landing.indexOf('</main>') < landing.indexOf('<FooterSection'));
  assert.ok(landing.includes('sections.map('), 'dynamic section order preserved');
  assert.ok(landing.includes('<HeroSection'), 'hero preserved');
  assert.ok(landing.includes('<LeadForm'), 'lead form preserved');
  assert.ok(landing.includes('<AiChatbotWidget'), 'chat widget preserved');
});

test('desktop CMS login stays accessible when utility row is hidden or header compacted', () => {
  const siteHeader = read('src/components/landing/SiteHeader.tsx');
  assert.match(siteHeader, /h\.showUtilityRow!==false&&!compactOnScroll/);
  assert.match(siteHeader, /onAdminClick && \(h\.showUtilityRow === false \|\| compactOnScroll\)/);
  assert.match(siteHeader, /aria-label="Đăng nhập CMS"/);
  assert.ok((siteHeader.match(/onClick=\{onAdminClick\}/g) || []).length >= 4);
  assert.match(siteHeader, /h\.showUtilityRow!==false&&!compactOnScroll[\s\S]*?onClick=\{onAdminClick\}/, 'utility login still available');
});

test('mobile CMS login works in all supported header layouts', () => {
  const siteHeader = read('src/components/landing/SiteHeader.tsx');
  assert.match(siteHeader, /\{mobileEnabled && <header/);
  assert.match(siteHeader, /menuItems\.length>0[\s\S]*?\{onAdminClick && <button[^\n]*aria-label="Đăng nhập CMS"/);
  assert.match(siteHeader, /h\.mobileLayout==='logo-center' && onAdminClick/);
  const app = read('src/App.tsx');
  assert.match(app, /<LandingPage config=\{config\} onAdminClick=\{goAdmin\}/);
  assert.match(app, /view === 'admin-login'[\s\S]*?<AdminLogin/);
});

test('first-install defaults remain neutral and CMS can explicitly turn header and footer off', () => {
  const defaults = read('src/data/defaultConfig.ts');
  const header = read('src/components/landing/SiteHeader.tsx');
  const footer = read('src/components/landing/FooterSection.tsx');
  assert.match(defaults, /brandName: ''/);
  assert.match(defaults, /footer: \{\s*enabled: true/);
  assert.match(defaults, /header: \{\s*enabled: true/);
  assert.match(defaults, /showUtilityRow: false/);
  assert.match(header, /h\.enabled === false && h\.enabledExplicit === true/);
  assert.match(footer, /footer\.enabled === false && footer\.enabledExplicit === true/);
  assert.doesNotMatch(defaults, /Bảo Việt|BẢO VIỆT/);
});

test('pricing removal does not strip lead, Cloud, login, or sheets integration', () => {
  const server=read('server.ts');
  const api=read('src/services/api.ts');
  const settings=read('src/components/admin/AdminDashboard.tsx');
  for(const marker of ['/api/leads','/api/config/published','/api/setup/owner','/api/search','CMS_SETUP_TOKEN','googleSheets'])
    assert.ok(server.includes(marker), `server missing ${marker}`);
  for(const marker of ['fetchPublishedConfig','fetchAdminConfig','getAdminSession','createFirstOwner'])
    assert.ok(api.includes(marker), `client missing ${marker}`);
  assert.ok(settings.includes('googleSheets'));
  assert.ok(!fs.existsSync(path.join(base,'rc_backend')));
  assert.ok(!fs.existsSync(path.join(base,'src/components/landing/PricingPage.tsx')));
});
