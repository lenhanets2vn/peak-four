import React from 'react';
import type { LandingPageSection, TypographyStyle } from '../../types';
import { FontSelector } from '../common/FontSelector';

const field='w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs';

export function QuickSectionStyleEditor({section,onChange}:{section:LandingPageSection;onChange:(section:LandingPageSection)=>void}) {
  const setText=(kind:'heading'|'body',patch:Partial<TypographyStyle>)=>{
    if(section.type==='blogPost'){
      const area=kind==='heading'?'title':'body';
      onChange({...section,blog:{html:'',...section.blog,typography:{...section.blog?.typography,[area]:{...section.blog?.typography?.[area],...patch}}}});
      return;
    }
    const responsiveKey = kind === 'heading' ? 'headingSize' : 'fontSize';
    onChange({...section,typographySettings:{...section.typographySettings,useGlobal:false,[kind]:{...section.typographySettings?.[kind],...patch}},
      ...(Object.hasOwn(patch,'fontSize') ? {responsiveSettings:{...section.responsiveSettings,desktop:{...section.responsiveSettings?.desktop,[responsiveKey]:patch.fontSize}}} : {})});
  };
  const setDesign=(patch:Partial<NonNullable<LandingPageSection['design']>>)=>onChange({...section,design:{...section.design,...patch}});
  const usePageTypography = section.typographySettings?.useGlobal === true || (!section.typographySettings?.heading && !section.typographySettings?.body && section.typographySettings?.useGlobal !== false);
  return <div className="space-y-5">
    <p className="text-xs text-neutral-600">Chỉnh màu nền và kiểu chữ cho riêng khối này. Bố cục và loại nền nằm ngay phía dưới.</p>
    <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={usePageTypography} onChange={e=>onChange({...section,typographySettings:{...section.typographySettings,useGlobal:e.target.checked},...(e.target.checked?{responsiveSettings:{...section.responsiveSettings,desktop:{...section.responsiveSettings?.desktop,headingSize:undefined,fontSize:undefined},tablet:{...section.responsiveSettings?.tablet,headingSize:undefined,fontSize:undefined},mobile:{...section.responsiveSettings?.mobile,headingSize:undefined,fontSize:undefined}}}:{})})}/>Dùng kiểu chữ toàn trang</label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-4 bg-neutral-50">
      <label className="text-xs">Màu nền khối<input type="color" className={field} value={section.design?.backgroundColor || section.customBgColor || '#ffffff'} onChange={e=>setDesign({backgroundType:'solid',backgroundColor:e.target.value})}/></label>
      <label className="text-xs">Màu chữ chung<input type="color" className={field} value={section.design?.textColor || '#111827'} onChange={e=>setDesign({textColor:e.target.value})}/></label>
    </div>
    {(['heading','body'] as const).map(kind=>{const value=section.typographySettings?.[kind]||{};const size=section.responsiveSettings?.desktop?.[kind==='heading'?'headingSize':'fontSize']??value.fontSize;return <div key={kind} className="rounded-xl border bg-white p-4 space-y-3"><h4 className="font-bold text-xs">{kind==='heading'?'Tiêu đề khối':'Nội dung khối'}</h4><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <FontSelector value={value.fontFamily||''} onChange={font=>setText(kind,{fontFamily:font||undefined})} label="Font chữ" previewText={kind==='heading'?'Tiêu đề mẫu':'Văn bản nội dung mẫu'} />
      <label className="text-xs">Cỡ chữ (px)<input type="number" min="10" max="100" className={field} value={size??''} placeholder="Theo trang" onChange={e=>setText(kind,{fontSize:e.target.value?+e.target.value:undefined})}/></label>
      <label className="text-xs">Độ đậm<select className={field} value={value.fontWeight||''} onChange={e=>setText(kind,{fontWeight:e.target.value?+e.target.value:undefined})}><option value="">Theo trang</option>{[300,400,500,600,700,800,900].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <label className="text-xs">Màu chữ<input type="color" className={field} value={value.color||'#111827'} onChange={e=>setText(kind,{color:e.target.value})}/></label>
      <label className="text-xs">Giãn dòng<input type="number" step="0.1" min="1" max="3" className={field} value={value.lineHeight??''} placeholder="Theo trang" onChange={e=>setText(kind,{lineHeight:e.target.value?+e.target.value:undefined})}/></label>
      <label className="text-xs">Căn chữ<select className={field} value={value.textAlign||'left'} onChange={e=>setText(kind,{textAlign:e.target.value as TypographyStyle['textAlign']})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>
      <div className="flex items-end gap-3"><label className="text-xs"><input type="checkbox" checked={value.italic===true} onChange={e=>setText(kind,{italic:e.target.checked})}/> Nghiêng</label><label className="text-xs"><input type="checkbox" checked={value.underline===true} onChange={e=>setText(kind,{underline:e.target.checked})}/> Gạch chân</label></div>
    </div></div>})}
    <p className="text-[11px] text-neutral-500">Với Blog/Post, dùng tab “Bài viết / Sidebar” để chỉnh từng vùng và chữ được bôi đen.</p>
  </div>;
}
