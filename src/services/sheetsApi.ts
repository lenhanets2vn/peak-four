import { FormField, LeadSubmission } from '../types';

export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's already an ID (no slashes)
  if (/^[a-zA-Z0-9-_]{20,80}$/.test(trimmed)) {
    return trimmed;
  }
  // Matches https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function buildHeaderRow(formFields: FormField[] = []): string[] {
  const sorted = [...(formFields || [])].sort((a, b) => a.order - b.order);
  const headers = [
    'Submission ID',
    'Submitted At',
    ...sorted.map((f) => f.googleSheetColumn || f.label || f.name),
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'UTM Content',
    'UTM Term',
    'Landing Page URL',
    'Device Type',
    'User Agent',
  ];
  return headers;
}

export function formatLeadToRow(lead: LeadSubmission, formFields: FormField[] = []): any[] {
  const sorted = [...(formFields || [])].sort((a, b) => a.order - b.order);
  const fieldValues = sorted.map((field) => {
    // Check direct properties or custom responses
    if (field.name === 'name') return lead.name || '';
    if (field.name === 'email') return lead.email || '';
    if (field.name === 'phone') return lead.phone || '';
    const val = lead.customResponses?.[field.name];
    if (val === undefined || val === null) return '';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  });

  return [
    lead.id,
    new Date(lead.submittedAt).toLocaleString(),
    ...fieldValues,
    lead.tracking.utmSource || '',
    lead.tracking.utmMedium || '',
    lead.tracking.utmCampaign || '',
    lead.tracking.utmContent || '',
    lead.tracking.utmTerm || '',
    lead.tracking.pageUrl || '',
    lead.tracking.deviceType || 'desktop',
    lead.tracking.userAgent || '',
  ];
}


async function sheetsOperation(payload: any):Promise<any>{const csrf=document.cookie.split(';').find(v=>v.trim().startsWith('bv_csrf='));const headers:Record<string,string>={'Content-Type':'application/json'};if(csrf)headers['X-CSRF-Token']=decodeURIComponent(csrf.trim().slice(8));const response=await fetch('/api/sheets/operation',{method:'POST',headers,body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error || 'Kết nối Sheets thất bại.');return data;}
export async function fetchSpreadsheetMetadata(spreadsheetId:string,_accessToken:string):Promise<{title:string;sheets:string[]}>{return sheetsOperation({operation:'metadata',spreadsheetId});}
export async function setupSheetHeaders(spreadsheetId:string,sheetName:string,formFields:FormField[],_accessToken:string):Promise<{success:boolean;message:string;columns:string[]}>{return sheetsOperation({operation:'headers',spreadsheetId,sheetName,fields:formFields});}
export async function appendLeadRowToSheet(spreadsheetId:string,sheetName:string,lead:LeadSubmission,_formFields:FormField[],_accessToken:string):Promise<{success:boolean;updatedRange?:string}>{return sheetsOperation({operation:'append-test',spreadsheetId,sheetName,lead:{name:lead.name}});}
