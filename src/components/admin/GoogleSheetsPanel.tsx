import React,{useState} from 'react';
import {GoogleSheetsConfig,FormField,LeadSubmission} from '../../types';
import {googleSignIn} from '../../services/firebaseAuth';
import {setupSheetHeaders,appendLeadRowToSheet,extractSpreadsheetId} from '../../services/sheetsApi';
import {syncLeadsViaWebhookOrToken,disconnectGoogleSheets} from '../../services/api';
interface Props {config:GoogleSheetsConfig;formFields:FormField[];leads:LeadSubmission[];onChange:(config:GoogleSheetsConfig)=>void;onRefreshLeads?:()=>void;}
export const GoogleSheetsPanel:React.FC<Props>=({config,formFields,onChange,onRefreshLeads})=>{
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const run=async(task:()=>Promise<any>)=>{setBusy(true);try{await task();setMessage('Hoàn tất.');onRefreshLeads?.();}catch(error:any){setMessage(error.message||'Kết nối chưa sẵn sàng.');}finally{setBusy(false);}};
 return <section className="space-y-4 rounded-xl border bg-white p-5"><h3 className="font-semibold">Google Sheets</h3><p>{config.isConnected?'Đã kết nối':'Chưa kết nối'}</p><p className="text-sm text-gray-600">OAuth và webhook được quản lý tại backend. Trình duyệt chỉ hiển thị trạng thái.</p><label className="block">Spreadsheet ID / URL<input className="block w-full border rounded p-2" value={config.spreadsheetId||''} onChange={e=>onChange({...config,spreadsheetId:extractSpreadsheetId(e.target.value)})}/></label><label className="block">Tên trang tính<input className="block w-full border rounded p-2" value={config.sheetName||'Leads'} onChange={e=>onChange({...config,sheetName:e.target.value})}/></label><label className="flex gap-2"><input type="checkbox" checked={!!config.autoSync} onChange={e=>onChange({...config,autoSync:e.target.checked})}/>Tự đồng bộ lead</label><div className="flex flex-wrap gap-2">{[
 ['Kết nối Google',()=>run(async()=>{await googleSignIn('sheets');onChange({...config,isConnected:true,connectionMethod:'oauth'});})],
 ['Tạo tiêu đề',()=>run(()=>setupSheetHeaders(config.spreadsheetId,config.sheetName,formFields,'server-managed'))],
 ['Gửi dòng thử',()=>run(()=>appendLeadRowToSheet(config.spreadsheetId,config.sheetName,{name:'Kiểm tra'} as LeadSubmission,formFields,'server-managed'))],
 ['Đồng bộ lead',()=>run(()=>syncLeadsViaWebhookOrToken({spreadsheetId:config.spreadsheetId,sheetName:config.sheetName}))],
 ['Ngắt kết nối',()=>run(async()=>{await disconnectGoogleSheets();onChange({...config,isConnected:false});})]
 ].map(([label,handler])=><button key={String(label)} type="button" disabled={busy} onClick={handler as ()=>void} className="border rounded px-3 py-2 disabled:opacity-50">{String(label)}</button>)}</div><p role="status">{message}</p></section>;
};
