import React,{useState} from 'react';
import {GoogleSheetsConfig,FormField,LeadSubmission} from '../../types';
import {googleSignIn} from '../../services/firebaseAuth';
import {setupSheetHeaders,appendLeadRowToSheet,extractSpreadsheetId} from '../../services/sheetsApi';
import {syncLeadsViaWebhookOrToken,disconnectGoogleSheets,testWebhookUrl} from '../../services/api';

interface Props {config:GoogleSheetsConfig;formFields:FormField[];leads:LeadSubmission[];onChange:(config:GoogleSheetsConfig)=>void;onRefreshLeads?:()=>void;pageId?:string;}
const validAppsScriptUrl = (input:string) => {
  try {
    const url=new URL(input.trim());
    return url.protocol==='https:' && ['script.google.com','script.googleusercontent.com'].includes(url.hostname) && !url.username && !url.password;
  } catch {return false;}
};

export const GoogleSheetsPanel:React.FC<Props>=({config,formFields,onChange,onRefreshLeads,pageId})=>{
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState(false);
 const run=async(task:()=>Promise<any>,success='Hoàn tất.')=>{
   setBusy(true);setError(false);setMessage('');
   try {await task();setMessage(success);onRefreshLeads?.();}
   catch(err:any){setError(true);setMessage(err?.message||'Kết nối chưa sẵn sàng.');}
   finally {setBusy(false);}
 };
 const webhookUrl=String(config.webhookUrl||'').trim();
 const useWebhook=config.connectionMethod==='webhook';
 const connected=!!config.isConnected && (useWebhook ? !!webhookUrl : true);
 const inputCls='block w-full border border-neutral-200 rounded-lg p-2 mt-1 text-sm text-neutral-900 bg-white';
 const buttonCls='border border-neutral-300 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-neutral-50';
 return <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
   <h3 className="font-semibold text-lg">Google Sheets</h3>
   <p className="text-sm text-neutral-700">{connected?'Đã kết nối':'Chưa kết nối'}. Có thể gửi Form về Google Sheets trực tiếp bằng Google Apps Script, cấu hình toàn bộ trong CMS, không cần thêm ENV Google Sheets trên backend.</p>
   <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
     <h4 className="text-sm font-bold text-blue-900">Đồng bộ Form qua Google Apps Script (không cần ENV)</h4>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
       <label className="block text-sm font-medium">Spreadsheet ID / URL
         <input className={inputCls} value={config.spreadsheetId||''} placeholder="Google Sheets URL hoặc Spreadsheet ID" onChange={e=>onChange({...config,spreadsheetId:extractSpreadsheetId(e.target.value)})}/>
       </label>
       <label className="block text-sm font-medium">Tên trang tính (Tab)
         <input className={inputCls} value={config.sheetName||'Leads'} onChange={e=>onChange({...config,sheetName:e.target.value})}/>
       </label>
     </div>
     <label className="block text-sm font-medium">URL Web App (https://script.google.com/macros/s/…/exec)
       <input className={inputCls} type="url" autoComplete="off" placeholder="https://script.google.com/macros/s/.../exec" value={config.webhookUrl||''}
         onChange={e=>onChange({...config,webhookUrl:e.target.value,isConnected:false,connectionMethod:'webhook'})}/>
     </label>
     <div className="flex flex-wrap gap-2 items-center">
       <button className={`${buttonCls} bg-blue-700 text-white hover:bg-blue-800 border-blue-700`} disabled={busy||!validAppsScriptUrl(webhookUrl)} type="button" onClick={()=>run(async()=>{
          await testWebhookUrl(webhookUrl,pageId,config.spreadsheetId,config.sheetName);
          onChange({...config,webhookUrl,isConnected:true,connectionMethod:'webhook',autoSync:true});
       },'Đã gửi dòng kiểm tra tới Apps Script. Hãy Lưu nháp và Xuất bản Live để áp dụng với Form khách hàng.')}>Kiểm tra kết nối</button>
       <span className="text-xs text-neutral-600">Web App cần được triển khai có quyền nhận POST. Bấm kiểm tra sẽ thêm một dòng thử vào Sheet.</span>
     </div>
     {useWebhook&&config.isConnected&&webhookUrl&&<p className="text-xs text-emerald-700">Kết nối Webhook đã kiểm tra. Khi được Publish và bật tự đồng bộ, Form mới sẽ gửi tới Google Sheets.</p>}
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!config.autoSync} onChange={e=>onChange({...config,autoSync:e.target.checked})}/>Tự đồng bộ Form mới lên Google Sheets</label>
   <div className="border-t border-neutral-200 pt-4 space-y-3">
     <h4 className="font-semibold text-sm">Kết nối OAuth Google (tùy chọn)</h4>
     <p className="text-xs text-neutral-600">Giữ cơ chế OAuth hiện tại nếu backend đã cấu hình Google OAuth. Không bắt buộc đối với Webhook.</p>
     <div className="flex flex-wrap gap-2">{[
       ['Kết nối Google OAuth',()=>run(async()=>{await googleSignIn('sheets');onChange({...config,isConnected:true,connectionMethod:'oauth'});})],
       ['Tạo tiêu đề (OAuth)',()=>run(()=>setupSheetHeaders(config.spreadsheetId,config.sheetName,formFields,'server-managed'))],
       ['Gửi dòng thử (OAuth)',()=>run(()=>appendLeadRowToSheet(config.spreadsheetId,config.sheetName,{name:'Kiểm tra'} as LeadSubmission,formFields,'server-managed'))],
       ['Đồng bộ Lead chưa gửi',()=>run(()=>syncLeadsViaWebhookOrToken({pageId,webhookUrl:useWebhook ? webhookUrl : undefined,spreadsheetId:config.spreadsheetId,sheetName:config.sheetName}))],
       ['Ngắt kết nối',()=>run(async()=>{await disconnectGoogleSheets();onChange({...config,isConnected:false,webhookUrl:'',connectionMethod:undefined});},'Đã ngắt kết nối. Hãy Lưu nháp và Xuất bản Live để hoàn tất.')]
     ].map(([label,handler])=><button key={String(label)} type="button" disabled={busy} onClick={handler as ()=>void} className={buttonCls}>{String(label)}</button>)}</div>
   </div>
   <p className={`text-sm ${error?'text-red-700':'text-emerald-700'}`} role="status">{message}</p>
   <p className="text-xs text-neutral-500">Lưu ý: Thiết lập được lưu theo Trang trong CMS; các cấu hình Webhook chỉ gửi từ server và không hiển thị ở Landing công khai. Sau khi kiểm tra, cần Xuất bản Live để Form dùng cài đặt mới.</p>
 </section>;
};
