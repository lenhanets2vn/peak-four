import React from 'react';
import { LandingPageConfig } from '../../types';

/** Shared destination input for logos, banners and images. */
export const CmsLinkField:React.FC<{config:LandingPageConfig;label:string;value?:string;onChange:(value:string)=>void;id:string}> = ({config,label,value,onChange,id}) => (
  <div>
    <label className="block text-xs font-bold text-neutral-700 mb-1" htmlFor={id}>{label}</label>
    <input id={id} list={`${id}-pages`} type="text" value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Chọn trang hoặc nhập https://..." className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white" />
    <datalist id={`${id}-pages`}>
      <option value="/" label="Trang chủ" />
      {(config.websiteSettings?.navigation?.items||[]).filter(item=>item.action?.target?.startsWith('/')).map(item=><option key={item.id} value={item.action.target} label={item.label} />)}
    </datalist>
    <p className="mt-1 text-[10px] text-neutral-500">Để trống nếu không muốn mở liên kết. Hỗ trợ URL và đường dẫn Category Page.</p>
  </div>
);
