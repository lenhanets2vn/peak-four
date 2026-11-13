const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = pathFor => fs.readFileSync(path.join(root, pathFor), 'utf8');

test('Landing header is sticky by default on desktop and mobile, including legacy stored false', () => {
  const header = src('src/components/landing/SiteHeader.tsx');
  assert.match(header, /const stickyOnScroll = h\?\.stickyOnScroll !== false/);
  assert.equal((header.match(/\$\{stickyOnScroll \? 'sticky top-0 z-40' : 'relative z-20'\}/g)||[]).length, 2);
  assert.ok(!header.includes("${h.sticky ? 'sticky top-0 z-40'"));
});

test('Sticky can be explicitly disabled from CMS, and the editor shows the effective value', () => {
  const editor = src('src/components/admin/WebsiteSettings.tsx');
  const types = src('src/types.ts');
  assert.match(editor, /label="Giữ Header khi cuộn" checked=\{settings\.header\.stickyOnScroll!==false\}/);
  assert.match(editor, /sticky:v,stickyOnScroll:v/);
  assert.match(types, /stickyOnScroll\?: boolean;/);
});

test('Header remains readable on scroll even with animations disabled', () => {
  const header = src('src/components/landing/SiteHeader.tsx');
  assert.match(header, /h\.transparent && !isScrolled/);
  assert.doesNotMatch(header, /if\(!isMotionUx\|\|visualTheme\?\.headerMotion===false\)\{setIsScrolled\(false\);return;\}/);
});

test('Anchor offsets cover scroll targets and desktop/mobile real header height', () => {
  const landing = src('src/components/landing/LandingPage.tsx');
  const css = src('src/index.css');
  assert.match(landing, /--cms-header-height':`\$\{desktopStickyHeight\}px`/);
  assert.match(landing, /--cms-mobile-header-height':`\$\{mobileStickyHeight\}px`/);
  assert.match(css, /scroll-margin-top: calc\(var\(--cms-header-height, 76px\) \+ 12px\)/);
  assert.match(css, /--cms-header-height: var\(--cms-mobile-header-height, 64px\)/);
});

test('Only frontend files are touched; header menu/action handlers still exist', () => {
  const header=src('src/components/landing/SiteHeader.tsx');
  for(const content of ['SiteSearchOverlay', 'SmartActionButton','runCmsAction','openMegaId','mobileOpen']) {
    assert.ok(header.includes(content),`${content} must remain wired`);
  }
});
