'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const transpile = (p, requires = {}) => {
  const compiled = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020 } });
  const m = { exports:{} };
  vm.runInNewContext(compiled.outputText, { module:m, exports:m.exports, require:(id) => {
    if (id in requires) return requires[id];
    throw new Error(`Unexpected dependency ${id}`);
  } }, { filename:p });
  return m.exports;
};
const defaults = transpile('src/data/defaultConfig.ts');

test('clean launch: no prepublished homepage or sample marketing data', () => {
  const c = defaults.defaultLandingConfig;
  assert.equal(c.published,false);
  for (const key of ['sections','formFields','heroBenefits','heroSlides']) assert.equal(c[key].length,0, key);
  for (const key of ['headline','subtitle','heroBadge','heroImage','heroCtaPrimary','heroCtaSecondary','headerCtaText']) assert.equal(c[key],'',key);
  assert.equal(c.footer.enabled,false);
  assert.equal(c.footer.columns.length,0);
  assert.equal(c.countdown.enabled,false);
  assert.equal(c.websiteSettings.header.enabled,false);
  assert.deepEqual(Array.from(c.websiteSettings.header.utilityLinks),[]);
  assert.deepEqual(Array.from(c.websiteSettings.navigation.items),[]);
  assert.deepEqual(Array.from(c.websiteSettings.popups),[]);
  assert.deepEqual(Array.from(c.websiteSettings.forms),[]);
  assert.deepEqual(Array.from(c.websiteSettings.stylePresets),[]);
  assert.equal(c.websiteSettings.seo.metaDescription,'');
  assert.equal(c.websiteSettings.seo.ogDescription,'');
  assert.equal(defaults.defaultAdminLoginSettings.showQuickAdmin,false);
});

test('fresh chatbot has no example knowledge or scripted claims', () => {
  const ai = transpile('src/utils/aiConfigDefaults.ts');
  assert.equal(ai.DEFAULT_TAXONOMY_DATA.products.length,0);
  assert.equal(ai.DEFAULT_TAXONOMY_DATA.categories.length,0);
  assert.equal(ai.DEFAULT_AI_CHATBOT_CONFIG.enabled,false);
  assert.equal(ai.DEFAULT_AI_CHATBOT_CONFIG.welcomeMessage,'');
  assert.equal(ai.DEFAULT_AI_CHATBOT_CONFIG.suggestedQuestions.length,0);
  assert.equal(ai.DEFAULT_AI_TRAINING_CONFIG.openingGreeting,'');
  assert.equal(ai.DEFAULT_AI_TRAINING_CONFIG.pricingPlaybook,'');
});

test('pricing engine files and deployment process are physically removed', () => {
  assert.equal(fs.existsSync(path.join(root,'rc_backend')),false);
  assert.equal(fs.existsSync(path.join(root,'src/components/landing/PricingPage.tsx')),false);
  assert.equal(fs.existsSync(path.join(root,'src/components/admin/ProductKnowledgePricingManager.tsx')),false);
  assert.doesNotMatch(read('Dockerfile'),/python3|gunicorn|rc_backend/);
  assert.doesNotMatch(read('start-hybrid.sh'),/gunicorn|RC_PID|rc_backend/);
});

test('no pricing frontend route, system page, or service endpoints', () => {
  const server = read('server.ts');
  assert.doesNotMatch(read('src/App.tsx'),/import\s+\{\s*PricingPage\s*\}|<PricingPage\b/);
  assert.doesNotMatch(server,/app\.(get|post|put|patch|delete)\(['"]\/api\/rc\/pricing/);
  assert.doesNotMatch(server,/getPricingSystemSummary|pricingSystemNavItem|RC_PRODUCT_CATALOG|updatePricingSystemPage/);
  assert.match(server,/app\.all\(\['\/tinh-phi'/);
  assert.doesNotMatch(server,/rows\.push\(\{loc:`\$\{base\}\/tinh-phi`/);
  assert.doesNotMatch(read('src/components/admin/WebsiteSettings.tsx'),/tab==='pricing'|Trang Tính Phí/);
  assert.doesNotMatch(read('src/components/admin/PageManager.tsx'),/\bisPricing\b/);
  assert.doesNotMatch(read('src/services/chatbotEngine.ts'),/\]\(\/tinh-phi\)/);
});

test('unconfigured form cannot accept user data, and old Cloud data is not erased', () => {
  const server = read('server.ts');
  assert.match(server,/page\.published!==true/);
  assert.match(server,/Form chưa được cấu hình trong CMS/);
  assert.doesNotMatch(server,/deleteCloudPagesAtStartup|wipeFirestoreOnStart/);
  assert.match(server,/pagesDatabase = rawPages\.map/);
});
