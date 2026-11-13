const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('registry has 11 mapped UI slots, allowlisted options and safe overrides',()=>{
  const script=`import assert from 'node:assert/strict';
  import {UI_SLOTS,UI_REFERENCE_CATALOG,getUiMapping} from './src/utils/uiLibrary.ts';
  assert.equal(UI_SLOTS.length,11);
  assert.ok(UI_REFERENCE_CATALOG.length>=22);
  assert.ok(UI_REFERENCE_CATALOG.some(x=>x.url==='https://github.com/TailAdmin/free-react-tailwind-admin-dashboard'));
  assert.ok(UI_REFERENCE_CATALOG.some(x=>x.url==='https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template'));
  assert.equal(new Set(UI_SLOTS.map(x=>x.id)).size,11);
  for(const slot of UI_SLOTS){
    assert.ok(slot.choices.some(x=>x.id===slot.defaultValue),slot.id);
    assert.equal(getUiMapping(undefined,slot.id),slot.defaultValue);
    assert.equal(getUiMapping({uiLibrary:{mappings:{[slot.id]:'untrusted-entry'}}},slot.id),slot.defaultValue);
    const next=slot.choices.at(-1).id;
    assert.equal(getUiMapping({uiLibrary:{mappings:{[slot.id]:next}}},slot.id),next);
  }
  assert.equal(getUiMapping(undefined,'heroPrimary'),'soft-glow');
  assert.equal(getUiMapping(undefined,'productCard'),'tilt-3d');`;
  execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script],{cwd:root,stdio:'pipe'});
});
test('UI Library saves only explicitly selected mappings via CMS onChange',()=>{
 const panel=read('src/components/admin/UiLibraryPanel.tsx');
 assert.match(panel,/onChange\(\{\.\.\.config,websiteSettings:/);
 assert.match(panel,/if\(JSON\.stringify\(mapping\)===JSON\.stringify\(next\)\)return/);
 assert.match(panel,/if\(value===defaultValue\)delete next\[slot\]/);
 assert.match(panel,/catalogOpen&&/);
 assert.doesNotMatch(panel,/fetch\(|localStorage\.setItem/);
});
test('runtime controls honor mapping but keep existing actions and explicit styles',()=>{
 const btn=read('src/components/common/SmartActionButton.tsx');
 const header=read('src/components/landing/SiteHeader.tsx');
 const card=read('src/components/landing/DynamicSection.tsx');
 const admin=read('src/components/admin/AdminDashboard.tsx');
 const analytics=read('src/components/admin/AnalyticsDashboard.tsx');
 assert.match(btn,/d\.uiVariant\|\|getUiMapping/);
 assert.match(btn,/runCmsAction\(action/);
 assert.match(header,/slot="headerCta"/);
 assert.match(card,/resolveCardStyle\(cmsConfig,item\)\?\.hoverEffect \?\?/);
 assert.match(card,/getUiMapping\(cmsConfig\?\.websiteSettings,'productCard'\)/);
 assert.match(admin,/data-ui-density=\{getUiMapping/);
 assert.match(admin,/<AnalyticsDashboard[^>]+config=\{safeConfig\}/);
 assert.match(analytics,/const cms=config;/);
 assert.doesNotMatch(analytics,/useCmsConfig\(/);
});
