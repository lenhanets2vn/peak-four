const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const hero = read('src/components/landing/HeroSection.tsx');
const header = read('src/components/landing/SiteHeader.tsx');
const landing = read('src/components/landing/LandingPage.tsx');
const content = read('src/components/admin/ContentEditor.tsx');
const css = read('src/index.css');

test('Image-form hero preserves every pixel of campaign slide instead of object-cover cropping', () => {
  assert.match(hero,/cms-hero-responsive-media/);
  assert.match(hero,/object-contain transition-opacity duration-1000/);
  assert.match(css,/\.cms-hero-image-form \.cms-hero-responsive-media/);
  assert.match(css,/max-width: 100%/);
  assert.doesNotMatch(hero,/min-h-\[560px\] sm:min-h-\[680px\]/);
});
test('Responsive Hero keeps CMS height presets and uses two columns at tablet widths', () => {
  assert.match(hero,/cms-hero-height-\$\{/);
  for (const mode of ['compact','normal','large','screen']) assert.match(css,new RegExp(`\\.cms-hero-height-${mode}`));
  assert.match(hero,/md:grid-cols-2/);
  assert.match(hero,/hasConfiguredForm/);
});
test('Lead form is compact only in Hero, keeping field submission intact',()=>{
  assert.match(hero,/cms-hero-lead-form/);
  assert.match(hero,/<LeadForm fields=\{config\?\.formFields \|\| \[\]\}/);
  assert.match(css,/\.cms-hero-image-form \.cms-hero-lead-form form/);
});
test('Sticky header compacts to 54px after scroll and utility bar collapses',()=>{
  assert.match(header,/compactOnScroll = stickyOnScroll && isScrolled/);
  assert.match(header,/desktopRowHeight = compactOnScroll \? 54/);
  assert.match(header,/showUtilityRow!==false&&!compactOnScroll/);
  assert.match(header,/mobileRowHeight = compactOnScroll \? 52/);
  assert.match(landing,/desktopStickyHeight=[^;]*\? 54 : 0/);
});
test('Hero lives under Content section inventory without a standalone Hero settings tab',()=>{
  assert.match(content,/Hero & Form — Khối nội dung đầu trang/);
  assert.match(content,/onClick=\{handleOpenHeroEditor\}/);
  assert.match(content,/Trở về Khối Nội Dung/);
  assert.doesNotMatch(content,/<span>Hero & Nhận Diện Bảo Việt<\/span>/);
});
test('Pricing removed and existing CTA types remain present',()=>{
  assert.ok(!fs.existsSync(path.join(__dirname,'../src/components/landing/PricingPage.tsx')));
  const action=read('src/components/common/SmartActionButton.tsx');
  assert.match(action,/action/i);
});
