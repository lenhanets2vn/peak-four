import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

test('missing category page shows an error with retry and CMS access', async () => {
  const dom = new JSDOM('<!doctype html><div id="app"></div>', {url:'https://example.test/danh-muc-khong-ton-tai'});
  const oldFetch=globalThis.fetch;
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  (globalThis as any).location=dom.window.location;
  (globalThis as any).sessionStorage=dom.window.sessionStorage;
  (globalThis as any).history=dom.window.history;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
  globalThis.fetch=(async () => ({ok:false,status:404,json:async()=>({error:'Không tìm thấy trang danh mục.'})} as Response)) as typeof fetch;
  const root=createRoot(dom.window.document.getElementById('app')!);
  try {
    const {default:App}=await import('../src/App');
    await act(async () => {root.render(<App />);});
    const text=dom.window.document.body.textContent || '';
    assert.match(text,/Landing Page không khả dụng/);
    assert.match(text,/Không tìm thấy trang danh mục/);
    assert.match(text,/Tải lại/);
    assert.match(text,/Đăng nhập/);
    assert.doesNotMatch(text,/Đang tải\.\.\./);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch=oldFetch;
    dom.window.close();
  }
});
