"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const title = "Bảo hiểm Bảo Việt";
const description = "Bảo hiểm Bảo Việt là thương hiệu top 1 trong lĩnh vực bảo hiểm phi nhân thọ tại Việt Nam.";
const html = fs.readFileSync("index.html", "utf8");
const defaults = fs.readFileSync("src/data/defaultConfig.ts", "utf8");
const seoUi = fs.readFileSync("src/components/admin/SeoManager.tsx", "utf8");
const server = fs.readFileSync("server.ts", "utf8");

test("new-install static HTML is white-label, with no SEO sample brand", () => {
  assert.match(html, /<title>Website<\/title>/);
  assert.doesNotMatch(html,/Bảo Việt|BẢO VIỆT/);
  for (const key of ['name="description"','property="og:description"','name="twitter:description"']) {
    const tag = html.split("\n").find(line => line.includes(key));
    assert.ok(tag?.includes('content=""'), `SEO should be blank for ${key}`);
  }
});

test("new-install default SEO is neutral until CMS Publish", () => {
  const seo = defaults.slice(defaults.indexOf("    seo: {",defaults.indexOf("stylePresets:")));
  assert.doesNotMatch(seo,/top 1 trong lĩnh vực|Bảo hiểm Bảo Việt là/);
  assert.match(seo,/metaDescription: ''/);
});

test("published CMS SEO and existing og:image editor remain functional", () => {
  assert.match(seoUi,/getPageSeo\(/);
  assert.match(seoUi,/savePageSeo\(/);
  assert.match(seoUi,/publishPage\(/);
  assert.match(seoUi,/label="og:image/);
  assert.match(server,/const ogImage=seo\.ogImage \|\| '';/);
  assert.match(server,/<meta property="og:image" content=/);
  assert.match(server,/const seo=publicSeoForPath\(pathname\)/);
});
