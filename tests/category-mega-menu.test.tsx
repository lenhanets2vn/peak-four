import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { JSDOM } from 'jsdom';
import { normalizeLandingConfig } from '../src/utils/configDefaults';
import { CmsConfigProvider } from '../src/context/CmsConfigContext';
import { SiteHeader } from '../src/components/landing/SiteHeader';

test('category menu opens, changes groups and closes with Escape; links are sanitized', async () => {
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.test/'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,IS_REACT_ACT_ENVIRONMENT:true});
 const config=normalizeLandingConfig({websiteSettings:{navigation:{enabled:true,type:'main',motionStyle:'red-line',items:[{id:'insurance',label:'Bảo hiểm',order:1,action:{type:'internal',target:'/bao-hiem'},megaMenu:{enabled:true,groups:[{id:'individual',label:'Cá nhân',links:[{id:'safe',title:'Sức khỏe',url:'/suc-khoe'},{id:'unsafe',title:'Không an toàn',url:'javascript:alert(1)'}]},{id:'company',label:'Doanh nghiệp',links:[{id:'business',title:'Tài sản',url:'/tai-san'}]}]}},{id:'home',label:'Trang chủ',order:2,action:{type:'internal',target:'/'}}]} as any} as any});
 const root=createRoot(dom.window.document.getElementById('root')!);
 try {
  await act(async()=>root.render(<CmsConfigProvider config={config}><SiteHeader config={config}/></CmsConfigProvider>));
  const insurance=[...dom.window.document.querySelectorAll('button')].find(el=>el.textContent?.includes('Bảo hiểm')&&el.classList.contains('cms-nav-red-line'))!;
  assert.ok(insurance);
  await act(async()=>insurance.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
  assert.equal(insurance.getAttribute('aria-expanded'),'true');
  assert.ok(dom.window.document.querySelector('a[href="/suc-khoe"]'));
  assert.ok(!dom.window.document.querySelector('a[href^="javascript:"]'));
  const group=[...dom.window.document.querySelectorAll('button')].find(el=>el.textContent?.includes('Doanh nghiệp'))!;
  await act(async()=>group.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
  assert.ok(dom.window.document.querySelector('a[href="/tai-san"]'));
  await act(async()=>dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(dom.window.document.querySelector('.cms-mega-panel'),null);
 } finally {await act(async()=>root.unmount());dom.window.close();}
});

test('minimal visual option applies to one section and migrates the earlier page setting', async () => {
 const { renderToStaticMarkup }=await import('react-dom/server');
 const { LandingPage }=await import('../src/components/landing/LandingPage');
 const config=normalizeLandingConfig({sections:[{id:'first',type:'customContent',title:'Đầu tiên',subtitle:'',order:1,enabled:true,design:{styleVariant:'minimal-finance'}},{id:'second',type:'customContent',title:'Thứ hai',subtitle:'',order:2,enabled:true}] as any});
 const markup=renderToStaticMarkup(<LandingPage config={config} isPreview/>);
 assert.match(markup,/class="cms-section-minimal-finance"[^>]*>\s*<section id="section-first"/);
 assert.doesNotMatch(markup,/class="cms-section-minimal-finance"[^>]*>\s*<section id="section-second"/);
 const legacy=normalizeLandingConfig({websiteSettings:{visualTheme:{pageStyle:'minimal-finance'} as any} as any,sections:[{id:'legacy',type:'customContent',title:'Legacy',subtitle:'',order:1,enabled:true}] as any});
 assert.equal(legacy.sections[0].design?.styleVariant,'minimal-finance');
});
