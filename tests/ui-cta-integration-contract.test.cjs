const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(base, f), 'utf8');

test('CTA destination editor offers URL, Category Page and Section Page', () => {
  const source = read('src/components/admin/SettingsEditors.tsx');
  assert.match(source, /value="url">1\. Dẫn URL/);
  assert.match(source, /value="internal">2\. Category Page/);
  assert.match(source, /value="scroll">3\. Section Page/);
  assert.match(source, /getPages\(false\)/);
  assert.match(source, /page\.slug/);
});

test('Hero primary/secondary editors persist both CTA action and design', () => {
  const source = read('src/components/admin/ContentEditor.tsx');
  assert.match(source, /heroPrimaryCta: editingHero\.heroPrimaryCta/);
  assert.match(source, /heroSecondaryCta: editingHero\.heroSecondaryCta/);
  assert.match(source, /heroPrimaryCta\?\.action\|\|\{type:'scroll'/);
  assert.match(source, /heroSecondaryCta\?\.action\|\|\{type:'scroll'/);
  assert.match(source, /Trung tâm thiết kế|Cài đặt Website|Mở cấu hình Header/);
});

test('Blog accepts typed actions while retaining legacy URL fallbacks', () => {
  const editor = read('src/components/admin/BlogPostEditor.tsx');
  const live = read('src/components/landing/BlogPostSection.tsx');
  assert.match(editor, /blog\.ctaAction\|\|actionFromUrl\(blog\.ctaUrl\)/);
  assert.match(editor, /item\.ctaAction\|\|actionFromUrl\(item\.url\)/);
  assert.match(live, /blog\.ctaAction\|\|toBlogAction\(blog\.ctaUrl\)/);
  assert.match(live, /SmartActionButton/);
});

test('UI variants do not replace the CMS action runtime and apply modern default based on context', () => {
  const live = read('src/components/common/SmartActionButton.tsx');
  assert.match(live, /runCmsAction\(action,/);
  assert.match(live, /uiVariant=d\.uiVariant\|\|/);
  assert.match(live, /sectionId==='hero-main'\?'heroPrimary'/);
  assert.match(live, /getUiMapping\(cms\?\.websiteSettings,mappedSlot\)/);
  assert.match(live, /cms-cta-visual/);
});
