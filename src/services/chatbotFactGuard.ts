import type { KnowledgeItem } from '../types';
import { normalizeText } from './ruleBasedChat';

export interface FactGuardResult {
  safe: boolean;
  unsupportedNumbers: string[];
  reason?: 'UNSUPPORTED_NUMERIC_PRODUCT_FACT' | 'PRODUCT_FACT_WITHOUT_KNOWLEDGE';
}

const normalize = (value:string) => normalizeText(String(value || ''));

function numericClaims(text:string): string[] {
  const raw=String(text||'');
  // One consuming pass prevents a formatted premium from also being interpreted
  // as its trailing fragment (e.g. 3.750.000 VND and 000 VND).
  const pattern=/\b\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|dong|vnd|triệu|trieu|tỷ|ty|%))?|\b\d+(?:[.,]\d+)?\s*(?:%|đ|dong|vnd|triệu|trieu|tỷ|ty|ngày|ngay|tháng|thang|năm|nam|tuổi|tuoi|lần|lan)\b|\b\d{4,}\b/gi;
  const found=[...raw.matchAll(pattern)].map(match=>normalize(match[0]).replace(/\s+/g,''));
  return [...new Set(found.filter(Boolean))];
}

function corpus(items:KnowledgeItem[], userMessage:string): string {
  return normalize([
    userMessage,
    ...items.flatMap((item:any)=>[
      item.title,item.content,item.topic,item.product,item.componentType,
      ...(Array.isArray(item.tags)?item.tags:[]),
    ])
  ].filter(Boolean).join(' ')).replace(/\s+/g,'');
}

function parseNumericValue(raw:string):number|null {
  // Preserve decimal and thousand punctuation while removing Vietnamese accents.
  // The text-search normalizer deliberately strips punctuation and cannot parse
  // 0,6% or 1,25 as numeric evidence.
  let s=String(raw||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,'');
  let scale=1;
  if(/ty/.test(s)) scale=1_000_000_000;
  else if(/trieu/.test(s)) scale=1_000_000;
  const pct=/%/.test(s);
  s=s.replace(/(vnd|dong|đ|trieu|ty|ngay|thang|nam|tuoi|lan|%)/g,'');
  if(!s) return null;
  // Vietnamese money commonly uses dots as thousand separators. A single comma
  // is treated as decimal; a single dot followed by 3 digits is thousands.
  if(/^\d{1,3}(?:\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  else if(/^\d{1,3}(?:,\d{3})+$/.test(s)) s=s.replace(/,/g,'');
  else s=s.replace(',','.');
  const n=Number(s);
  if(!Number.isFinite(n)) return null;
  return n*scale*(pct?0.01:1);
}

function extractEvidenceNumbers(text:string):number[] {
  const normalized=String(text||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const matches=normalized.match(/\d{1,3}(?:[.,]\d{3})+(?:\s*(?:d|dong|vnd|trieu|ty|%))?|\d+(?:[.,]\d+)?\s*(?:%|d|dong|vnd|trieu|ty|ngay|thang|nam|tuoi|lan)?/gi)||[];
  return [...new Set(matches.map(parseNumericValue).filter((x):x is number=>x!==null && Number.isFinite(x)))];
}

function approximately(a:number,b:number):boolean {
  const tolerance=Math.max(1,Math.abs(b)*0.002); // formatting/rounding tolerance <= 0.2%
  return Math.abs(a-b)<=tolerance;
}

/**
 * A result number is allowed when it is present verbatim in the evidence OR can
 * be reproduced by simple arithmetic over official CMS/user inputs. This lets AI
 * calculate without letting it invent rates, coefficients or product facts.
 */
function isDerivedFromEvidence(target:number, inputs:number[]):boolean {
  if(inputs.some(x=>approximately(target,x))) return true;
  const vals=inputs.filter(x=>Number.isFinite(x)).slice(0,40);
  for(let i=0;i<vals.length;i++) for(let j=0;j<vals.length;j++) {
    const a=vals[i], b=vals[j];
    const candidates=[a+b,a-b,a*b];
    if(b!==0) candidates.push(a/b);
    if(candidates.some(x=>Number.isFinite(x)&&approximately(target,x))) return true;
    // Common premium formula: amount × rate × occupation/age coefficient.
    for(let k=0;k<vals.length;k++) {
      const c=vals[k];
      const triple=[a*b*c];
      if(b!==0) triple.push(a/b*c);
      if(c!==0) triple.push(a*b/c);
      if(triple.some(x=>Number.isFinite(x)&&approximately(target,x))) return true;
    }
  }
  return false;
}

export function guardProductFacts(params:{
  reply:string;
  userMessage:string;
  knowledgeItems:KnowledgeItem[];
  productFactScope:boolean;
}): FactGuardResult {
  if(!params.productFactScope) return {safe:true,unsupportedNumbers:[]};
  if(!params.knowledgeItems.length) {
    return {safe:false,unsupportedNumbers:[],reason:'PRODUCT_FACT_WITHOUT_KNOWLEDGE'};
  }

  const allowed=corpus(params.knowledgeItems,params.userMessage);
  const evidenceText=[params.userMessage,...params.knowledgeItems.map((x:any)=>[x.title,x.content,x.topic].filter(Boolean).join(' '))].join(' ');
  const evidenceNumbers=extractEvidenceNumbers(evidenceText);
  const claims=numericClaims(params.reply);
  const unsupported=claims.filter(claim=>{
    if(allowed.includes(claim)) return false;
    const value=parseNumericValue(claim);
    return value===null || !isDerivedFromEvidence(value,evidenceNumbers);
  });
  if(unsupported.length) return {safe:false,unsupportedNumbers:unsupported,reason:'UNSUPPORTED_NUMERIC_PRODUCT_FACT'};
  return {safe:true,unsupportedNumbers:[]};
}
