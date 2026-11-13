const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const read = f => fs.readFileSync(f, 'utf8');
function evaluateModule(path, imports = {}) {
  const js = ts.transpileModule(read(path), {fileName:path, compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  new Function('module','exports','require',js)(module,module.exports,name=>{
    if (Object.hasOwn(imports,name)) return imports[name];
    throw Error(`Unexpected dependency ${name}`);
  });
  return module.exports;
}
const defaults = evaluateModule('src/data/defaultConfig.ts');
const ai = evaluateModule('src/utils/aiConfigDefaults.ts');
const {normalizeLandingConfig} = evaluateModule('src/utils/configDefaults.ts', {'../data/defaultConfig':defaults, './aiConfigDefaults':ai});

test('fresh install renders a neutral, visible header and footer without any sample brand', () => {
  const config = normalizeLandingConfig();
  assert.equal(config.websiteSettings.header.enabled,true);
  assert.equal(config.footer.enabled,true);
  assert.equal(config.websiteSettings.header.showUtilityRow,false);
  assert.equal(config.websiteSettings.header.searchEnabled,false);
  assert.equal(config.brandName,'');
  assert.equal(config.brandLogoText,'');
  assert.deepEqual(config.websiteSettings.navigation.items,[]);
  assert.deepEqual(config.footer.columns,[]);
  assert.equal(config.footer.copyrightText,'');
  assert.equal(config.footer.footerDescription,'');
  assert.equal(config.sections.length,0);
  assert.equal(config.published,false);
});

test('new page normalization preserves explicit admin choices', () => {
  const config = normalizeLandingConfig({brandName:'My Company',websiteSettings:{header:{enabled:false}},footer:{enabled:false,footerDescription:'Authored footer'}});
  assert.equal(config.brandName,'My Company');
  assert.equal(config.websiteSettings.header.enabled,false);
  assert.equal(config.footer.enabled,false);
  assert.equal(config.footer.footerDescription,'Authored footer');
});

test('new page server constructor inherits the neutral shell, no forced content', () => {
  const server=read('server.ts');
  assert.match(server,/function createBlankLandingConfig\([\s\S]+?clone\(defaultLandingConfig\)/);
  assert.match(server,/page\.publishedConfig\.footer = cloneValue\(publishedFooter\)/);
});

test('public header and footer render only configured content and no fake certification',()=>{
  const header=read('src/components/landing/SiteHeader.tsx');
  const footer=read('src/components/landing/FooterSection.tsx');
  assert.match(header,/config\.brandName \|\| 'Trang web'/);
  assert.match(footer,/config\.brandName \|\| 'Trang web'/);
  assert.doesNotMatch(header,/Bảo hiểm|BẢO HIỂM|Bảo Việt|BẢO VIỆT|Bảo vệ hôm nay/);
  assert.doesNotMatch(footer,/Bảo hiểm|BẢO HIỂM|Bảo Việt|BẢO VIỆT|Đã Đăng Ký Bộ Công Thương/);
});

test('fresh SEO / admin editor UI has no insurance examples',()=>{
  for(const name of ['SeoManager.tsx','FooterBuilder.tsx','AdminLoginSettingsEditor.tsx','PageManager.tsx','WebsiteSettings.tsx']) {
    const content=read(`src/components/admin/${name}`);
    assert.doesNotMatch(content,/Bảo hiểm|BẢO HIỂM|Bảo Việt|BẢO VIỆT|Insurance|INSURANCE/i,name);
  }
  assert.doesNotMatch(read('src/utils/aiConfigDefaults.ts'),/Bảo hiểm|Bảo Việt|Insurance/i);
  assert.doesNotMatch(read('src/components/landing/SiteSearchOverlay.tsx'),/Bảo hiểm|Bảo Việt|Insurance/i);
});


test('legacy default-off shell appears without altering stored data; explicit CMS opt-out stays honored', () => {
  const old = normalizeLandingConfig({websiteSettings:{header:{enabled:false}}, footer:{enabled:false}});
  assert.equal(old.websiteSettings.header.enabled,false);
  assert.equal(old.footer.enabled,false);
  assert.equal(old.websiteSettings.header.enabledExplicit,undefined);
  assert.equal(old.footer.enabledExplicit,undefined);
  const header = read('src/components/landing/SiteHeader.tsx');
  const footer = read('src/components/landing/FooterSection.tsx');
  assert.match(header,/h\.enabled === false && h\.enabledExplicit === true/);
  assert.match(footer,/footer\.enabled === false && footer\.enabledExplicit === true/);
  const off = normalizeLandingConfig({websiteSettings:{header:{enabled:false,enabledExplicit:true}},footer:{enabled:false,enabledExplicit:true}});
  assert.equal(off.websiteSettings.header.enabledExplicit,true);
  assert.equal(off.footer.enabledExplicit,true);
  assert.match(read('src/components/admin/WebsiteSettings.tsx'),/enabledExplicit:true/);
  assert.match(read('src/components/admin/FooterBuilder.tsx'),/enabledExplicit: true/);
});

test('No Pricing remains independent of pricing backend',()=>{
  assert.equal(fs.existsSync('rc_backend'),false);
  assert.equal(fs.existsSync('src/components/landing/PricingPage.tsx'),false);
});
