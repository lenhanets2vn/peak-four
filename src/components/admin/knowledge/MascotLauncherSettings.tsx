import React from 'react';
import type { AiChatbotConfig } from '../../../types';
import { MASCOT_IDS, mascotBubbleStyle, mascotId, mascotLabel, mascotSheets } from '../../../utils/mascotCatalog';
import { PageMascot } from '../../chat/PageMascot';
import { allowedMascots } from '../../../utils/mascotVisit';

interface Props {
  config: AiChatbotConfig;
  onChange: (patch: Partial<AiChatbotConfig>) => void;
  disabled?: boolean;
}

export function MascotLauncherSettings({ config, onChange, disabled = false }: Props) {
  const enabled = config.launcherVisual === 'mascot';
  const id = mascotId(config.mascotId);
  const size = Math.max(40, Math.min(180, config.mascotSize ?? 54));
  const opacity = Math.max(0, Math.min(100, config.mascotBubbleOpacity ?? 0));
  const pool = allowedMascots(config);
  return <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
    <div>
      <h4 className="text-xs font-bold text-neutral-900">Hình trên nút mở Trợ lý AI</h4>
      <p className="text-[11px] text-neutral-600 mt-1">Chỉ thay nút nổi trên trang. Nhấn nút vẫn mở cửa sổ chat như trước.</p>
    </div>
    {enabled && <div className="rounded-lg bg-white border border-neutral-200 p-3 space-y-3">
      <label className="flex gap-2 items-center text-xs font-semibold"><input type="checkbox" disabled={disabled} checked={config.mascotRandomPerVisit === true} onChange={e=>onChange({mascotRandomPerVisit:e.target.checked})}/>Ngẫu nhiên nhân vật mỗi lượt truy cập</label>
      <label className="flex gap-2 items-center text-xs font-semibold"><input type="checkbox" disabled={disabled} checked={config.mascotAllowVisitorChange !== false} onChange={e=>onChange({mascotAllowVisitorChange:e.target.checked})}/>Cho khách đổi nhân vật</label>
      <p className="text-[11px] text-neutral-500">Nhân vật được giữ khi F5 hoặc chuyển trang trong cùng tab. Mở lượt truy cập mới sẽ chọn lại ngẫu nhiên. Chế độ Icon không có nút đổi nhân vật.</p>
      <details><summary className="cursor-pointer text-xs font-bold">Nhân vật được phép xuất hiện ({pool.length})</summary>
        <div className="flex gap-2 my-2"><button type="button" disabled={disabled} className="text-xs text-blue-700" onClick={()=>onChange({mascotAllowedIds:[...MASCOT_IDS]})}>Chọn tất cả</button><button type="button" disabled={disabled} className="text-xs text-blue-700" onClick={()=>onChange({mascotAllowedIds:[id]})}>Chỉ nhân vật mặc định</button></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">{MASCOT_IDS.map(value=><label key={value} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pool.includes(value)} disabled={disabled || (pool.length===1 && pool.includes(value))} onChange={e=>onChange({mascotAllowedIds:e.target.checked?[...pool,value]:pool.filter(current=>current!==value)})}/>{mascotLabel(value)}</label>)}</div>
        <p className="text-[11px] text-neutral-500 mt-2">Giữ ít nhất một nhân vật; cần từ hai nhân vật để khách có thể đổi.</p>
      </details>
    </div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => onChange({launcherVisual:'icon'})} className={`rounded-lg border px-3 py-2 text-xs font-bold ${!enabled?'bg-blue-600 text-white border-blue-600':'bg-white text-neutral-700'}`}>Icon hiện tại</button>
      <button type="button" disabled={disabled} onClick={() => onChange({launcherVisual:'mascot'})} className={`rounded-lg border px-3 py-2 text-xs font-bold ${enabled?'bg-blue-600 text-white border-blue-600':'bg-white text-neutral-700'}`}>Mascot tương tác</button>
    </div>
    {enabled && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-xs font-bold text-neutral-800">Độ đậm nền bong bóng: {opacity}%
        <input disabled={disabled} type="range" min="0" max="100" step="5" value={opacity} onChange={e=>onChange({mascotBubbleOpacity:Number(e.target.value)})} className="mt-2 w-full accent-blue-600" />
        <span className="block text-[11px] font-normal text-neutral-500">0% là trong suốt hoàn toàn.</span>
      </label>
      <label className="text-xs font-bold text-neutral-800">Màu nền bong bóng
        <input disabled={disabled || opacity === 0} type="color" value={config.mascotBubbleColor || '#ffffff'} onChange={e=>onChange({mascotBubbleColor:e.target.value})} className="mt-1 block h-9 w-full rounded-lg border bg-white p-1" />
      </label>
    </div>}
    {enabled && <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-neutral-800">Nhân vật ({MASCOT_IDS.length} mẫu)
          <select disabled={disabled} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs" value={id} onChange={e=>onChange({mascotId:e.target.value})}>
            {MASCOT_IDS.map(value=><option key={value} value={value}>{mascotLabel(value)}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-neutral-800">Kích thước: {size}px
          <input disabled={disabled} type="range" min="40" max="180" step="2" value={size} onChange={e=>onChange({mascotSize:Number(e.target.value)})} className="mt-3 w-full accent-blue-600" />
        </label>
      </div>
      <div className="shrink-0 rounded-xl border border-neutral-200 bg-slate-100 p-2" aria-label={`Xem trước ${mascotLabel(id)}`}>
        <div className="rounded-xl border-2 p-1 flex items-center gap-2" style={mascotBubbleStyle(config)}>
          <PageMascot {...mascotSheets(id)} size={size} />
          <span className="text-xs font-bold text-blue-700">{config.launcherText || 'Trợ lý AI'}</span>
        </div>
      </div>
    </div>}
    {enabled && <p className="text-[11px] text-neutral-500">Di chuột để nhân vật nhìn theo; nhấn hình xem biểu cảm. Trên điện thoại, nút mở chat hoạt động bình thường.</p>}
  </div>;
}
