const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('CMS brand only renders the Landing logo and no duplicate brand text', () => {
  const admin = source('src/components/admin/AdminDashboard.tsx');
  const css = source('src/styles/cmsTailAdminActual.css');
  assert.match(admin, /cmsBrandLogo\s*=\s*safeMediaUrl\(safeConfig\.websiteSettings\?\.header\?\.logoUrl/);
  assert.match(admin, /<img src=\{cmsBrandLogo\} alt="Bảo Việt" className="cms-actual-brand-logo"/);
  assert.doesNotMatch(admin, /CMS Workspace/);
  assert.doesNotMatch(admin, /cms-actual-brand-label/);
  assert.doesNotMatch(css, /\.cms-actual-brand-label\{display:flex/);
});

test('Partner marquee stays animated for 1–7 logos and centers its viewport', () => {
  const section = source('src/components/landing/DynamicSection.tsx');
  const css = source('src/index.css');
  assert.match(section, /const loopItems=\[\.\.\.logoItems,\.\.\.logoItems\]/);
  assert.match(section, /--cms-logo-count':logoItems\.length/);
  assert.doesNotMatch(section, /centeredLogos/);
  assert.match(css, /\.cms-logo-marquee\s*\{[\s\S]*?margin-inline:\s*auto;/);
  assert.match(css, /\.cms-logo-marquee-track\s*\{\s*flex-wrap:\s*nowrap;/);
  assert.match(css, /@keyframes cms-logo-marquee-loop/);
  assert.match(css, /animation-iteration-count:infinite/);
  assert.doesNotMatch(css, /cms-logo-marquee-centered/);
  assert.match(section, /marqueeDirection==='right'/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
