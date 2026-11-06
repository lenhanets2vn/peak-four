import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { LandingPageSection, LandingPageConfig, BlogTextStyle, ComponentAction } from '../../types';
import { FONT_PRESETS, loadGoogleFont } from '../../utils/fontPresets';
import { FontSelector } from '../common/FontSelector';
import { ActionEditor } from './SettingsEditors';

type Blog = NonNullable<LandingPageSection['blog']>;
const blank: Blog = {html:'',layout:'two-column',sidebarItems:[],tableColor:'#dbeafe',tableTextColor:'#172554'};
const input = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs';
const safeUrl = (url:string) => /^(https?:\/\/|\/[^/]|#)/i.test(url.trim()) ? url.trim() : '';
const escapeHtml = (value:string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
const regions=[['title','Tiêu đề bài'],['subtitle','Mô tả ngắn'],['meta','Tác giả / ngày'],['body','Đoạn văn'],['h1','Heading 1'],['h2','Heading 2'],['h3','Heading 3'],['toc','Mục lục'],['sidebarTitle','Tiêu đề Sidebar'],['sidebarItem','Bài liên quan']] as const;
type Region=typeof regions[number][0];

export function BlogPostEditor({section,config,onChange}:{section:LandingPageSection;config:LandingPageConfig;onChange:(section:LandingPageSection)=>void}) {
  const blog = {...blank,...section.blog};
  const editor = useRef<HTMLDivElement>(null);
  const selectionRef=useRef<Range|null>(null);
  const [region,setRegion]=useState<Region>('title');
  useEffect(() => { if(editor.current) editor.current.innerHTML = DOMPurify.sanitize(blog.html || ''); },[section.id]);
  const patch = (change:Partial<Blog>) => onChange({...section,blog:{...blog,...change}});
  const actionFromUrl=(url?:string):ComponentAction=>!url?.trim()?{type:'none'}:url.startsWith('#')?{type:'scroll',target:url.slice(1)}:url.startsWith('/')?{type:'internal',target:url}:{type:'url',target:url};
  const patchRegion=(change:Partial<BlogTextStyle>)=>patch({typography:{...blog.typography,[region]:{...blog.typography?.[region],...change}}});
  const rememberSelection=()=>{const selection=window.getSelection();if(selection?.rangeCount&&editor.current?.contains(selection.anchorNode))selectionRef.current=selection.getRangeAt(0).cloneRange();};
  const restoreSelection=()=>{const range=selectionRef.current;if(!range||!editor.current?.contains(range.commonAncestorContainer))return;const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);};
  const saveBody = () => patch({html:DOMPurify.sanitize(editor.current?.innerHTML || '')});
  const command = (name:string,value?:string) => { editor.current?.focus(); restoreSelection(); document.execCommand(name,false,value);rememberSelection();saveBody(); };
  const fontSize=(px:number)=>{const size=Math.max(10,Math.min(96,px));editor.current?.focus();restoreSelection();document.execCommand('fontSize',false,'7');editor.current?.querySelectorAll('font[size="7"]').forEach(font=>{font.removeAttribute('size');(font as HTMLElement).style.fontSize=`${size}px`;});rememberSelection();saveBody();};
  const insert = (html:string) => command('insertHTML',DOMPurify.sanitize(html));
  const addLink = () => { const url=safeUrl(window.prompt('URL hoặc đường dẫn landing page', '') || ''); if(url) command('createLink',url); };
  const addImage = (url:string) => {
    if(!url.startsWith('data:image/') && !safeUrl(url)) return;
    const caption=window.prompt('Chú thích / nguồn trích dẫn ảnh (có thể để trống)', '') || '';
    insert(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(caption || 'Ảnh bài viết')}" /><figcaption>${escapeHtml(caption)}</figcaption></figure><p><br></p>`);
  };
  const tools: Array<[string,()=>void]> = [
    ['B',()=>command('bold')],['I',()=>command('italic')],['U',()=>command('underline')],['S̶',()=>command('strikeThrough')],
    ['H1',()=>command('formatBlock','h1')],['H2',()=>command('formatBlock','h2')],['H3',()=>command('formatBlock','h3')],
    ['Đoạn',()=>command('formatBlock','p')],['• Danh sách',()=>command('insertUnorderedList')],
    ['1. Danh sách',()=>command('insertOrderedList')],['Trích dẫn',()=>command('formatBlock','blockquote')],['Link',addLink],
    ['Trái',()=>command('justifyLeft')],['Giữa',()=>command('justifyCenter')],['Phải',()=>command('justifyRight')],['Xóa định dạng',()=>command('removeFormat')],
    ['@ Mention',()=>{const name=window.prompt('Tên người / tổ chức cần nhắc đến',''); if(name) insert(`<span class="cms-mention">@${escapeHtml(name.replace(/^@/,''))}</span>&nbsp;`);}],
    ['Bảng',()=>insert('<table><thead><tr><th>Tiêu đề 1</th><th>Tiêu đề 2</th></tr></thead><tbody><tr><td>Nội dung</td><td>Nội dung</td></tr></tbody></table><p><br></p>')],
    ['Ảnh URL',()=>{const url=window.prompt('URL ảnh (https://...)','') || ''; if(url) addImage(url);}],
  ];
  return <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
    <h4 className="font-bold text-sm">Bài viết Blog / Tin tức</h4>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label className="text-xs">Tác giả<input className={input} value={blog.author||''} onChange={e=>patch({author:e.target.value})}/></label>
      <label className="text-xs">Ngày đăng<input type="date" className={input} value={blog.publishedAt||''} onChange={e=>patch({publishedAt:e.target.value})}/></label>
      <label className="text-xs">Chuyên mục<input className={input} value={blog.category||''} onChange={e=>patch({category:e.target.value})} placeholder="Tin tức / Kiến thức"/></label>
    </div>
    <label className="block text-xs">Bố cục<select className={input} value={blog.layout||'single'} onChange={e=>patch({layout:e.target.value as Blog['layout']})}><option value="single">Một cột</option><option value="two-column">Hai cột + Sidebar</option></select></label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-xs">Ảnh bìa URL<input className={input} value={blog.coverImage||''} onChange={e=>patch({coverImage:e.target.value})} placeholder="https://..."/></label>
      <label className="text-xs">Alt ảnh<input className={input} value={blog.coverAlt||''} onChange={e=>patch({coverAlt:e.target.value})}/></label>
      <label className="text-xs">Chú thích ảnh<input className={input} value={blog.coverCaption||''} onChange={e=>patch({coverCaption:e.target.value})}/></label>
      <label className="text-xs">Nguồn / citation ảnh<input className={input} value={blog.coverCredit||''} onChange={e=>patch({coverCredit:e.target.value})}/></label>
      <label className="text-xs sm:col-span-2">Tải ảnh bìa từ máy<input type="file" accept="image/*" className={input} onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){alert('Ảnh tối đa 8MB');return;}const reader=new FileReader();reader.onload=()=>patch({coverImage:String(reader.result||'')});reader.readAsDataURL(file);}}/></label>
    </div>
    <div className="space-y-2"><div className="text-xs font-bold">Soạn thảo bài viết</div>
      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-white p-2" onMouseDown={e=>{rememberSelection();if((e.target as HTMLElement).closest('button'))e.preventDefault()}}>
        <select aria-label="Font cho chữ đang chọn" className="rounded border px-2 py-1 text-xs" defaultValue="" onChange={e=>{const preset=FONT_PRESETS.find(p=>p.id===e.target.value);if(preset){loadGoogleFont(preset.family);command('fontName',preset.id);}e.target.value='';}}><option value="">Font chữ đang chọn</option>{FONT_PRESETS.map(font=><option key={font.id} value={font.id}>{font.name}</option>)}</select>
        <input type="number" aria-label="Cỡ chữ đang chọn" className="w-16 rounded border px-2 py-1 text-xs" min="10" max="96" placeholder="px" onChange={e=>{if(e.target.value)fontSize(Number(e.target.value));}}/>
        {tools.map(([label,run])=><button key={label} type="button" onClick={run} className="rounded border px-2 py-1 text-xs hover:bg-blue-50">{label}</button>)}
        <label className="rounded border px-2 py-1 text-xs cursor-pointer hover:bg-blue-50">Tải ảnh nội dung<input type="file" accept="image/*" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){alert('Ảnh tối đa 8MB');return;}const reader=new FileReader();reader.onload=()=>addImage(String(reader.result||''));reader.readAsDataURL(file);e.target.value='';}}/></label>
        <label className="text-xs flex items-center gap-1">Màu chữ<input type="color" defaultValue="#172554" onChange={e=>command('foreColor',e.target.value)}/></label>
        <label className="text-xs flex items-center gap-1">Tô nền<input type="color" defaultValue="#fff59d" onChange={e=>command('hiliteColor',e.target.value)}/></label>
      </div>
      <div ref={editor} contentEditable suppressContentEditableWarning onInput={saveBody} onBlur={saveBody} onMouseUp={rememberSelection} onKeyUp={rememberSelection}
        onPaste={e=>{e.preventDefault();const html=e.clipboardData.getData('text/html');const plain=e.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,DOMPurify.sanitize(html||escapeHtml(plain)));saveBody();}}
        aria-label="Nội dung bài viết" className="cms-blog-editor min-h-64 rounded-lg border bg-white p-4 text-sm leading-7 outline-blue-500" />
      <p className="text-[11px] text-neutral-500">Bôi đen chữ để áp dụng font, cỡ, màu hoặc tô nền; đặt con trỏ ở dòng để chọn H1/H2/H3. Mục lục được tạo từ H2/H3.</p>
    </div>
    <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer text-xs font-bold">Kiểu chữ & màu theo từng vùng (mở khi cần)</summary>
      <div className="mt-4 space-y-3"><p className="text-[11px] text-neutral-500">Chọn một vùng: thay đổi chỉ áp dụng cho vùng đó trong bài viết này. Định dạng chữ được bôi đen ở thanh công cụ phía trên được giữ riêng.</p>
        <div className="flex items-end gap-2"><label className="block flex-1 text-xs">Vùng cần chỉnh<select className={input} value={region} onChange={e=>setRegion(e.target.value as Region)}>{regions.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>{const next={...blog.typography};delete next[region];patch({typography:next});}}>Đặt lại vùng</button></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <FontSelector compact value={blog.typography?.[region]?.fontFamily||''} onChange={value=>patchRegion({fontFamily:value||undefined})} label="Font chữ cho vùng này" previewText="Nội dung bài viết mẫu" />
          <label className="text-xs">Cỡ chữ (px)<input type="number" min="10" max="96" className={input} value={blog.typography?.[region]?.fontSize??''} onChange={e=>patchRegion({fontSize:e.target.value?Number(e.target.value):undefined})}/></label>
          <label className="text-xs">Độ đậm<select className={input} value={blog.typography?.[region]?.fontWeight||''} onChange={e=>patchRegion({fontWeight:e.target.value?Number(e.target.value):undefined})}><option value="">Theo trang</option>{[300,400,500,600,700,800,900].map(weight=><option key={weight}>{weight}</option>)}</select></label>
          <label className="text-xs">Màu chữ<input type="color" className={input} value={blog.typography?.[region]?.color||'#172554'} onChange={e=>patchRegion({color:e.target.value})}/></label>
          <label className="text-xs">Giãn dòng<input type="number" step="0.1" min="1" max="3" className={input} value={blog.typography?.[region]?.lineHeight??''} onChange={e=>patchRegion({lineHeight:e.target.value?Number(e.target.value):undefined})}/></label>
          <label className="text-xs">Giãn chữ (px)<input type="number" step="0.1" min="-3" max="10" className={input} value={blog.typography?.[region]?.letterSpacing??''} onChange={e=>patchRegion({letterSpacing:e.target.value?Number(e.target.value):undefined})}/></label>
          <label className="text-xs">Căn chữ<select className={input} value={blog.typography?.[region]?.textAlign||'left'} onChange={e=>patchRegion({textAlign:e.target.value as BlogTextStyle['textAlign']})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>
          <div className="flex items-end gap-2"><label className="text-xs"><input type="checkbox" checked={blog.typography?.[region]?.italic===true} onChange={e=>patchRegion({italic:e.target.checked})}/> Nghiêng</label><label className="text-xs"><input type="checkbox" checked={blog.typography?.[region]?.underline===true} onChange={e=>patchRegion({underline:e.target.checked})}/> Gạch chân</label></div>
        </div>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs">Màu nền bài<input type="color" className={input} value={blog.backgroundColor||'#ffffff'} onChange={e=>patch({backgroundColor:e.target.value})}/></label><label className="text-xs">Màu nền Sidebar<input type="color" className={input} value={blog.sidebarBackgroundColor||'#ffffff'} onChange={e=>patch({sidebarBackgroundColor:e.target.value})}/></label></div>
      </div>
    </details>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs">Màu nền bảng<input type="color" className={input} value={blog.tableColor||'#dbeafe'} onChange={e=>patch({tableColor:e.target.value})}/></label><label className="text-xs">Màu chữ bảng<input type="color" className={input} value={blog.tableTextColor||'#172554'} onChange={e=>patch({tableTextColor:e.target.value})}/></label></div>
    <div className="cms-ui-editor-panel space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3"><label className="text-xs font-semibold">Nút CTA bài viết<input className={input} value={blog.ctaText||''} onChange={e=>patch({ctaText:e.target.value})} placeholder="Đọc thêm / Tư vấn"/></label><ActionEditor config={config} value={blog.ctaAction||actionFromUrl(blog.ctaUrl)} onChange={ctaAction=>patch({ctaAction})}/></div>
    {blog.layout==='two-column' && <div className="space-y-2"><label className="text-xs">Tiêu đề Sidebar<input className={input} value={blog.sidebarTitle||''} onChange={e=>patch({sidebarTitle:e.target.value})} placeholder="Bài viết tham khảo"/></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={blog.showSidebarForm===true} onChange={e=>patch({showSidebarForm:e.target.checked})}/> Hiện form tư vấn phía trên Sidebar</label>
      {blog.showSidebarForm&&<p className="text-[11px] text-blue-800">Form lấy các trường từ mục Biểu Mẫu Tư Vấn (Form Center) của chính trang này. Hãy cấu hình form và Lưu Nháp trước khi xem trước ở tab mới.</p>}
      {(blog.sidebarItems||[]).map((item,index)=><div key={item.id} className="rounded-lg bg-white border p-2 space-y-2">
        <div className="flex justify-between"><b className="text-xs">Bài tham khảo {index+1}</b><button type="button" className="text-xs text-red-600" onClick={()=>patch({sidebarItems:(blog.sidebarItems||[]).filter(x=>x.id!==item.id)})}>Xóa</button></div>
        <input className={input} value={item.title} placeholder="Tiêu đề" onChange={e=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,title:e.target.value}:x)})}/>
        <input className={input} value={item.image||''} placeholder="URL ảnh" onChange={e=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,image:e.target.value}:x)})}/>
        <label className="block text-xs">Hoặc tải ảnh lên<input type="file" accept="image/*" className={input} onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){alert('Ảnh tối đa 8MB');return;}const reader=new FileReader();reader.onload=()=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,image:String(reader.result||'')}:x)});reader.readAsDataURL(file);}}/></label>
        <input className={input} value={item.imageAlt||''} placeholder="Mô tả ảnh (alt)" onChange={e=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,imageAlt:e.target.value}:x)})}/>
        <input className={input} value={item.imageCredit||''} placeholder="Nguồn / citation ảnh" onChange={e=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,imageCredit:e.target.value}:x)})}/>
        <div className="rounded-lg bg-blue-50/50 p-2 space-y-2"><span className="block text-xs font-bold">Đích CTA bài tham khảo</span><ActionEditor config={config} value={item.ctaAction||actionFromUrl(item.url)} onChange={ctaAction=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,ctaAction}:x)})}/></div>
        <input className={input} value={item.ctaText||''} placeholder="Chữ nút CTA" onChange={e=>patch({sidebarItems:(blog.sidebarItems||[]).map(x=>x.id===item.id?{...x,ctaText:e.target.value}:x)})}/>
      </div>)}
      <button type="button" className="rounded-lg bg-white border px-3 py-2 text-xs font-bold" onClick={()=>patch({sidebarItems:[...(blog.sidebarItems||[]),{id:`ref_${Date.now()}`,title:''}]})}>+ Thêm bài tham khảo</button>
    </div>}
  </div>;
}
