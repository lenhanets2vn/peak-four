const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');

function loadRuntime(href = 'https://example.test/') {
  const source = fs.readFileSync('src/utils/actionRuntime.ts', 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = { push: 0, replace: 0, open: 0, scroll: 0 };
  const element = { id: 'lead-form-section', scrollIntoView() { calls.scroll += 1; } };
  const location = new URL(href);
  const window = {
    location,
    history: {
      pushState() { calls.push += 1; },
      replaceState() { calls.replace += 1; },
    },
    open() { calls.open += 1; },
    dispatchEvent() {},
  };
  const context = {
    module: { exports: {} }, exports: {}, require(id) {
      if (id === './urlSafety') return { safeNavigationUrl: value => value };
      return {};
    },
    window,
    document: { getElementById(id) { return id === 'lead-form-section' ? element : null; } },
    URL,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  };
  context.exports = context.module.exports;
  vm.runInNewContext(js, context, { filename: 'actionRuntime.js' });
  return { api: context.module.exports, calls };
}

test('scroll CTA reaches section without changing URL/history', () => {
  const { api, calls } = loadRuntime();
  api.runCmsAction({ type: 'scroll', target: 'lead-form-section' });
  assert.equal(calls.scroll, 1);
  assert.equal(calls.push, 0);
  assert.equal(calls.replace, 0);
  assert.equal(calls.open, 0);
});

test('legacy same-page /#section URL scrolls without exposing hash', () => {
  const { api, calls } = loadRuntime();
  api.runCmsAction({ type: 'url', target: '/#lead-form-section' });
  assert.equal(calls.scroll, 1);
  assert.equal(calls.push, 0);
  assert.equal(calls.replace, 0);
  assert.equal(calls.open, 0);
});
