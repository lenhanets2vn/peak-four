import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { formatTelegramLead } from '../src/services/telegramChatLogger';
import { applyFavicon } from '../src/utils/siteFavicon';
import { normalizeLandingConfig } from '../src/utils/configDefaults';
import { SiteHeader } from '../src/components/landing/SiteHeader';
import { FooterSection } from '../src/components/landing/FooterSection';
import { HeroSection } from '../src/components/landing/HeroSection';
import { HeaderBannerSlider } from '../src/components/landing/HeaderBannerSlider';
import { CmsConfigProvider } from '../src/context/CmsConfigContext';

test('Telegram lead uses Vietnamese labels and Vietnam time, without invented campaign or duplicate contact fields', () => {
  const text=formatTelegramLead({id:'lead_1',submittedAt:'2026-09-29T15:30:00.000Z',name:'Hải',phone:'1234567890',customResponses:{name:'Hải',phone:'1234567890',insurancePackage:'Bảo hiểm tai nạn',memo:'Gọi buổi chiều'},fieldLabels:{insurancePackage:'Gói bảo hiểm',memo:'Ghi chú tư vấn'},tracking:{utmCampaign:'lead_gen_campaign'}});
  assert.match(text,/Khách hàng: Hải/);
  assert.match(text,/Số điện thoại: 1234567890/);
  assert.match(text,/Gói bảo hiểm: Bảo hiểm tai nạn/);
  assert.match(text,/Ghi chú tư vấn: Gọi buổi chiều/);
  assert.match(text,/Thời gian \(Việt Nam\): 22:30:00 29\/09\/2026/);
  assert.doesNotMatch(text,/lead_gen_campaign|insurancePackage:|Campaign:|• name:|• phone:/);
  assert.match(formatTelegramLead({id:'2',tracking:{utmCampaign:'chien-dich-mua-thu'}}),/Chiến dịch: chien-dich-mua-thu/);
});

test('favicon follows CMS URL and rejects executable protocols', () => {
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://example.test/'});
  (globalThis as any).window=dom.window;(globalThis as any).document=dom.window.document;
  applyFavicon('/brand-icon.png');
  assert.match(dom.window.document.head.innerHTML,/brand-icon\.png/);
  applyFavicon('javascript:alert(1)');
  assert.doesNotMatch(dom.window.document.head.innerHTML,/rel="icon"/);
  dom.window.close();
});

test('CMS destinations render for header, footer, Hero and banner', () => {
  (globalThis as any).location={pathname:'/'};
  const config=normalizeLandingConfig({
    headline:'Giới thiệu',heroImage:'/hero.png',heroImageLink:'/bao-hiem',heroLayoutMode:'split',
    footer:{footerLogoUrl:'/footer.png',footerLogoLink:'/lien-he'} as any,
    websiteSettings:{
      header:{enabled:true,logoUrl:'/logo.png',logoLink:'/bao-hiem',utilityMessage:'Tư vấn rõ ràng',utilityLinks:[{id:'quote',label:'Liên hệ tư vấn',url:'/lien-he'}],banner:{enabled:true,slides:[{id:'banner',imageUrl:'/banner.png',alt:'Bảo hiểm',action:{type:'internal',target:'/bao-hiem'},order:1}]}} as any,
      navigation:{enabled:true,type:'main',fontStyle:'italic',motionStyle:'scale',motionDurationMs:350,items:[{id:'product',label:'Sản phẩm',action:{type:'internal',target:'/bao-hiem'},order:1}]} as any,
    } as any,
  });
  const render=(element:React.ReactNode)=>renderToStaticMarkup(<CmsConfigProvider config={config}>{element}</CmsConfigProvider>);
  const header=render(<SiteHeader config={config}/>);
  assert.match(header,/href="\/bao-hiem"/);
  assert.match(header,/Tư vấn rõ ràng/);
  assert.match(header,/href="\/lien-he"/);
  assert.match(header,/cms-nav-scale/);
  assert.match(header,/font-style:italic/);
  assert.match(render(<FooterSection config={config}/>),/href="\/lien-he"/);
  assert.match(render(<HeroSection config={config}/>),/href="\/bao-hiem"/);
  assert.match(render(<HeaderBannerSlider config={config}/>),/banner\.png/);
  const slideshow=normalizeLandingConfig({...config,heroLayoutMode:'image-form',heroSlides:[{id:'slide-one',url:'/hero-slide.png',alt:'Sức khỏe',link:'/suc-khoe',enabled:true}]});
  assert.match(renderToStaticMarkup(<CmsConfigProvider config={slideshow}><HeroSection config={slideshow}/></CmsConfigProvider>),/href="\/suc-khoe"/);
});
