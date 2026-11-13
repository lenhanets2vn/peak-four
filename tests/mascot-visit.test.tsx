import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { allowedMascots, resolveVisitMascot, storeVisitMascot } from '../src/utils/mascotVisit';
import { AiChatbotWidget } from '../src/components/chat/AiChatbotWidget';
import { normalizeAiChatbotConfig } from '../src/utils/aiConfigDefaults';

function storage() {
  const values = new Map<string,string>();
  return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
}
const config = normalizeAiChatbotConfig({launcherVisual:'mascot',mascotAllowedIds:['fox','otter'],mascotRandomPerVisit:true,mascotAllowVisitorChange:true});

test('random character is restricted to CMS pool and persists across reloads in the same visit',()=>{
  const session=storage();
  assert.equal(resolveVisitMascot(config,session,()=>0.9),'otter');
  assert.equal(resolveVisitMascot(config,session,()=>0),'otter');
  assert.equal(resolveVisitMascot(config,storage(),()=>0),'fox');
  storeVisitMascot('fox',session);
  assert.equal(resolveVisitMascot(config,session,()=>0.9),'fox');
});

test('CMS removal, disabled random, icon mode and unavailable storage have safe fallbacks',()=>{
  const session=storage();
  resolveVisitMascot(config,session,()=>0.9);
  assert.equal(resolveVisitMascot({...config,mascotRandomPerVisit:false},session),'fox');
  storeVisitMascot('otter',session);
  assert.equal(resolveVisitMascot({...config,mascotAllowedIds:['fox']},session),'fox');
  assert.equal(resolveVisitMascot({...config,launcherVisual:'icon',mascotId:'bear'},session),'bear');
  assert.deepEqual(allowedMascots({...config,mascotAllowedIds:['bad','fox','fox']}),['fox']);
  assert.equal(resolveVisitMascot(config,{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},()=>0.9),'otter');
});

test('visitor changes mascot without resetting chat and icon mode hides picker',async()=>{
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.test/'});
  const oldFetch=globalThis.fetch;
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,IS_REACT_ACT_ENVIRONMENT:true,
    requestAnimationFrame:(callback:FrameRequestCallback)=>{callback(0);return 0;}});
  dom.window.HTMLElement.prototype.scrollTo=function(){};
  globalThis.fetch=async()=>({ok:true,json:async()=>({products:[]})} as Response);
  const root=createRoot(dom.window.document.getElementById('root')!);
  const click=async(element:Element)=>act(async()=>{element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));});
  try {
    await act(async()=>root.render(<AiChatbotWidget config={{...config,mascotRandomPerVisit:false,welcomeMessage:'Hội thoại đang giữ'}}/>));
    await click(dom.window.document.querySelector('button[aria-label="Trợ lý AI Bảo Việt"]')!);
    const before=dom.window.document.querySelector('textarea');
    await click([...dom.window.document.querySelectorAll('button')].find(button=>button.textContent==='Đổi nhân vật')!);
    assert.ok(dom.window.document.querySelector('[role="dialog"][aria-label="Chọn nhân vật"]'));
    await click([...dom.window.document.querySelectorAll('#visitor-mascot-picker button')].find(button=>button.textContent==='Otter')!);
    assert.ok(dom.window.document.querySelector('[style*="otter-directions.webp"]'));
    assert.ok(dom.window.document.body.textContent?.includes('Hội thoại đang giữ'));
    assert.equal(dom.window.document.querySelector('textarea'),before);
    assert.equal(resolveVisitMascot(config,dom.window.sessionStorage),'otter');
    await act(async()=>root.render(<AiChatbotWidget config={{...config,launcherVisual:'icon'}}/>));
    assert.ok(!dom.window.document.body.textContent?.includes('Đổi nhân vật'));
    assert.equal(dom.window.document.querySelector('#visitor-mascot-picker'),null);
  } finally {
    await act(async()=>root.unmount());dom.window.close();globalThis.fetch=oldFetch;
  }
});
