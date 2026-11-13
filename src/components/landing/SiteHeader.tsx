import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe, LogIn, Menu, PhoneCall, Search, X } from 'lucide-react';
import { LandingPageConfig } from '../../types';
import { SmartActionButton } from '../common/SmartActionButton';
import { runCmsAction, samePageCmsSectionTarget, scrollToCmsSection } from '../../utils/actionRuntime';
import { safeMediaUrl, safeNavigationUrl } from '../../utils/urlSafety';
import { SiteSearchOverlay } from './SiteSearchOverlay';

const shadowMap: Record<string,string> = { none:'none', sm:'0 2px 8px rgba(15,23,42,.08)', md:'0 5px 18px rgba(15,23,42,.12)', lg:'0 10px 30px rgba(15,23,42,.16)' };

function footerUtilityBackground(config: LandingPageConfig): string {
  const f:any=config.footer||{};
  if (f.bgMode==='image' && f.bgImageUrl) return 'rgba(0,0,0,.72)';
  if (f.bgType==='custom' && f.customBgColor) return f.customBgColor;
  if (f.customBgColor) return f.customBgColor;
  if (f.bgType==='brand-blue') return '#003870';
  if (f.bgType==='light') return '#f5f5f5';
  if (f.bgType==='white') return '#ffffff';
  if (f.bgType==='black') return '#000000';
  return '#0b1329';
}

function utilityTextFor(background:string):string {
  const hex=/^#([0-9a-f]{6})$/i.exec(background)?.[1];
  if (!hex) return '#ffffff';
  const [r,g,b]=[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16));
  return (r*299+g*587+b*114)/1000>155 ? '#111827' : '#ffffff';
}

