const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

test('AI Knowledge heading is concise with no obsolete subtitle or secondary badge', () => {
  const source = read('src/components/admin/KnowledgeManager.tsx');
  assert.match(source,/Trung Tâm Quản Lý AI Knowledge/);
  assert.doesNotMatch(source,/Trung Tâm Trợ Lý AI & Quản Lý Tri Thức/);
  assert.doesNotMatch(source,/AI Knowledge Hub & Persona Engine/);
  assert.doesNotMatch(source,/Huấn luyện AI hiểu ngữ cảnh sản phẩm/);
});
test('Knowledge toolbar keeps five buttons and original action callbacks', () => {
  const source = read('src/components/admin/KnowledgeManager.tsx');
  const toolbar = source.split('aria-label="Công cụ AI Knowledge"')[1].split('{/* 5 CORE TABS NAVIGATION */}')[0];
  for (const name of ['Thử Nghiệm Chatbot','Xuất Backup','Nhập Backup','Upload Tài Liệu (PDF/Word/Excel)','Thêm Mục Thủ Công']) assert.match(toolbar,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(toolbar,/Nạp Văn Bản Nhanh/);
  for (const action of ['setShowChatTester','handleExportKnowledgeBackup','handleRestoreKnowledgeBackup','setShowUploadModal','setEditingItem']) assert.match(toolbar,new RegExp(action));
  assert.match(toolbar,/flex-wrap/);
});
test('CMS logo reads Landing logo settings instead of fixed BV mark',()=>{
  const source=read('src/components/admin/AdminDashboard.tsx');
  assert.match(source,/cmsBrandLogo\s*=\s*safeMediaUrl\(safeConfig\.websiteSettings\?\.header\?\.logoUrl/);
  assert.match(source,/<img src=\{cmsBrandLogo\} alt="Bảo Việt"/);
  assert.match(source,/cmsBrandLogo \? .*cms-actual-brand-logo/);
});
test('Logo marquee centers viewport and stays animated for short or long sets',()=>{
  const source=read('src/components/landing/DynamicSection.tsx');
  const css=read('src/index.css');
  assert.match(source,/--cms-logo-count':logoItems\.length/);
  assert.doesNotMatch(source,/centeredLogos/);
  assert.match(css,/\.cms-logo-marquee \{/);
  assert.match(css,/margin-inline:\s*auto/);
  assert.match(css,/animation-iteration-count:infinite/);
  assert.match(source,/cms-logo-marquee-track/);
  assert.match(source,/marqueeDirection==='right'/);
});
test('Search dialog retains public API, URL safety and keyboard controls',()=>{
  const source=read('src/components/landing/SiteSearchOverlay.tsx');
  assert.match(source,/fetch\(`\/api\/search\?q=/);
  assert.match(source,/credentials:'same-origin'/);
  assert.match(source,/safeNavigationUrl\(result\.url,true\)/);
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(source,/e\.key==='Enter'/);
  assert.match(source,/aria-live="polite"/);
  assert.doesNotMatch(source,/<Sparkles/);
});
