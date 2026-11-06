import React, {useMemo,useState} from 'react';
import { ArrowUpRight, RotateCcw, Search, CheckCircle2, BookOpen, Paintbrush } from 'lucide-react';
import type {LandingPageConfig} from '../../types';
import {getUiMapping, UI_REFERENCE_CATALOG, UI_SLOTS, type UiSlot} from '../../utils/uiLibrary';

/** UI Library only edits the same websiteSettings persisted by Save Draft/Publish. */
export const UiLibraryPanel:React.FC<{config:LandingPageConfig;onChange:(next:LandingPageConfig)=>void}> = ({config,onChange}) => {
 const [filter,setFilter]=useState('');
 const [catalogOpen,setCatalogOpen]=useState(false);
 const settings=config.websiteSettings!;
 const matches=useMemo(()=>UI_SLOTS.filter(slot=>`${slot.label} ${slot.group} ${slot.note}`.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi'))),[filter]);
 const groups=[...new Set(matches.map(slot=>slot.group))];
 const mapping=settings?.uiLibrary?.mappings||{};
 const update=(slot:UiSlot,value:string)=>{
   const next={...mapping};
   const defaultValue=UI_SLOTS.find(s=>s.id===slot)?.defaultValue;
   if(value===defaultValue)delete next[slot]; else next[slot]=value;
   if(JSON.stringify(mapping)===JSON.stringify(next))return;
   onChange({...config,websiteSettings:{...settings,uiLibrary:{...settings.uiLibrary,mappings:next}}});
 };
 const reset=()=>{if(Object.keys(mapping).length===0)return;onChange({...config,websiteSettings:{...settings,uiLibrary:{...settings.uiLibrary,mappings:{}}}})};
 return <section aria-label="Thư viện giao diện" className="space-y-5 cms-ui-library">
   <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
     <div className="flex flex-wrap gap-3 items-start justify-between">
       <div><div className="text-[10px] tracking-[.18em] uppercase font-bold text-blue-700">UI Library · Design Registry</div><h3 className="mt-1 text-xl font-black text-slate-900">Mapping giao diện theo vị trí</h3><p className="mt-1 text-xs text-slate-600 max-w-2xl">Mẫu mặc định đã gán sẵn; thay đổi tại đây được lưu cùng CMS khi bạn nhấn <strong>Lưu Nháp</strong>, sau đó <strong>Xuất Bản Live</strong>. Mẫu riêng của một nút/card vẫn được ưu tiên.</p></div>
       <button type="button" onClick={reset} disabled={!Object.keys(mapping).length} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40"><RotateCcw className="w-4 h-4"/> Khôi phục mapping mặc định</button>
     </div>
     <label className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3"><Search className="w-4 h-4 text-slate-400"/><input aria-label="Tìm vị trí UI" className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-sm" placeholder="Tìm Hero, CTA, Card, Dashboard..." value={filter} onChange={e=>setFilter(e.target.value)}/></label>
     <div className="flex flex-wrap gap-2 text-[11px] text-slate-600"><span className="px-2 py-1 bg-blue-50 rounded-full">{UI_SLOTS.length} vị trí có mapping hoạt động</span><span className="px-2 py-1 bg-slate-100 rounded-full">{Object.keys(mapping).length} tùy chỉnh</span><span className="px-2 py-1 bg-slate-100 rounded-full">Không cài code bên ngoài khi xem mẫu</span></div>
   </div>
   {groups.map(group=><div key={group} className="space-y-3"><h4 className="px-1 text-sm font-black text-slate-800">{group}</h4><div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{matches.filter(slot=>slot.group===group).map(slot=>{
    const current=getUiMapping(settings,slot.id);const choice=slot.choices.find(c=>c.id===current)!;
    return <article key={slot.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex gap-3 items-start justify-between"><div><div className="font-extrabold text-sm text-slate-900">{slot.label}</div><p className="mt-1 text-xs text-slate-500">{slot.note}</p></div><span className="inline-flex gap-1 items-center shrink-0 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3"/> Hoạt động</span></div>
      <div className="cms-ui-library-preview bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center min-h-20">
      {slot.choices===undefined?null:slot.group==='Landing / CTA'?<span className={`cms-ui-variant-preview cms-cta-visual--${current} text-xs px-4 py-3 inline-flex items-center gap-2`}>Tư vấn ngay <ArrowUpRight className="w-3.5 h-3.5"/></span>:slot.group==='Landing / Card'?<div data-hover={current} className="cms-card-hover bg-white shadow-sm border border-slate-200 px-8 py-4 rounded-xl text-xs font-semibold">Card sản phẩm</div>:slot.id==='siteSearch'?<div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-500 w-full max-w-xs flex gap-2 items-center"><Search className="w-4 h-4"/> {current==='compact'?'Tìm nhanh...':'Tìm kiếm nội dung Bảo Việt...'}</div>:<div className={`cms-ui-library-demo cms-ui-library-demo--${current} text-xs text-slate-600`}>{slot.id==='cmsControls'?<><input type="checkbox" checked readOnly tabIndex={-1} aria-label="Ví dụ checkbox"/> Bật chức năng</>:slot.id==='analyticsSurface'?<><div className="flex items-end gap-1 h-8">{[19,29,15,35,23].map((n,i)=><span key={i} className="w-3 rounded-sm bg-sky-500" style={{height:n}}/>)}</div> Báo cáo</>:<>01 · 02 · 03<br/>Dashboard</>}</div>}
      </div>
      <label className="block text-xs font-bold text-slate-700">Kiểu hiển thị<select className="block mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" value={current} onChange={e=>update(slot.id,e.target.value)}>{slot.choices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>
      <div className="flex items-center justify-between text-[11px] gap-2 text-slate-500"><span>{mapping[slot.id]?'Đã tùy chỉnh':'Theo mapping mặc định'}</span>{choice.url?<a target="_blank" rel="noopener noreferrer" href={choice.url} className="inline-flex items-center gap-1 text-blue-700 hover:underline">Nguồn tham khảo <ArrowUpRight className="w-3 h-3"/></a>:<span>Nguồn nội bộ</span>}</div>
    </article>;
   })}</div></div>)}
   {!matches.length&&<div className="p-4 rounded-xl border text-sm text-slate-500">Không có vị trí phù hợp.</div>}
   <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
     <button type="button" aria-expanded={catalogOpen} onClick={()=>setCatalogOpen(!catalogOpen)} className="flex w-full justify-between items-center text-left font-bold text-sm"><span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-700"/> Catalog nguồn mẫu ({UI_REFERENCE_CATALOG.length})</span><span className="text-xs text-blue-700">{catalogOpen?'Thu gọn':'Xem nguồn & tình trạng'}</span></button>
     {catalogOpen&&<><p className="text-xs text-slate-500">Catalog gồm mẫu Uiverse đã chọn, component shadcn/ui và Figma. Nhãn “Tham khảo” có nghĩa là chưa được copy hay tích hợp thành chức năng; không thể chọn làm mapping trực tiếp.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{UI_REFERENCE_CATALOG.map(item=><a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50"><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{item.label}</span><span className="text-[10px] text-slate-500">{item.group} · {item.mapped?'Có biến thể mapping nội bộ':'Tham khảo, chưa tích hợp'}</span></span><ArrowUpRight className="w-4 h-4 shrink-0 text-blue-600"/></a>)}</div></>}
   </div>
   <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-2"><Paintbrush className="w-4 h-4 shrink-0"/><span>UI Library chỉ đổi cách hiển thị. Đích CTA URL / Category Page / Section Page, Form, Analytics, quyền CMS và dữ liệu Publish không thay đổi.</span></div>
 </section>;
};
