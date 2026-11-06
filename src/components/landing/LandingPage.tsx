import React,{useEffect,useMemo,useRef} from 'react';
import { LandingPageConfig } from '../../types';
import { CountdownBanner } from './CountdownBanner';import { HeroSection } from './HeroSection';import { DynamicSection } from './DynamicSection';import { FooterSection } from './FooterSection';import { MobileStickyCTA } from './MobileStickyCTA';import { LeadForm } from './LeadForm';import { SiteHeader } from './SiteHeader';import { HeaderBannerSlider } from './HeaderBannerSlider';import { PopupHost } from './PopupHost';import { CmsConfigProvider } from '../../context/CmsConfigContext';import { AnalyticsTracker } from './AnalyticsTracker';import { getFormDefinition, normalizeLandingConfig } from '../../utils/configDefaults';
import { loadAllConfigFonts } from '../../utils/fontPresets';
import { AiChatbotWidget } from '../chat/AiChatbotWidget';
import { applySiteFavicon } from '../../utils/siteFavicon';
interface Props{config?:LandingPageConfig|null;onAdminClick?:()=>void;isPreview?:boolean;}
export const LandingPage:React.FC<Props>=({config:rawConfig,onAdminClick,isPreview=false})=>{
 const config=useMemo(()=>normalizeLandingConfig(rawConfig),[rawConfig]);
 const renderConfig=useMemo(()=>{
   const slug=String(config.websiteSettings?.seo?.slug||'/').trim().replace(/^https?:\/\/[^/]+/i,'').split(/[?#]/)[0].replace(/\/+$/,'')||'/';
   const isCategoryPage=slug!=='/';
   if(!isCategoryPage)return config;
   const primaryDefaults=new Set(['Nhận Báo Phí & Tư Vấn Miễn Phí','Nhận Báo Phí Miễn Phí']);
   const secondaryDefaults=new Set(['Khám Phá Các Gói Bảo Hiểm']);
   const next={...config};
   if(primaryDefaults.has(String(next.heroCtaPrimary||'').trim())) next.heroCtaPrimary='';
   if(secondaryDefaults.has(String(next.heroCtaSecondary||'').trim())) next.heroCtaSecondary='';
   if(next.heroPrimaryCta?.text&&primaryDefaults.has(String(next.heroPrimaryCta.text).trim())) next.heroPrimaryCta=undefined;
   if(next.heroSecondaryCta?.text&&secondaryDefaults.has(String(next.heroSecondaryCta.text).trim())) next.heroSecondaryCta=undefined;
   return next;
 },[config]);

 useEffect(() => {
   loadAllConfigFonts(config);
 }, [config]);

 const colors=config.websiteSettings?.colors,typography=config.websiteSettings?.typography;
 const seo=config.websiteSettings?.seo;
 const effectiveBodyFont=typography?.body?.fontFamily||seo?.fontFamily;
 const effectiveHeadingFont=typography?.h1?.fontFamily||seo?.headingFontFamily;
 const t=(style:any,prefix:string)=>({
  [`--cms-${prefix}-family`]:style?.fontFamily ? style.fontFamily : (prefix.startsWith('h')&&effectiveHeadingFont?effectiveHeadingFont:'inherit'),
  [`--cms-${prefix}-size`]:style?.fontSize?`${style.fontSize}px`:'inherit',
  [`--cms-${prefix}-tablet`]:style?.tabletSize?`${style.tabletSize}px`:'inherit',
  [`--cms-${prefix}-mobile`]:style?.mobileSize?`${style.mobileSize}px`:'inherit',
  [`--cms-${prefix}-weight`]:style?.fontWeight||'inherit',
  [`--cms-${prefix}-line`]:style?.lineHeight||'normal',
  [`--cms-${prefix}-spacing`]:style?.letterSpacing!==undefined?`${style.letterSpacing}px`:'normal',
  [`--cms-${prefix}-color`]:style?.color||'inherit',
  [`--cms-${prefix}-align`]:style?.textAlign||'inherit',
 });
 const headerConfig=config.websiteSettings?.header;
 const stickyHeaderEnabled=headerConfig?.stickyOnScroll!==false && headerConfig?.enabled!==false;
 const desktopStickyHeight=stickyHeaderEnabled && headerConfig?.desktopEnabled!==false ? Number(headerConfig?.height||76)+(headerConfig?.showUtilityRow===false?0:42) : 0;
 const mobileStickyHeight=stickyHeaderEnabled && headerConfig?.mobileEnabled!==false ? Number(headerConfig?.mobileHeight||64) : 0;
 const visualTheme=config.websiteSettings?.visualTheme;
 const isMotionUx=visualTheme?.uxEnabled!==false;
 const siteRef=useRef<HTMLDivElement>(null);
 const rootStyle:any={
  '--cms-primary':colors?.primary||'#0054a6','--cms-secondary':colors?.secondary||'#003870','--cms-gold':colors?.goldAccent||'#bb972f',
  '--cms-background-light':colors?.backgroundLight||'#ffffff','--cms-background-dark':colors?.backgroundDark||'#0a2540','--cms-border':colors?.border||'#e5e7eb',
  '--cms-button-primary':colors?.buttonPrimary||colors?.primary||'#0054a6','--cms-button-hover':colors?.buttonHover||colors?.secondary||'#003f7d',
  '--cms-text-primary':colors?.textPrimary||'#111827','--cms-text-secondary':colors?.textSecondary||'#4b5563',
  '--cms-header-height':`${desktopStickyHeight}px`,
  '--cms-mobile-header-height':`${mobileStickyHeight}px`,
  ...t(typography?.h1,'h1'),...t(typography?.h2,'h2'),...t(typography?.h3,'h3'),...t(typography?.h4,'h4'),...t(typography?.body,'body'),...t(typography?.caption,'caption'),...t(typography?.button,'button'),
  '--cms-motion-bg': colors?.backgroundLight||'#ffffff',
  '--cms-motion-surface': colors?.backgroundLight||'#ffffff',
  '--cms-motion-text': colors?.textPrimary||'#111827',
  '--cms-motion-muted': colors?.textSecondary||'#4b5563',
  '--cms-motion-accent': colors?.primary||'#0054a6',
  '--cms-motion-border': colors?.border||'#e5e7eb',
  '--cms-motion-distance': `${visualTheme?.revealDistance??42}px`,
  '--cms-motion-duration': `${visualTheme?.revealDurationMs??900}ms`,
  fontFamily:effectiveBodyFont||undefined,color:colors?.textPrimary
 };
  useEffect(()=>{
    const root=siteRef.current;
    if(!root||isPreview||!isMotionUx||visualTheme?.motionEnabled===false)return;
    const prefersReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const nodes=(Array.from(root.querySelectorAll('#hero-main, main > *, main section, footer')) as HTMLElement[])
      .filter(node=>!node.closest('[data-section-motion="off"], [data-section-motion="custom"]'));
    let lastY=window.scrollY||0;
    let direction:'down'|'up'='down';
    const onDirection=()=>{const y=window.scrollY||0;direction=y>lastY?'down':y<lastY?'up':direction;lastY=y;root.dataset.scrollDirection=direction;};
    window.addEventListener('scroll',onDirection,{passive:true});
    nodes.forEach((node,index)=>{
      node.classList.add('cms-motion-reveal','cms-motion-from-bottom');
      node.style.setProperty('--cms-motion-delay', `${Math.min(index,8)*(visualTheme?.revealStaggerMs??80)}ms`);
      if(prefersReduced) node.classList.add('cms-motion-visible');
    });
    if(prefersReduced)return()=>window.removeEventListener('scroll',onDirection);
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        const el=entry.target as HTMLElement;
        if(entry.isIntersecting){
          el.classList.add('cms-motion-visible');
          return;
        }
        if(visualTheme?.bidirectionalReveal===false){
          if(entry.boundingClientRect.top>0)el.classList.remove('cms-motion-visible');
          return;
        }
        el.classList.remove('cms-motion-visible','cms-motion-from-top','cms-motion-from-bottom');
        const exitedAbove=entry.boundingClientRect.bottom<=0;
        const exitedBelow=entry.boundingClientRect.top>=window.innerHeight;
        if(exitedAbove||direction==='up') el.classList.add('cms-motion-from-top');
        else if(exitedBelow||direction==='down') el.classList.add('cms-motion-from-bottom');
      });
    },{threshold:[0,0.08,0.18],rootMargin:'4% 0px -8% 0px'});
    nodes.forEach(node=>observer.observe(node));
    return()=>{observer.disconnect();window.removeEventListener('scroll',onDirection);};
  },[isPreview,isMotionUx,visualTheme?.motionEnabled,visualTheme?.bidirectionalReveal,visualTheme?.revealStaggerMs]);

  useEffect(()=>{
    const root=siteRef.current;if(!root||isPreview)return;
    const nodes=Array.from(root.querySelectorAll('[data-section-motion="custom"]')) as HTMLElement[];
    if(!nodes.length)return;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reduced||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      const node=entry.target as HTMLElement;
      if(entry.isIntersecting){node.classList.add('cms-local-visible');if(node.dataset.motionOnce!=='false')observer.unobserve(node);}
      else if(node.dataset.motionOnce==='false')node.classList.remove('cms-local-visible');
    }),{threshold:0.08});
    nodes.forEach(node=>{node.classList.add('cms-local-ready');observer.observe(node);});
    return()=>{observer.disconnect();nodes.forEach(node=>node.classList.remove('cms-local-ready','cms-local-visible'));};
  },[isPreview,renderConfig.sections]);

  useEffect(()=>{
    const root=siteRef.current;
    if(!root||!isMotionUx||(visualTheme?.sectionParallax===false&&visualTheme?.parallaxEnabled===false))return;
    let raf=0;
    const layers=()=>(Array.from(root.querySelectorAll('#hero-main, main section')) as HTMLElement[])
      .filter(node=>!node.closest('[data-section-motion="off"], [data-section-motion="custom"]'));
    const update=()=>{
      raf=0;
      const vh=Math.max(window.innerHeight,1);
      root.style.setProperty('--cms-motion-scroll',`${Math.max(-48,Math.min((window.scrollY||0)*0.035,48))}px`);
      layers().forEach(el=>{
        const r=el.getBoundingClientRect();
        const center=r.top+r.height/2;
        const progress=Math.max(-1,Math.min(1,(center-vh/2)/(vh+r.height)));
        el.style.setProperty('--cms-local-parallax',`${(-progress*28).toFixed(2)}px`);
        el.style.setProperty('--cms-local-progress',`${Math.abs(progress).toFixed(3)}`);
      });
    };
    const onScroll=()=>{if(!raf)raf=requestAnimationFrame(update);};
    update();window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);
    return()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);if(raf)cancelAnimationFrame(raf);};
  },[isMotionUx,visualTheme?.sectionParallax,visualTheme?.parallaxEnabled]);

  useEffect(()=>{
    const seo=config.websiteSettings?.seo;if(!seo)return;
    applySiteFavicon(config, seo.faviconUrl);
    document.title=seo.seoTitle||seo.pageTitle||config.brandName||document.title;
    const meta=(attr:string,key:string,value?:string)=>{
      let el=document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement|null;
      if(!value){el?.remove();return;}
      if(!el){el=document.createElement('meta');el.setAttribute(attr,key);document.head.appendChild(el);}
      el.content=value;
    };
    meta('name','description',seo.metaDescription);
    meta('name','keywords',seo.keywords);
    meta('property','og:title',seo.ogTitle||seo.seoTitle||seo.pageTitle);
    meta('property','og:description',seo.ogDescription||seo.metaDescription);
    meta('property','og:image',seo.ogImage);
    meta('property','og:type',seo.ogType||'website');
    meta('property','og:site_name',seo.ogSiteName||config.brandName||'Bảo Việt Insurance');
    const autoCanonical=typeof window!=='undefined' ? `${window.location.origin}${(seo.slug||'/')==='/'?'':(seo.slug||'')}` : '';
    const resolvedCanonical=!isPreview ? (seo.canonical||autoCanonical) : '';
    meta('property','og:url',resolvedCanonical);
    meta('name','twitter:card',seo.twitterCard||'summary_large_image');
    meta('name','twitter:title',seo.twitterTitle||seo.ogTitle||seo.seoTitle||seo.pageTitle);
    meta('name','twitter:description',seo.twitterDescription||seo.ogDescription||seo.metaDescription);
    meta('name','twitter:image',seo.twitterImage||seo.ogImage);
    meta('name','robots',isPreview?'noindex,nofollow':(seo.robots||'index,follow'));

    let link=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;
    if(resolvedCanonical){
      if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}
      link.href=resolvedCanonical;
    } else link?.remove();

    let ldJson=document.head.querySelector('script[data-cms-ldjson="true"]') as HTMLScriptElement|null;
    if(seo.structuredDataJson&&!isPreview){
      if(!ldJson){ldJson=document.createElement('script');ldJson.type='application/ld+json';ldJson.setAttribute('data-cms-ldjson','true');document.head.appendChild(ldJson);}
      ldJson.textContent=seo.structuredDataJson;
    } else ldJson?.remove();
  },[config.websiteSettings?.seo,config.brandName,isPreview]);
 const sections=[...(renderConfig.sections||[])].filter(s=>!s.deletedAt&&s.enabled!==false&&s.status!=='inactive').sort((a,b)=>a.order-b.order);
 const categoryPage=(renderConfig.websiteSettings?.seo?.slug||'/')!=='/';
 const hasHero=Boolean(renderConfig.headline?.trim()||renderConfig.subtitle?.trim()||renderConfig.heroBadge?.trim()||renderConfig.heroImage||renderConfig.heroBackgroundImage||renderConfig.heroSlides?.some(s=>s.url&&s.enabled!==false)||renderConfig.heroBenefits?.length||renderConfig.heroPrimaryCta?.text||renderConfig.heroCtaPrimary||renderConfig.formFields?.some(f=>f.visible!==false&&!f.deletedAt));
 const showHero=!categoryPage||hasHero;
 return <CmsConfigProvider config={renderConfig}><><AnalyticsTracker config={renderConfig} isPreview={isPreview}/><div ref={siteRef} id="cms-top" data-ux-motion={isMotionUx?'enabled':'disabled'} className={`cms-site cms-modern-landing min-h-screen ${isMotionUx?'cms-ux-motion':''} ${isMotionUx&&visualTheme?.filmGrain?'cms-film-grain':''} ${isMotionUx&&visualTheme?.buttonMotion!==false?'cms-motion-buttons':''} ${isMotionUx&&visualTheme?.cardMotion!==false?'cms-motion-cards':''} ${renderConfig.footer?.showMobileStickyBar!==false?'pb-16 md:pb-0':''}`} style={rootStyle}>
  <SiteHeader config={renderConfig} onAdminClick={onAdminClick}/><HeaderBannerSlider config={renderConfig}/>{renderConfig.countdown.enabled&&<CountdownBanner config={renderConfig.countdown} variant="banner"/>}{showHero&&<HeroSection config={renderConfig} onAdminClick={onAdminClick}/>}
  <main>{sections.map(sec=>{const motion=sec.motion;const style={'--sec-local-duration':`${Math.min(3000,Math.max(200,motion?.durationMs??700))}ms`,'--sec-local-delay':`${Math.min(2000,Math.max(0,motion?.delayMs??0))}ms`,'--sec-local-distance':`${Math.min(160,Math.max(0,motion?.distancePx??32))}px`} as React.CSSProperties;let child:React.ReactNode;if(!sec.showLeadForm || sec.type==='blogPost')child=<DynamicSection section={sec}/>;else {const formDef=getFormDefinition(renderConfig,sec.formId||'main');const first=sec.leadFormPosition==='left';const fw=sec.leadFormWidth==='narrow'?'lg:col-span-4':'lg:col-span-5',cw=sec.leadFormWidth==='narrow'?'lg:col-span-8':'lg:col-span-7';const form=<div className={`${fw} px-4 sm:px-6 lg:px-0 py-8 sm:py-12 flex items-center`}><div className="w-full bg-white rounded-2xl border border-neutral-200 shadow-lg p-4 sm:p-6 sticky top-4"><LeadForm instanceId={`section-${sec.id}`} fields={formDef.fields} settings={{...formDef.settings,formId:formDef.id}} initialTracking={{section:sec.anchorId||sec.id,formId:formDef.id}}/></div></div>;const content=<div className={`${cw} min-w-0`}><DynamicSection section={sec}/></div>;child=<div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">{first?form:content}{first?content:form}</div>;}return <div key={sec.id} className={sec.design?.styleVariant?`cms-section-${sec.design.styleVariant}`:undefined} data-section-motion={motion?.mode||'inherit'} data-motion-effect={motion?.effect||'fade'} data-motion-once={motion?.once!==false?'true':'false'} style={style}>{child}</div>})}</main>
  <PopupHost config={renderConfig}/>
  <AiChatbotWidget
    previewMode={isPreview}
    config={renderConfig.aiChatbot}
    pageTitle={renderConfig.websiteSettings?.seo?.pageTitle || renderConfig.brandName}
    brandName={renderConfig.brandName || 'Bảo hiểm Bảo Việt'}
    hotline={renderConfig.footer?.hotline}
  />
  <FooterSection config={renderConfig} onAdminClick={onAdminClick}/>{renderConfig.footer?.showMobileStickyBar!==false&&(renderConfig.heroPrimaryCta?.text||renderConfig.heroCtaPrimary)&&<MobileStickyCTA config={renderConfig} ctaText={renderConfig.heroPrimaryCta?.text||renderConfig.heroCtaPrimary||''} badgeText="Tư vấn nhanh"/>}
 </div></></CmsConfigProvider>;
};
