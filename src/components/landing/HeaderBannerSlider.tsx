import React,{useEffect,useMemo,useState} from 'react';
import { ChevronLeft,ChevronRight } from 'lucide-react';
import { LandingPageConfig } from '../../types';
import { runCmsAction } from '../../utils/actionRuntime';

export const HeaderBannerSlider:React.FC<{config:LandingPageConfig}>=({config})=>{
 const b=config.websiteSettings?.header?.banner;
 const slides=useMemo(()=>[...(b?.slides||[])].filter(x=>x.enabled!==false&&x.imageUrl).sort((a,c)=>a.order-c.order),[b?.slides]);
 const [active,setActive]=useState(0);
 useEffect(()=>{setActive(v=>Math.min(v,Math.max(0,slides.length-1)));},[slides.length]);
 useEffect(()=>{if(!b?.enabled||!b.autoplay||slides.length<2)return;const t=window.setInterval(()=>setActive(v=>(v+1)%slides.length),Math.max(2000,b.autoplayMs||5000));return()=>window.clearInterval(t)},[b?.enabled,b?.autoplay,b?.autoplayMs,slides.length]);
 if(!b?.enabled||!slides.length)return null;
 const go=(n:number)=>setActive((n+slides.length)%slides.length);
 return <section id="header-banner-slider" data-section-name="Banner / Slider" aria-label="Banner nổi bật" className={b.fullWidth===false?'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3':'w-full'}>
  <div className="relative overflow-hidden bg-neutral-100" style={{height:`clamp(${b.mobileHeight||220}px, 34vw, ${b.desktopHeight||420}px)`,borderRadius:b.fullWidth===false?(b.borderRadius??16):(b.borderRadius??0)}}>
   {slides.map((slide,i)=><picture key={slide.id}><source media="(max-width: 767px)" srcSet={slide.mobileImageUrl||slide.imageUrl}/><img src={slide.imageUrl || undefined} alt={slide.alt||`Banner ${i+1}`} role={slide.action?'button':undefined} tabIndex={slide.action&&i===active?0:-1} className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${i===active?'opacity-100':'opacity-0 pointer-events-none'} ${slide.action?'cursor-pointer':''}`} style={{objectFit:b.objectFit||'cover'}} onClick={()=>slide.action&&runCmsAction(slide.action)} onKeyDown={e=>{if(i===active&&slide.action&&(e.key==='Enter'||e.key===' ')){e.preventDefault();runCmsAction(slide.action);}}} referrerPolicy="no-referrer"/></picture>)}
   {slides.length>1&&b.showArrows!==false&&<><button type="button" aria-label="Banner trước" onClick={()=>go(active-1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/35 text-white flex items-center justify-center"><ChevronLeft className="w-5 h-5"/></button><button type="button" aria-label="Banner tiếp theo" onClick={()=>go(active+1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/35 text-white flex items-center justify-center"><ChevronRight className="w-5 h-5"/></button></>}
   {slides.length>1&&b.showDots!==false&&<div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">{slides.map((x,i)=><button key={x.id} type="button" aria-label={`Banner ${i+1}`} onClick={()=>go(i)} className={`h-2 rounded-full ${i===active?'w-7 bg-white':'w-2 bg-white/60'}`}/>)}</div>}
  </div>
 </section>
}
