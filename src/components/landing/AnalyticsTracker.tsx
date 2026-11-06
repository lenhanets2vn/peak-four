import React,{useEffect,useRef} from 'react';
import { sendAnalyticsEvents } from '../../services/api';
import { LandingPageConfig } from '../../types';

const getOrCreate=(storage:Storage,key:string,prefix:string)=>{let v=storage.getItem(key);if(!v){v=`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;storage.setItem(key,v);}return v;};
const device=()=>window.innerWidth<=768?'mobile':window.innerWidth<=1024?'tablet':'desktop';
const SESSION_TIMEOUT_MS=30*60*1000;
const QUEUE_MAX=20;
const FLUSH_MS=10000;

export const AnalyticsTracker:React.FC<{config:LandingPageConfig;isPreview?:boolean}>=({config,isPreview=false})=>{
 const startRef=useRef(Date.now());
 const queueRef=useRef<any[]>([]);
 useEffect(()=>{
  if(isPreview||typeof window==='undefined')return;

  // Visitor survives page reloads/tabs; session rotates after 30 minutes of inactivity.
  const visitorId=getOrCreate(localStorage,'cms_analytics_visitor','visitor');
  const now=Date.now();
  const lastActivity=Number(sessionStorage.getItem('cms_analytics_last_activity')||0);
  let sessionId=sessionStorage.getItem('cms_analytics_session')||'';
  if(!sessionId||!lastActivity||now-lastActivity>SESSION_TIMEOUT_MS){
    sessionId=`session_${now}_${Math.random().toString(36).slice(2,10)}`;
    sessionStorage.setItem('cms_analytics_session',sessionId);
  }
  sessionStorage.setItem('cms_analytics_last_activity',String(now));

  const params=new URLSearchParams(location.search);
  const base=()=>({pageId:(config as any).__pageId||undefined,pagePath:location.pathname,sessionId,visitorId,utmSource:params.get('utm_source')||undefined,utmMedium:params.get('utm_medium')||undefined,utmCampaign:params.get('utm_campaign')||params.get('campaign')||undefined,deviceType:device(),timestamp:new Date().toISOString()});
   const flush=async()=>{
    if(!queueRef.current.length)return;
    const batch=queueRef.current.splice(0,QUEUE_MAX);
    try{await sendAnalyticsEvents(batch);}
    catch{queueRef.current.unshift(...batch);}
  };
  const emit=(event:any)=>{
    sessionStorage.setItem('cms_analytics_last_activity',String(Date.now()));
    queueRef.current.push({...base(),...event});
    if(queueRef.current.length>=QUEUE_MAX)void flush();
  };

  emit({type:'page_view'});
  const seen=new Set<Element>();
  const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting&&e.intersectionRatio>=0.35&&!seen.has(e.target)){seen.add(e.target);const el=e.target as HTMLElement;emit({type:'section_view',sectionId:el.id||undefined,sectionName:el.getAttribute('data-section-name')||el.getAttribute('aria-label')||el.id||'section'});}}},{threshold:[0.35]});
  document.querySelectorAll('section[id],main section').forEach(el=>observer.observe(el));

  const click=(ev:MouseEvent)=>{
    const el=(ev.target as Element|null)?.closest('button,a') as HTMLElement|null;
    if(!el||el.dataset.analyticsIgnore==='true'||el.dataset.analyticsCta==='true')return;
    const text=(el.dataset.analyticsName||el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,120);
    emit({type:el.dataset.analyticsCta==='true'?'cta_click':'click',eventName:el.dataset.analyticsEvent||text,target:(el as HTMLAnchorElement).href||text,sectionId:el.closest('section')?.id||undefined});
  };
  document.addEventListener('click',click,true);

  const custom=(ev:Event)=>{const d=(ev as CustomEvent).detail||{};emit(d);};
  window.addEventListener('cms:analytics',custom);

  const ping=()=>emit({type:'session_ping',durationSeconds:Math.round((Date.now()-startRef.current)/1000)});
  const timer=window.setInterval(ping,30000);
  const onHide=()=>{if(document.visibilityState==='hidden'){ping();void flush();}};
  document.addEventListener('visibilitychange',onHide);
  const onPageHide=()=>{ping();void flush();};
  window.addEventListener('pagehide',onPageHide);
  const flushTimer=window.setInterval(()=>void flush(),FLUSH_MS);

  return()=>{observer.disconnect();document.removeEventListener('click',click,true);window.removeEventListener('cms:analytics',custom);document.removeEventListener('visibilitychange',onHide);window.removeEventListener('pagehide',onPageHide);window.clearInterval(timer);window.clearInterval(flushTimer);void flush();};
 },[isPreview,config]);
 return null;
};
