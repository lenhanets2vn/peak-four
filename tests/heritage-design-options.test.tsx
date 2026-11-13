import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { defaultLandingConfig } from '../src/data/defaultConfig';
import { normalizeLandingConfig } from '../src/utils/configDefaults';
import { heritageButton, heritageColors, heritageFooter, heritageHeader, heritageNavigation, heritageSection, heritageTypography } from '../src/utils/heritageDesign';
import { FONT_PRESETS, loadAllConfigFonts } from '../src/utils/fontPresets';
import { LandingPage } from '../src/components/landing/LandingPage';
import { resolveButtonDesign } from '../src/utils/styleResolver';

test('heritage recipes preserve existing content and contact destinations', () => {
 const header={...defaultLandingConfig.websiteSettings!.header,hotline:'0900000000',logoLink:'/lien-he',cta:{text:'Liên hệ',action:{type:'internal' as const,target:'/lien-he'}}};
 const updated=heritageHeader(header);
 assert.equal(updated.hotline,'0900000000');
 assert.equal(updated.logoLink,'/lien-he');
 assert.equal(updated.cta?.action?.target,'/lien-he');
 assert.equal(updated.showUtilityRow,false);
 assert.equal(heritageNavigation({...defaultLandingConfig.websiteSettings!.navigation,items:[{id:'a',label:'Trang chủ',order:1,action:{type:'internal',target:'/'}}]}).items[0].action.target,'/');
 const footer=heritageFooter({...defaultLandingConfig.footer,email:'hello@example.test'});
 assert.equal(footer.email,'hello@example.test');
 assert.equal(footer.customBgColor,'#0B0C0E');
 const section=heritageSection({id:'a',type:'customContent',title:'Nội dung riêng',subtitle:'',enabled:true,order:1,content:'Giữ nguyên'} as any,'editorial-split');
 assert.equal(section.content,'Giữ nguyên');
 assert.equal(section.layoutSettings?.columns,2);
 assert.equal(section.design?.backgroundColor,'#14161B');
 assert.equal(heritageButton.motionStyle,'sweep');
 assert.equal(heritageColors.goldAccent,'#C5A880');
 assert.equal(resolveButtonDesign({websiteSettings:{...defaultLandingConfig.websiteSettings!,colors:heritageColors}} as any).textColor,'#0B0C0E');
 assert.match(heritageTypography.h1.fontFamily!,/Cormorant/);
});

test('selected fonts load and cinematic Hero with editorial section renders without duplicating the lead form', () => {
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test/'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location});
 const config=normalizeLandingConfig({...defaultLandingConfig,headline:'Gia đình và di sản',subtitle:'Một kế hoạch dài hạn',heroBadge:'TƯ VẤN RIÊNG',heroLayoutMode:'cinematic',heroBackgroundImage:'https://example.test/hero.jpg',heroBenefits:[{id:'one',title:'Bảo toàn',text:'Điều khách hàng tự viết'}],countdown:{...defaultLandingConfig.countdown,enabled:false},formFields:[{id:'phone',name:'phone',label:'Số điện thoại',type:'tel',required:true,order:1,visible:true}] as any,websiteSettings:{...defaultLandingConfig.websiteSettings!,typography:heritageTypography,colors:heritageColors,header:heritageHeader(defaultLandingConfig.websiteSettings!.header),navigation:heritageNavigation(defaultLandingConfig.websiteSettings!.navigation)},sections:[heritageSection({id:'one',type:'customContent',title:'Khối thử',subtitle:'',enabled:true,order:1} as any,'editorial-light')]});
 loadAllConfigFonts(config);
 assert.ok(dom.window.document.getElementById('gf-cormorant-garamond'));
 assert.ok(dom.window.document.getElementById('gf-jetbrains-mono'));
 assert.ok(FONT_PRESETS.some(font=>font.id==='JetBrains Mono'));
 const html=renderToStaticMarkup(<LandingPage config={config} isPreview/>);
 assert.match(html,/cms-hero-cinematic/);
 assert.match(html,/Gia đình và di sản/);
 assert.match(html,/cms-section-editorial-light/);
 assert.doesNotMatch(html,/id="lead-form-section"/);
 assert.match(html,/cms-header-glass-dark/);
 dom.window.close();
});

test('editorial product layout switches details while keeping each item CTA destination', async () => {
 const { createRoot }=await import('react-dom/client');
 const { act }=await import('react');
 const { CmsConfigProvider }=await import('../src/context/CmsConfigContext');
 const { DynamicSection }=await import('../src/components/landing/DynamicSection');
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.test/'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,IS_REACT_ACT_ENVIRONMENT:true});
 const section=heritageSection({id:'services',type:'products',title:'Các giải pháp',subtitle:'',order:1,enabled:true,items:[{id:'one',title:'Bảo vệ',description:'Chi tiết đầu',ctaText:'Xem đầu',cta:{action:{type:'url',target:'/dau'}}},{id:'two',title:'Kế thừa',description:'Chi tiết sau',ctaText:'Xem sau',cta:{action:{type:'url',target:'/sau'}}}]} as any,'editorial-dark');
 section.layoutSettings={...section.layoutSettings,cardsLayout:'editorial-panel'};
 const config=normalizeLandingConfig({...defaultLandingConfig,sections:[section]});
 const root=createRoot(dom.window.document.getElementById('root')!);
 try {
  await act(async()=>root.render(<CmsConfigProvider config={config}><DynamicSection section={section}/></CmsConfigProvider>));
  assert.match(dom.window.document.querySelector('[role="tabpanel"]')?.textContent||'',/Chi tiết đầu/);
  const second=dom.window.document.querySelectorAll('[role="tab"]')[1];
  await act(async()=>second.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
  const panel=dom.window.document.querySelector('[role="tabpanel"]')!;
  assert.match(panel.textContent||'',/Chi tiết sau/);
  assert.match(panel.textContent||'',/Xem sau/);
  assert.equal(second.getAttribute('aria-selected'),'true');
 } finally {await act(async()=>root.unmount());dom.window.close();}
});