export const SiteHeader: React.FC<{ config: LandingPageConfig; onAdminClick?:()=>void }> = ({ config, onAdminClick }) => {
  const h = config.websiteSettings?.header;
  const [mobileOpen,setMobileOpen]=useState(false);
  const [hoveredNavId,setHoveredNavId]=useState<string|null>(null);
  const [activeNavId,setActiveNavId]=useState<string>('');
  const [openMegaId,setOpenMegaId]=useState<string|null>(null);
  const [activeGroupId,setActiveGroupId]=useState<string|null>(null);
  const [searchOpen,setSearchOpen]=useState(false);
  const visualTheme=config.websiteSettings?.visualTheme;
  const isMotionUx=visualTheme?.uxEnabled!==false;
  const [isScrolled,setIsScrolled]=useState(false);
  useEffect(()=>{
    const onScroll=()=>setIsScrolled(current=>current ? (window.scrollY||0)>16 : (window.scrollY||0)>72);
    onScroll();window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[isMotionUx,visualTheme?.headerMotion]);
  // Legacy documents saved `sticky: false` as the old default. Keep Landing
  // headers pinned by default without mutating drafts or published data.
  // New explicit opt-out is managed by the CMS through `stickyOnScroll`.
  const stickyOnScroll = h?.stickyOnScroll !== false;
  const compactOnScroll = stickyOnScroll && isScrolled;
  const desktopRowHeight = compactOnScroll ? 54 : Math.min(68, Math.max(54, Number(h?.height || 64)));
  const utilityRowHeight = compactOnScroll ? 0 : 30;
  const mobileRowHeight = compactOnScroll ? 52 : Math.min(60, Math.max(50, Number(h?.mobileHeight || 58)));
  const nav=config.websiteSettings?.navigation;
  useEffect(()=>{if(!openMegaId)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpenMegaId(null)};const onPointer=(e:PointerEvent)=>{if(!(e.target as Element).closest?.('[data-cms-mega-root]'))setOpenMegaId(null)};document.addEventListener('keydown',onKey);document.addEventListener('pointerdown',onPointer);return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',onPointer)}},[openMegaId]);
  const menuItems=(nav?.enabled && nav.type==='main' ? [...nav.items].filter(i=>i.enabled!==false).sort((a,b)=>a.order-b.order) : []);

  useEffect(()=>{
    if(!nav?.scrollSpy||nav.type!=='main')return;
    const scrollItems=menuItems.filter(i=>i.action.type==='scroll'&&i.action.target);
    if(!scrollItems.length||typeof IntersectionObserver==='undefined')return;
    const byTarget=new Map(scrollItems.map(i=>[(i.action.target||'').replace(/^#/,'').replace(/^section-/,''),i.id]));
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;const raw=visible.target.id.replace(/^section-/,'');const id=byTarget.get(raw)||byTarget.get(visible.target.id);if(id)setActiveNavId(id);
    },{rootMargin:'-25% 0px -60% 0px',threshold:[.05,.25,.5]});
    scrollItems.forEach(i=>{const id=(i.action.target||'').replace(/^#/,'');const el=document.getElementById(id)||document.getElementById(`section-${id}`);if(el)observer.observe(el);});
    return()=>observer.disconnect();
  },[nav?.scrollSpy,nav?.type,JSON.stringify(menuItems.map(i=>[i.id,i.action.type,i.action.target,i.enabled]))]);

  if (!h || (h.enabled === false && h.enabledExplicit === true)) return null;
  const logo = h.logoUrl || config.headerLogoUrl || config.brandLogoUrl;
  const mobileLogo = h.mobileLogoUrl || config.mobileLogoUrl || logo;
  const phone = h.hotline || config.hotline;
  const logoLink=safeNavigationUrl(h.logoLink,true);
  const desktopEnabled=h.desktopEnabled!==false;
  const mobileEnabled=h.mobileEnabled!==false;
  const themeText=h.textColor||'#111827';
  const desktopBg=h.visualStyle==='glass-dark'?'rgba(11,12,14,.86)':h.transparent && !isScrolled ? 'transparent' : (h.background||'#fff');
  const utilityBackground=h.utilityBackgroundMode==='custom' ? (h.utilityBackground||footerUtilityBackground(config)) : footerUtilityBackground(config);
  const utilityForeground=h.utilityTextColor||utilityTextFor(utilityBackground);
  const mobileBg=h.transparent ? (h.mobileBackground||h.background||'#fff') : (h.mobileBackground||h.background||'#fff');
  const isMenuActive=(item:any)=>openMegaId===item.id||activeNavId===item.id||(item.action.type==='internal'&&!!item.action.target&&location.pathname===item.action.target);
  const menuStyle=(item:any)=>{const active=isMenuActive(item),hover=hoveredNavId===item.id;const fallback=h.textColor||'#111827';const accent=nav?.activeColor||h.textColor||'#0054a6';return {color:active?(item.activeColor||accent):hover?(item.hoverColor||nav?.hoverColor||accent):(item.normalColor||fallback),background:active?(item.activeBackground||nav?.activeBackground||item.background||'transparent'):hover?(nav?.hoverBackground||item.background||'transparent'):(item.background||'transparent'),borderRadius:item.borderRadius??10};};

  const openItem=(item:typeof menuItems[number])=>{if(item.megaMenu?.enabled){setOpenMegaId(v=>v===item.id?null:item.id);setActiveGroupId(item.megaMenu.groups?.[0]?.id||null);return;}setOpenMegaId(null);setActiveNavId(item.id);runCmsAction(item.action,{smoothScroll:nav?.smoothScroll!==false});};
  const hoverItem=(item:typeof menuItems[number])=>{setHoveredNavId(item.id);if(item.megaMenu?.enabled){setOpenMegaId(item.id);setActiveGroupId(item.megaMenu.groups?.[0]?.id||null);}else setOpenMegaId(null);};
  const openMegaItem=menuItems.find(item=>item.id===openMegaId&&item.megaMenu?.enabled);
  const megaGroups=openMegaItem?.megaMenu?.groups||[];
  const activeMegaGroup=megaGroups.find(group=>group.id===activeGroupId)||megaGroups[0];
  const isRedLine=nav?.motionStyle==='red-line'&&isMotionUx&&visualTheme?.categoryBarMotion!==false;
  const isGoldLine=nav?.motionStyle==='champagne-line'&&isMotionUx&&visualTheme?.categoryBarMotion!==false;
  const isMotionLine=isRedLine||isGoldLine;
  const inheritedHeaderCta=h.cta || (config.headerShowCta !== false && config.headerCtaText ? {text:config.headerCtaText,action:{type:'url' as const,target:config.headerCtaUrl||'#lead-form-section'},icon:'→',iconPosition:'right' as const}:undefined);
  const pageCtaMode=config.pageHeaderCta?.mode||'inherit';
  const pageCustomCta=config.pageHeaderCta?.cta;
  const resolvedHeaderCta=pageCtaMode==='hidden'
    ? undefined
    : pageCtaMode==='custom'
      ? {...(inheritedHeaderCta||{}),...(pageCustomCta||{}),action:pageCustomCta?.action||inheritedHeaderCta?.action,design:pageCustomCta?.design||inheritedHeaderCta?.design}
      : inheritedHeaderCta;
  const Logo=({mobile=false}:{mobile?:boolean}) => (logo || mobileLogo) ? <img src={(mobile?mobileLogo:logo) || undefined} alt={config.brandName} style={{height: Math.min(mobile ? (compactOnScroll ? 34 : 38) : (compactOnScroll ? 36 : 40), Number(mobile ? (h.mobileLogoHeight||h.logoHeight||40) : (h.logoHeight||44))), width: mobile ? (h.mobileLogoWidth||h.logoWidth||'auto') : (h.logoWidth||'auto')}} className="max-w-[190px] object-contain"/> : <div className="flex items-center gap-2"><Globe className="w-7 h-7 text-blue-700"/><div><div className="font-black text-sm">{config.brandName || 'Trang web'}</div>{config.brandLogoText && <div className="text-[10px] opacity-70">{config.brandLogoText}</div>}</div></div>;

  return <>
    {desktopEnabled && <header data-cms-mega-root data-landing-sticky={stickyOnScroll ? 'on' : 'off'} onMouseLeave={()=>{setHoveredNavId(null);setOpenMegaId(null)}} className={`hidden md:block ${h.visualStyle==='glass-dark'?'cms-header-glass-dark':''} ${stickyOnScroll ? 'sticky top-0 z-40' : 'relative z-20'} ${h.shadow ? 'shadow-md' : ''}`} style={{background:desktopBg,color:themeText,transition:'background .45s ease, box-shadow .45s ease, transform .35s ease',backdropFilter:isMotionUx&&visualTheme?.headerMotion!==false?'blur(18px) saturate(1.15)':undefined,boxShadow:isMotionUx&&isScrolled?'0 12px 34px rgba(15,23,42,.10)':undefined, ['--cms-header-height' as any]:`${(desktopRowHeight+(h.showUtilityRow===false?0:utilityRowHeight))}px`}}>
      {/* Top utility row: Hotline / Zalo / Login. Header CTA intentionally lives in the main row below. */}
      {h.showUtilityRow!==false&&!compactOnScroll&&<div className="border-b border-current/10" style={{background:utilityBackground, color:utilityForeground,fontFamily:h.utilityFontFamily||undefined}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[30px] flex items-center justify-between gap-2 py-0.5">
          <div className="min-w-0 flex items-center gap-4 text-xs font-semibold"><span className="truncate">{h.utilityMessage || ''}</span>{(h.utilityLinks||[]).filter(link=>link.label&&safeNavigationUrl(link.url,true)).map(link=><a key={link.id} href={safeNavigationUrl(link.url,true)} onClick={e=>{const target=samePageCmsSectionTarget(link.url);if(target){e.preventDefault();scrollToCmsSection(target);}}} className="hidden lg:inline whitespace-nowrap underline-offset-2 hover:underline">{link.label}</a>)}</div>
          <div className="shrink-0 flex items-center gap-2">
          {phone && <a href={`tel:${phone.replace(/[^0-9+]/g,'')}`} className="inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap transition-colors" style={{background:h.hotlineBackground||'transparent',color:h.hotlineTextColor||utilityForeground,border:`${h.hotlineBorderWidth ?? 1}px solid ${h.hotlineBorderColor || 'currentColor'}`,borderRadius:h.hotlineBorderRadius ?? 999,padding:`${h.hotlinePaddingY ?? 6}px ${h.hotlinePaddingX ?? 10}px`}} aria-label={`Gọi ${phone}`}><PhoneCall className="w-3.5 h-3.5"/>{phone}</a>}
          {h.zalo && <button type="button" onClick={()=>runCmsAction({type:'zalo',target:h.zalo,eventName:'header_zalo_click'})} className="px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap" style={{color:utilityForeground}}>Zalo</button>}
          {onAdminClick && <button type="button" data-analytics-ignore="true" onClick={onAdminClick} aria-label="Đăng nhập" title="Đăng nhập" className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors" style={{color:h.loginIconColor||utilityForeground}}><LogIn className="w-5 h-5"/></button>}
          </div>
        </div>
      </div>}

      {/* Main row: logo + Category Bar + Header CTA. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3 transition-[min-height] duration-200" style={{minHeight:desktopRowHeight}}>
        <div className="shrink-0 flex items-center">{logoLink?<a href={logoLink} aria-label={`Đến ${config.brandName}`}><Logo/></a>:<Logo/>}</div>
        {nav?.enabled !== false && menuItems.length > 0 && <nav className="flex-1 min-w-0 flex items-center" aria-label="Category Bar / Primary Menu / Main Navigation" style={{minHeight:desktopRowHeight,overflow:'visible'}}>
          <div className={`w-full flex items-center ${nav.align === 'left' ? 'justify-start' : nav.align === 'right' ? 'justify-end' : nav.align === 'space-between' ? 'justify-between' : 'justify-center'} ${nav.mobileHorizontalScroll !== false ? 'overflow-x-auto whitespace-nowrap cms-no-scrollbar' : ''}`} style={{gap:nav.itemGap??4,padding:`${Math.max(2,Math.min(nav.itemPaddingY??4,8))}px ${Math.max(0,nav.itemPaddingX??4)}px`,background:nav.background||'transparent',borderRadius:0,boxShadow:'none',border:'none'}}>
            {menuItems.map(item=>{
              const active=isMenuActive(item),hover=hoveredNavId===item.id;
              const themeNavText=nav.textColor||(isRedLine?'#858585':isGoldLine?'#B3B0A6':h.textColor||'#111827');
              const themeNavAccent=nav.activeColor||(isRedLine?'#111111':'#0054a6');
              const color=isRedLine?(active||hover?'#111111':'#858585'):isGoldLine?(active||hover?'#F9F8F5':'#B3B0A6'):active?(item.activeColor||themeNavAccent):hover?(item.hoverColor||nav.hoverColor||item.normalColor||themeNavText):(item.normalColor||themeNavText);
              const background=isMotionLine?'transparent':active?(item.activeBackground||nav.activeBackground||item.background||'transparent'):hover?(nav.hoverBackground||item.background||'transparent'):(item.background||'transparent');
              const radius=item.borderRadius??nav.itemBorderRadius??10;
              const indicator=nav.activeIndicator||'underline';
              const indicatorColor=item.activeColor||nav.activeIndicatorColor||nav.activeColor||'#0054a6';
              return <button key={item.id} type="button" onMouseEnter={()=>hoverItem(item)} onMouseLeave={()=>setHoveredNavId(current=>current===item.id?null:current)} onClick={()=>item.megaMenu?.enabled?hoverItem(item):openItem(item)} aria-expanded={item.megaMenu?.enabled?openMegaId===item.id:undefined} aria-controls={item.megaMenu?.enabled?`cms-mega-${item.id}`:undefined} className={`relative shrink-0 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${isMotionUx&&visualTheme?.categoryBarMotion!==false&&nav?.motionStyle!=='none'?`cms-motion-nav-button cms-nav-${nav?.motionStyle||'lift'}`:''}`} style={{color,background,borderRadius:radius,padding:`${nav.itemPaddingY??7}px ${nav.itemPaddingX??10}px`,fontFamily:nav.fontFamily||'var(--cms-button-family, var(--cms-body-family, inherit))',fontSize:`${nav.fontSize??14}px`,fontWeight:(item as any).fontWeight||nav.fontWeight||700,fontStyle:nav.fontStyle||'normal',textDecoration:nav.textDecoration||'none',letterSpacing:`${nav.letterSpacing??0}px`,textTransform:nav.textTransform||'none',minHeight:Math.min(40,desktopRowHeight),['--cms-nav-duration' as any]:`${Math.max(100,Math.min(1000,nav.motionDurationMs??260))}ms`,['--cms-nav-accent' as any]:nav.activeIndicatorColor||'#e52938'}} aria-current={active?'page':undefined}>
                {item.icon&&<span className="mr-1.5" aria-hidden>{item.icon}</span>}{item.label}
                {!isMotionLine&&active&&indicator==='underline'&&<span aria-hidden className="absolute left-3 right-3 bottom-0" style={{height:nav.activeIndicatorHeight??3,background:indicatorColor,borderRadius:nav.activeIndicatorRadius??999}}/>}
                {!isMotionLine&&active&&indicator==='bottom-border'&&<span aria-hidden className="absolute left-0 right-0 bottom-0" style={{height:nav.activeIndicatorHeight??3,background:indicatorColor}}/>}
                {!isMotionLine&&active&&indicator==='top-border'&&<span aria-hidden className="absolute left-0 right-0 top-0" style={{height:nav.activeIndicatorHeight??3,background:indicatorColor}}/>}
                {!isMotionLine&&active&&indicator==='pill'&&<span aria-hidden className="absolute inset-0 pointer-events-none" style={{border:`${nav.activeIndicatorHeight??2}px solid ${indicatorColor}`,borderRadius:nav.activeIndicatorRadius??radius}}/>}
              </button>
            })}
          </div>
        </nav>}
        {h.searchEnabled!==false && <button type="button" onClick={()=>setSearchOpen(true)} aria-label="Tìm kiếm nội dung" title="Tìm kiếm" className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border border-current/15 hover:bg-black/5 transition-colors"><Search className="w-4.5 h-4.5"/></button>}
        {resolvedHeaderCta && <SmartActionButton slot="headerCta" cta={resolvedHeaderCta} fallbackText={config.headerCtaText || 'Tư vấn'} className="cms-header-action shrink-0 text-xs whitespace-nowrap"/>}
        {onAdminClick && (h.showUtilityRow === false || compactOnScroll) && <button type="button" data-analytics-ignore="true" onClick={onAdminClick} aria-label="Đăng nhập CMS" title="Đăng nhập CMS" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-blue-500" style={{color:themeText}}><LogIn className="w-4 h-4"/><span className="hidden lg:inline">Đăng nhập</span></button>}
      </div>
      {openMegaItem&&<div id={`cms-mega-${openMegaItem.id}`} className="cms-mega-panel absolute left-0 right-0 top-full bg-white text-neutral-900 border-t border-neutral-100 shadow-[0_24px_50px_rgba(20,24,32,.12)]" role="region" aria-label={`Danh mục ${openMegaItem.label}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 grid grid-cols-[220px_minmax(0,1fr)] gap-10">
          <div className="border-r border-neutral-100 pr-5 space-y-1"><div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-4">{openMegaItem.label}</div>{megaGroups.map(group=><button key={group.id} type="button" onClick={()=>setActiveGroupId(group.id)} className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeMegaGroup?.id===group.id?'bg-neutral-950 text-white':'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`} aria-current={activeMegaGroup?.id===group.id?'true':undefined}>{group.label}<ArrowRight className="w-4 h-4"/></button>)}
            {openMegaItem.action?.type==='internal'&&safeNavigationUrl(openMegaItem.action.target,true)&&<a className="block px-4 py-3 text-sm font-semibold text-neutral-700 hover:underline" href={safeNavigationUrl(openMegaItem.action.target,true)}>Xem trang {openMegaItem.label} →</a>}
          </div>
          <div className="min-w-0"><div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">{activeMegaGroup?.label||openMegaItem.label}</h2><button type="button" className="p-2 rounded-full hover:bg-neutral-100" aria-label="Đóng bảng danh mục" onClick={()=>setOpenMegaId(null)}><X className="w-5 h-5"/></button></div><div className="grid grid-cols-2 gap-x-8 gap-y-3">{(activeMegaGroup?.links||[]).filter(link=>link.title&&safeNavigationUrl(link.url,true)).map(link=><a key={link.id} href={safeNavigationUrl(link.url,true)} className="cms-mega-link group flex items-start gap-4 p-4 rounded-xl hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-red-500"><span className="shrink-0 w-11 h-11 rounded-lg bg-neutral-100 flex items-center justify-center text-xl overflow-hidden">{link.imageUrl&&safeMediaUrl(link.imageUrl)?<img src={safeMediaUrl(link.imageUrl)} alt="" className="w-full h-full object-cover"/>:link.icon||'↗'}</span><span><span className="block text-sm font-semibold group-hover:text-black">{link.title}</span>{link.description&&<span className="block text-xs text-neutral-500 mt-1 leading-relaxed">{link.description}</span>}</span></a>)}</div>{!activeMegaGroup?.links?.length&&<p className="text-sm text-neutral-500">Nhóm chưa có mục. Thêm liên kết trong CMS.</p>}</div>
        </div>
      </div>}
    </header>}
    {mobileEnabled && <header data-cms-mega-root data-landing-sticky={stickyOnScroll ? 'on' : 'off'} className={`md:hidden ${stickyOnScroll ? 'sticky top-0 z-40' : 'relative z-20'} ${h.shadow ? 'shadow-md' : ''}`} style={{background:mobileBg,color:(h.mobileTextColor||h.textColor||'#111827'),minHeight:mobileRowHeight,['--cms-header-height' as any]:`${mobileRowHeight}px`}}>
      <div className={`px-4 flex items-center gap-3 ${h.mobileLayout==='logo-center'?'justify-center':'justify-between'}`} style={{minHeight:mobileRowHeight}}>
        {logoLink?<a href={logoLink} aria-label={`Đến ${config.brandName}`}><Logo mobile/></a>:<Logo mobile/>}
        {h.mobileLayout!=='logo-center' && <div className="flex items-center gap-2">
          {h.mobileLayout==='logo-hotline' && phone && <a href={`tel:${phone.replace(/[^0-9+]/g,'')}`} aria-label="Gọi hotline" className="p-2 rounded-xl border border-current/20"><PhoneCall className="w-4 h-4"/></a>}
          {h.searchEnabled!==false && <button type="button" onClick={()=>setSearchOpen(true)} aria-label="Tìm kiếm nội dung" className="p-2 rounded-xl border border-current/20"><Search className="w-4 h-4"/></button>}
          {h.mobileLayout==='logo-cta' && resolvedHeaderCta && <SmartActionButton slot="headerCta" cta={resolvedHeaderCta} fallbackText={config.headerCtaText||'Tư vấn'} className="cms-header-action text-[11px]"/>}
          {menuItems.length>0 && <button type="button" onClick={()=>setMobileOpen(v=>!v)} aria-label="Mở menu" className="p-2 rounded-xl border border-current/20">{mobileOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}</button>}
          {onAdminClick && <button type="button" data-analytics-ignore="true" onClick={onAdminClick} aria-label="Đăng nhập CMS" title="Đăng nhập CMS" className="p-2 rounded-xl border border-current/20 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-blue-500"><LogIn className="w-5 h-5"/></button>}
        </div>}
        {h.mobileLayout==='logo-center' && onAdminClick && <button type="button" data-analytics-ignore="true" onClick={onAdminClick} aria-label="Đăng nhập CMS" title="Đăng nhập CMS" className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl border border-current/20 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-blue-500"><LogIn className="w-5 h-5"/></button>}
      </div>
      {mobileOpen && menuItems.length>0 && <nav className="border-t border-current/10 px-4 py-3 flex flex-col gap-1 max-h-[75vh] overflow-y-auto" style={{background:mobileBg}}>{menuItems.map(item=><div key={item.id}><button type="button" className="w-full text-left px-3 py-2.5 text-sm font-semibold" style={{...menuStyle(item),fontFamily:nav?.fontFamily||undefined,fontSize:`${nav?.mobileFontSize??13}px`}} aria-expanded={item.megaMenu?.enabled?openMegaId===item.id:undefined} onClick={()=>{if(item.megaMenu?.enabled){openItem(item)}else{openItem(item);setMobileOpen(false)}}}>{item.icon&&<span className="mr-2">{item.icon}</span>}{item.label}{item.megaMenu?.enabled&&<span className="float-right">{openMegaId===item.id?'−':'+'}</span>}</button>{item.megaMenu?.enabled&&openMegaId===item.id&&<div className="pl-4 border-l ml-3 space-y-2">{item.megaMenu.groups.map(group=><div key={group.id}><div className="text-xs font-bold uppercase text-neutral-500 px-2 py-2">{group.label}</div>{group.links.filter(link=>link.title&&safeNavigationUrl(link.url,true)).map(link=><a className="block px-2 py-2 text-sm" key={link.id} href={safeNavigationUrl(link.url,true)}>{link.title}</a>)}</div>)}{item.action?.type==='internal'&&safeNavigationUrl(item.action.target,true)&&<a href={safeNavigationUrl(item.action.target,true)} className="block px-2 py-2 text-sm font-semibold">Xem trang {item.label} →</a>}</div>}</div>)}</nav>}
    </header>}
    <SiteSearchOverlay open={searchOpen} onClose={()=>setSearchOpen(false)} settings={h} />
  </>;
};
