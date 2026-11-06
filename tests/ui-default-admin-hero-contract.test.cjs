const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('Header legacy editor no longer references undefined alias and is configured centrally',()=>{
 const editor=read('src/components/admin/SettingsEditors.tsx');
 const content=read('src/components/admin/ContentEditor.tsx');
 assert.match(editor,/const currentSectionId = raw\.replace/);
 assert.doesNotMatch(editor,/mode==='scroll'\?[^:]{0,300}\ba\.target/);
 assert.doesNotMatch(content,/<LegacyDestinationEditor/);
 assert.match(content,/cms:website-settings-tab/);
});
test('Modern admin visual styles are present and disabled UI tabs are excluded',()=>{
 const admin=read('src/components/admin/AdminDashboard.tsx');
 const settings=read('src/components/admin/WebsiteSettings.tsx');
 const css=read('src/index.css');
 assert.match(admin,/cms-admin-ui cms-admin-modern/);
 assert.match(settings,/tabGroups:/);
 assert.match(settings,/!\['library','theme','colors','typography','presets','lkg','login'\]\.includes/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Contextual CTA defaults keep tracking and existing explicit settings',()=>{
 const btn=read('src/components/common/SmartActionButton.tsx');
 assert.match(btn,/d\.uiVariant\|\|/);
 assert.match(btn,/sectionId==='hero-main'/);
 assert.match(btn,/runCmsAction\(action/);
 const hero=read('src/components/landing/HeroSection.tsx');
 assert.match(hero,/sectionId="hero-main"/);
 assert.match(hero,/sectionId="hero-secondary"/);
});
test('Landing default cards, search loader, shared form link are present',()=>{
 const cards=read('src/components/landing/DynamicSection.tsx');
 const search=read('src/components/landing/SiteSearchOverlay.tsx');
 const website=read('src/components/admin/WebsiteSettings.tsx');
 assert.match(cards, /hoverEffect \?\? \(cmsConfig/);
 assert.match(search, /role="status" aria-live="polite"/);
 assert.match(website, /Mở Form Center/);
});
