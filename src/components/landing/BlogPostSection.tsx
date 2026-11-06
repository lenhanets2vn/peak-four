import React, { useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { LandingPageSection, LandingPageConfig, BlogTextStyle, ComponentAction } from '../../types';
import { sectionDomId } from '../../utils/sectionPresentation';
import { getFormDefinition } from '../../utils/configDefaults';
import { LeadForm } from './LeadForm';
import { loadGoogleFont } from '../../utils/fontPresets';
import { SmartActionButton } from '../common/SmartActionButton';

const linkUrl = (url?:string) => {const s=(url||'').trim();return /^(https?:\/\/|\/[^/]|#)/i.test(s)?s:'';};
const toBlogAction = (url?:string):ComponentAction => !url?.trim()?{type:'none'}:url.startsWith('#')?{type:'scroll',target:url.slice(1)}:url.startsWith('/')?{type:'internal',target:url}:{type:'url',target:url};
const imageUrl = (url?:string) => {const s=(url||'').trim();return /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(s)?s:linkUrl(s);};

export function BlogPostSection({section,config}:{section:LandingPageSection;config?:LandingPageConfig}) {
  const blog=section.blog;
  const {html,outline}=useMemo(()=>{
    const cleaned=DOMPurify.sanitize(blog?.html||'',{USE_PROFILES:{html:true}});
    if(typeof document==='undefined')return {html:cleaned,outline:[] as Array<{id:string;text:string}>};
    const root=document.createElement('div');root.innerHTML=cleaned;
    const headings=Array.from(root.querySelectorAll('h2,h3')).map((heading,index)=>{
      const id=`blog-${section.id.replace(/[^a-z0-9-]/gi,'')}-h${index+1}`;
      heading.id=id;
      return {id,text:heading.textContent||''};
    });
    root.querySelectorAll('a').forEach(a=>{if(!linkUrl(a.getAttribute('href')||''))a.removeAttribute('href');a.rel='noopener noreferrer';});
    return {html:root.innerHTML,outline:headings};
  },[blog?.html,section.id]);
  useEffect(()=>{
    if(typeof document==='undefined'||!html)return;
    const element=document.createElement('div');element.innerHTML=html;
    element.querySelectorAll('font[face]').forEach(node=>loadGoogleFont(node.getAttribute('face')||''));
  },[html]);
  if(!blog)return null;
  const two=blog.layout==='two-column';
  const cover=imageUrl(blog.coverImage);
  const ctaAction=blog.ctaAction||toBlogAction(blog.ctaUrl);
  const form=config&&blog.showSidebarForm ? getFormDefinition(config,blog.sidebarFormId||'main') : null;
  const roleStyle=(role:keyof NonNullable<typeof blog.typography>):React.CSSProperties=>{
    const t=blog.typography?.[role] as BlogTextStyle|undefined;
    return {fontFamily:t?.fontFamily||undefined,fontSize:t?.fontSize?`${t.fontSize}px`:undefined,fontWeight:t?.fontWeight||undefined,fontStyle:t?.italic?'italic':undefined,textDecoration:t?.underline?'underline':undefined,color:t?.color||undefined,lineHeight:t?.lineHeight||undefined,letterSpacing:t?.letterSpacing!==undefined?`${t.letterSpacing}px`:undefined,textAlign:t?.textAlign||undefined};
  };
  const headingVariables=Object.fromEntries((['h1','h2','h3'] as const).flatMap(role=>{
    const style=blog.typography?.[role];if(!style)return [];
    return Object.entries(roleStyle(role)).filter(([,value])=>value!==undefined).map(([key,value])=>[`--blog-${role}-${key}`,String(value)]);
  })) as React.CSSProperties;
  return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className="cms-blog-section bg-white py-8 sm:py-10" style={{backgroundColor:blog.backgroundColor||undefined}}>
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
      <div className={two?'grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]':'max-w-4xl mx-auto'}>
        <article className="min-w-0" style={headingVariables}>
          <header className="mb-7 border-b border-neutral-200 pb-5">
            {blog.category&&<div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700">{blog.category}</div>}
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800" style={roleStyle('title')}>{section.title}</h1>
            {section.subtitle&&<p className="mt-3 text-neutral-600" style={roleStyle('subtitle')}>{section.subtitle}</p>}
            {(blog.author||blog.publishedAt)&&<div className="mt-4 text-sm text-neutral-500" style={roleStyle('meta')}>{blog.publishedAt&&<time dateTime={blog.publishedAt}>{new Date(`${blog.publishedAt}T12:00:00`).toLocaleDateString('vi-VN')}</time>}{blog.author&&blog.publishedAt&&' · '}{blog.author&&<span>Tác giả: {blog.author}</span>}</div>}
          </header>
          {cover&&<figure className="mb-8"><img src={cover} alt={blog.coverAlt||section.title} className="max-h-[550px] w-full object-cover" loading="lazy"/><figcaption className="mt-2 text-xs text-neutral-500">{blog.coverCaption}{blog.coverCaption&&blog.coverCredit&&' · '}{blog.coverCredit&&`Nguồn: ${blog.coverCredit}`}</figcaption></figure>}
          {outline.length>0&&<nav aria-label="Mục lục bài viết" className="mb-8 rounded-xl bg-blue-50 p-5" style={roleStyle('toc')}><h2 className="font-bold text-blue-900" style={roleStyle('toc')}>Nội dung bài viết</h2><ol className="mt-2 space-y-1 text-sm">{outline.map(h=><li key={h.id}><a href={`#${h.id}`} className="text-blue-700 hover:underline" style={roleStyle('toc')}>{h.text}</a></li>)}</ol></nav>}
          <div className="cms-blog-body" style={{...roleStyle('body'),'--blog-table-bg':/^#[0-9a-f]{6}$/i.test(blog.tableColor||'')?blog.tableColor:'#dbeafe','--blog-table-text':/^#[0-9a-f]{6}$/i.test(blog.tableTextColor||'')?blog.tableTextColor:'#172554'} as React.CSSProperties} dangerouslySetInnerHTML={{__html:html}}/>
          {ctaAction.type!=='none'&&blog.ctaText&&<div className="mt-8"><SmartActionButton cta={{text:blog.ctaText,action:ctaAction}} sectionId={sectionDomId(section)}/></div>}
        </article>
        {two&&<aside className="min-w-0 space-y-6 border-t border-neutral-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" style={{backgroundColor:blog.sidebarBackgroundColor||undefined}}>
          {form&&form.fields.length>0&&<div className="cms-blog-sidebar-form"><LeadForm instanceId={`blog-${section.id}`} fields={form.fields} settings={{...form.settings,formId:form.id}} initialTracking={{section:section.anchorId||section.id,formId:form.id}}/></div>}
          {(blog.sidebarItems||[]).length>0&&<div className="space-y-3"><h2 className="border-b pb-2 font-bold text-lg uppercase text-neutral-800" style={roleStyle('sidebarTitle')}>{blog.sidebarTitle||'Bài viết mới'}</h2>{(blog.sidebarItems||[]).map(item=>{const img=imageUrl(item.image);return <div key={item.id} className="flex gap-3 border-b pb-3">{img&&<img src={img} alt={item.imageAlt||item.title} className="h-16 w-20 shrink-0 object-cover" loading="lazy"/>}<div className="min-w-0" style={roleStyle('sidebarItem')}><h3 className="font-semibold leading-snug" style={roleStyle('sidebarItem')}>{item.title}</h3>{item.imageCredit&&<div className="text-[10px] text-neutral-500">Nguồn: {item.imageCredit}</div>}{(item.ctaAction||toBlogAction(item.url)).type!=='none'&&<div className="mt-2"><SmartActionButton cta={{text:item.ctaText||'Đọc bài viết',action:item.ctaAction||toBlogAction(item.url)}} sectionId={sectionDomId(section)} className="text-xs"/></div>}</div></div>})}</div>}
        </aside>}
      </div>
    </div>
  </section>;
}
