import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronRight, FileSearch, Loader2, Search, X } from 'lucide-react';
import type { HeaderSettings } from '../../types';
import { loadGoogleFont } from '../../utils/fontPresets';
import { useCmsConfig } from '../../context/CmsConfigContext';
import { getUiMapping } from '../../utils/uiLibrary';
import { safeNavigationUrl } from '../../utils/urlSafety';

interface SearchResult {
  id: string;
  pageId: string;
  pageName: string;
  pageSlug: string;
  sectionId?: string;
  sectionTitle?: string;
  title: string;
  snippet?: string;
  url: string;
  type?: string;
  score?: number;
}

type Props = {
  open: boolean;
  onClose: () => void;
  settings?: Pick<HeaderSettings,'searchPlaceholder'|'searchTitle'|'searchHintText'|'searchSuggestions'|'searchFontFamily'|'searchSuggestionFontFamily'|'searchBackground'|'searchAccentColor'>;
};

// Command-dialog visual style inspired by shadcn/ui, retaining the current /api/search contract.
export const SiteSearchOverlay: React.FC<Props> = ({open,onClose,settings}) => {
  const cms=useCmsConfig();
  const searchStyle=getUiMapping(cms?.websiteSettings,'siteSearch');
  const [query,setQuery]=useState('');
  const [results,setResults]=useState<SearchResult[]>([]);
  const [dynamicSuggestions,setDynamicSuggestions]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [hasSearched,setHasSearched]=useState(false);
  const inputRef=useRef<HTMLInputElement|null>(null);
  const accent=settings?.searchAccentColor||'#0054a6';
  const searchFont=settings?.searchFontFamily||"'Be Vietnam Pro', sans-serif";
  const suggestionFont=settings?.searchSuggestionFontFamily||searchFont;

  useEffect(()=>{loadGoogleFont(searchFont);loadGoogleFont(suggestionFont);},[searchFont,suggestionFont]);

  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const timer=window.setTimeout(()=>inputRef.current?.focus(),40);
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',onKey);document.body.style.overflow=previous;};
  },[open,onClose]);

  useEffect(()=>{
    if(!open){setQuery('');setResults([]);setDynamicSuggestions([]);setLoading(false);setHasSearched(false);return;}
    const q=query.trim();
    if(q.length<2){setResults([]);setDynamicSuggestions([]);setLoading(false);setHasSearched(false);return;}
    const controller=new AbortController();
    setLoading(true);
    setHasSearched(false);
    const timer=window.setTimeout(async()=>{
      try{
        const response=await fetch(`/api/search?q=${encodeURIComponent(q)}`,{signal:controller.signal,credentials:'same-origin'});
        if(!response.ok)throw new Error(`Search ${response.status}`);
        const data=await response.json();
        if(!controller.signal.aborted){
          setResults(Array.isArray(data?.results)?data.results:[]);
          setDynamicSuggestions(Array.isArray(data?.suggestions)?data.suggestions.filter(Boolean).slice(0,8):[]);
        }
      }catch(error:any){
        if(error?.name!=='AbortError'){setResults([]);setDynamicSuggestions([]);}
      }finally{if(!controller.signal.aborted){setLoading(false);setHasSearched(true);}}
    },180);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[query,open]);

  const suggestions=useMemo(()=>{
    const base=query.trim().length>=2?dynamicSuggestions:(settings?.searchSuggestions||[]);
    const seen=new Set<string>();
    return base.map(String).map(v=>v.trim()).filter(v=>{const k=v.toLocaleLowerCase('vi');if(!v||seen.has(k))return false;seen.add(k);return true;}).slice(0,8);
  },[query,dynamicSuggestions,settings?.searchSuggestions]);

  const safeResults=useMemo(()=>results.map(result=>({result,href:safeNavigationUrl(result.url,true)})).filter(item=>!!item.href),[results]);

  if(!open)return null;
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/50 backdrop-blur-[3px] px-3 py-[7vh] sm:px-6" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div data-ui-style={searchStyle} className="bv-site-search mx-auto w-full max-w-[690px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]" role="dialog" aria-modal="true" aria-labelledby="bv-site-search-title" style={{backgroundColor:settings?.searchBackground||'#ffffff',fontFamily:searchFont}}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">THƯƠNG HIỆU</p>
            <h2 id="bv-site-search-title" className="mt-0.5 text-base font-bold text-slate-900">{settings?.searchTitle||'Tìm kiếm trên thương hiệu của bạn'}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Đóng tìm kiếm"><X className="h-4 w-4"/></button>
        </div>

        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-[3px] focus-within:ring-blue-100">
            <Search className="h-5 w-5 shrink-0" style={{color:accent}} aria-hidden="true" />
            <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!loading&&safeResults.length){e.preventDefault();onClose();window.location.assign(safeResults[0].href);}}}
              className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none" placeholder={settings?.searchPlaceholder||'Tìm nội dung trên website…'} aria-label="Nhập từ khóa tìm kiếm" aria-describedby="bv-search-keyboard-hint"/>
            {loading?<Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-label="Đang tìm kiếm"/>:query?<button type="button" onClick={()=>{setQuery('');inputRef.current?.focus();}} aria-label="Xóa từ khóa" className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200">Xóa</button>:<span className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-400 sm:inline">Ctrl K</span>}
          </div>
          <p id="bv-search-keyboard-hint" className="mt-2 text-xs text-slate-400">Nhập ít nhất 2 ký tự · Enter để mở kết quả đầu tiên</p>
        </div>

        <div className="max-h-[min(56vh,470px)] min-h-[160px] overflow-y-auto px-4 pb-4 pt-5 sm:px-6 sm:pb-6" aria-live="polite">
          {query.trim().length<2 ? (
            <section aria-label="Tìm kiếm phổ biến">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Tìm kiếm phổ biến</h3>
              {suggestions.length ? <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" style={{fontFamily:suggestionFont}}>
                {suggestions.map(item=><button key={item} type="button" onClick={()=>setQuery(item)} className="group flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><span className="min-w-0 truncate">{item}</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600"/></button>)}
              </div> : <p className="py-6 text-center text-sm text-slate-500">{settings?.searchHintText||'Nhập từ khóa để tìm nội dung đã đăng.'}</p>}
            </section>
          ) : loading ? (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600"/>Đang tìm kết quả phù hợp…</div>
          ) : safeResults.length ? (
            <section aria-label="Kết quả tìm kiếm">
              <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kết quả tìm kiếm</h3><span className="text-xs text-slate-400">{safeResults.length} kết quả</span></div>
              <div className="divide-y divide-slate-100">
                {safeResults.map(({result,href})=>{
                  const label=result.pageName;
                  return <a key={result.id} href={href} onClick={onClose} className="group flex items-start gap-3 rounded-lg px-3 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><FileSearch className="h-4 w-4"/></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-slate-500">{label}{result.sectionTitle?` / ${result.sectionTitle}`:''}</div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-blue-700">{result.title}</div>
                      {result.snippet&&<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{result.snippet}</p>}
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"/>
                  </a>;
                })}
              </div>
            </section>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center"><FileSearch className="h-7 w-7 text-slate-300"/><h3 className="text-sm font-semibold text-slate-900">Không tìm thấy kết quả</h3><p className="max-w-sm text-xs leading-relaxed text-slate-500">Thử một từ khóa khác hoặc kiểm tra cách viết.</p></div>
          ) : null}
          {query.trim().length>=2&&!loading&&suggestions.length>0&&<div className="mt-4 border-t border-slate-100 pt-4"><h3 className="mb-2 text-xs font-bold text-slate-500">Có thể bạn quan tâm</h3><div className="flex flex-wrap gap-2">{suggestions.map(item=><button type="button" key={item} onClick={()=>setQuery(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{item}</button>)}</div></div>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] text-slate-400 sm:px-6">
          <span>Kết quả từ nội dung đã xuất bản</span><span>ESC để đóng</span>
        </div>
      </div>
    </div>
  );
};
