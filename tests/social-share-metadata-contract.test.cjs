'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html','utf8');
const defaults = fs.readFileSync('src/data/defaultConfig.ts','utf8');
const seoUi = fs.readFileSync('src/components/admin/SeoManager.tsx','utf8');
const server = fs.readFileSync('server.ts','utf8');

test('a clean installation has no prewritten marketing SEO or social-share description',()=>{
  assert.match(html,/<title>Bảo hiểm Bảo Việt<\/title>/);
  assert.doesNotMatch(html,/Hệ thống quản lý Landing Page và Lead bảo hiểm Bảo Việt/);
  assert.doesNotMatch(html,/top 1 trong lĩnh vực bảo hiểm phi nhân thọ/);
  assert.doesNotMatch(html,/<meta (?:name="description"|property="og:description"|name="twitter:description")/);
  assert.match(html,/<meta name="robots" content="noindex"/);
});

test('unconfigured home SEO fields remain empty until changed in CMS',()=>{
  const seo=defaults.slice(defaults.indexOf('    seo: {',defaults.indexOf('stylePresets:')));
  assert.match(seo,/seoTitle:''/);
  assert.match(seo,/metaDescription:''/);
  assert.match(seo,/ogTitle:''/);
  assert.match(seo,/ogDescription:''/);
});

test('published CMS SEO and existing og:image editor remain functional',()=>{
  assert.match(seoUi,/getPageSeo\(/);
  assert.match(seoUi,/savePageSeo\(/);
  assert.match(seoUi,/publishPage\(/);
  assert.match(seoUi,/label="og:image/);
  assert.match(server,/const ogImage=seo\.ogImage \|\| '';/);
  assert.match(server,/<meta property="og:image" content=/);
  assert.match(server,/const seo=publicSeoForPath\(pathname\)/);
});
