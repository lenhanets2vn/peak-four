import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { normalizeLandingConfig } from '../src/utils/configDefaults';

test('category article starts directly below the shared header when its Hero is empty', async () => {
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/article'});
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  (globalThis as any).location=dom.window.location;
  const { LandingPage }=await import('../src/components/landing/LandingPage');
  const config=normalizeLandingConfig({
    headline:'',subtitle:'',heroBadge:'',heroBenefits:[],heroImage:'',heroSlides:[],heroCtaPrimary:'',heroCtaSecondary:'',formFields:[],
    websiteSettings:{seo:{slug:'/article'}} as any,
    sections:[{id:'article',type:'blogPost',title:'Tin tức',subtitle:'',order:1,enabled:true,blog:{html:'<p>Đoạn đầu</p>',layout:'two-column'}} as any],
  });
  const markup=renderToStaticMarkup(<LandingPage config={config} isPreview/>);
  assert.doesNotMatch(markup,/id="hero-main"/);
  assert.match(markup,/id="section-article"/);
  assert.match(markup,/Đoạn đầu/);
  dom.window.close();
});

test('category preview retains multiple edited blocks and hides disabled blocks', async () => {
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/tin-tuc?preview_token=draft'});
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  (globalThis as any).location=dom.window.location;
  const { LandingPage }=await import('../src/components/landing/LandingPage');
  const config=normalizeLandingConfig({
    headline:'',subtitle:'',heroBadge:'',heroBenefits:[],heroImage:'',heroSlides:[],heroCtaPrimary:'',heroCtaSecondary:'',formFields:[],
    websiteSettings:{seo:{slug:'/tin-tuc'}} as any,
    sections:[
      {id:'intro',type:'customContent',title:'Giới thiệu',subtitle:'',content:'Nội dung khối đầu tiên',order:1,enabled:true},
      {id:'post',type:'customContent',title:'Bản tin',subtitle:'',content:'Nội dung bài đăng',order:2,enabled:true},
      {id:'hidden',type:'customContent',title:'Không hiển thị',subtitle:'',order:3,enabled:false},
    ] as any,
  });
  const markup=renderToStaticMarkup(<LandingPage config={config} isPreview/>);
  assert.doesNotMatch(markup,/id="hero-main"/);
  assert.match(markup,/Nội dung khối đầu tiên/);
  assert.match(markup,/Nội dung bài đăng/);
  assert.doesNotMatch(markup,/Không hiển thị/);
  assert.ok(markup.indexOf('Nội dung khối đầu tiên')<markup.indexOf('Nội dung bài đăng'));
  dom.window.close();
});

test('category preview API loads the draft by token', async () => {
  const oldFetch=globalThis.fetch;
  const draft=normalizeLandingConfig({sections:[{id:'draft',type:'customContent',title:'Nội dung nháp',subtitle:'',order:1,enabled:true}] as any});
  let requested='';
  globalThis.fetch=(async (url:any) => {requested=String(url);return {ok:true,json:async()=>draft} as any;}) as typeof fetch;
  try {
    const { getPreviewConfig }=await import('../src/services/api');
    const result=await getPreviewConfig('category token');
    assert.match(requested,/\/api\/config\/preview\?token=category%20token/);
    assert.equal(result.sections[0].title,'Nội dung nháp');
  } finally {globalThis.fetch=oldFetch;}
});
