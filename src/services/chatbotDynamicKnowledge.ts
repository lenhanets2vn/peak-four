import type { KnowledgeItem, KnowledgeTaxonomyData, TaxonomyComponentType } from '../types';
import { normalizeText } from './ruleBasedChat';

const normalize=(v:unknown)=>normalizeText(String(v??''));
const words=(v:unknown)=>normalize(v).split(/\s+/).filter(x=>x.length>1);
const uniq=<T,>(xs:T[])=>[...new Set(xs)];

function componentTerms(c:TaxonomyComponentType):string[]{
  return uniq([
    c.name,c.label,c.code,c.normalizedName,
    ...(c.aliases||[]),...(c.tags||[]),...(c.keywords||[]),
  ].filter(Boolean).map(normalize).filter(x=>x.length>=2));
}

function itemBelongsToProduct(item:any, productId?:string){
  return !productId || String(item.productId||'')===productId;
}

function knowledgeTermsForComponent(c:TaxonomyComponentType, items:KnowledgeItem[], productId?:string):string[]{
  const cid=String(c.id||'');
  const code=normalize(c.code);
  const names=componentTerms(c);
  const out:string[]=[];
  for(const item of items as any[]){
    if(!itemBelongsToProduct(item,productId)) continue;
    const itemComponent=String(item.componentId||'');
    const itemType=normalize(item.componentType);
    const itemTopic=normalize(item.topic);
    const belongs=itemComponent===cid || (!!code && itemType===code) || names.some(t=>t===itemTopic);
    if(!belongs) continue;
    out.push(item.title,item.topic,...(Array.isArray(item.tags)?item.tags:[]));
  }
  return uniq(out.filter(Boolean).map(normalize).filter(x=>x.length>=2));
}

export interface DynamicComponentMatch {
  component:{id:string;name:string};
  confidence:number;
  matchedTerms:string[];
  source:'taxonomy'|'knowledge'|'taxonomy+knowledge';
}

export function resolveDynamicComponent(
  message:string,
  taxonomy:KnowledgeTaxonomyData,
  knowledgeItems:KnowledgeItem[],
  productId?:string,
):DynamicComponentMatch|null{
  const q=normalize(message);
  if(!q) return null;
  const qWords=new Set(words(q));
  const candidates=taxonomy.componentTypes.filter(c=>c.active!==false).map(c=>{
    const taxTerms=componentTerms(c);
    const kbTerms=knowledgeTermsForComponent(c,knowledgeItems,productId);
    let score=0; const matched:string[]=[]; let taxHit=false,kbHit=false;
    const scoreTerms=(terms:string[], origin:'tax'|'kb')=>{
      for(const term of terms){
        if(!term) continue;
        if(q===term){score+=100;matched.push(term);origin==='tax'?taxHit=true:kbHit=true;continue;}
        if(q.includes(term) && term.length>=3){score+=Math.min(72,30+term.length*2);matched.push(term);origin==='tax'?taxHit=true:kbHit=true;continue;}
        const tw=words(term); if(!tw.length) continue;
        const overlap=tw.filter(w=>qWords.has(w)).length;
        const ratio=overlap/tw.length;
        if(overlap>=1 && ratio>=0.6){score+=Math.round(10+ratio*24);matched.push(term);origin==='tax'?taxHit=true:kbHit=true;}
      }
    };
    scoreTerms(taxTerms,'tax');
    scoreTerms(kbTerms,'kb');
    return {c,score,matched:uniq(matched).slice(0,6),taxHit,kbHit};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best || best.score<24) return null;
  const second=candidates[1];
  if(second && best.score-second.score<6 && best.score<55) return null; // ambiguous: let AI reason, never guess component.
  return {
    component:{id:best.c.id,name:best.c.name||best.c.label},
    confidence:Math.min(0.99,best.score/100),
    matchedTerms:best.matched,
    source:best.taxHit&&best.kbHit?'taxonomy+knowledge':best.kbHit?'knowledge':'taxonomy',
  };
}

export function rankKnowledgeDynamically(
  message:string,
  items:KnowledgeItem[],
  taxonomy:KnowledgeTaxonomyData,
  componentId?:string,
  topK=5,
):KnowledgeItem[]{
  const q=normalize(message); const qWords=new Set(words(q));
  const component=componentId?taxonomy.componentTypes.find(c=>c.id===componentId):undefined;
  const dynamicTerms=component?uniq([...componentTerms(component),...knowledgeTermsForComponent(component,items)]):[];
  const scored=(items as any[]).filter(i=>i&&i.active!==false&&i.enabled!==false&&String(i.content||'').trim()).map(item=>{
    const title=normalize(item.title),topic=normalize(item.topic),content=normalize(item.content);
    const tags=(item.tags||[]).map((x:any)=>normalize(x));
    let score=0;
    if(componentId && String(item.componentId||'')===componentId) score+=60;
    for(const term of dynamicTerms){
      if(!q.includes(term)) continue;
      if(title.includes(term)) score+=35;
      if(topic.includes(term)) score+=30;
      if(tags.some((t:string)=>t.includes(term))) score+=28;
      if(content.includes(term)) score+=7;
    }
    for(const w of qWords){
      if(title.includes(w)) score+=8;
      if(topic.includes(w)) score+=7;
      if(tags.some((t:string)=>t.includes(w))) score+=7;
      if(content.includes(w)) score+=1;
    }
    return {item,score};
  }).sort((a,b)=>b.score-a.score);
  const positive=scored.filter(x=>x.score>0);
  return (positive.length?positive:scored).slice(0,topK).map(x=>x.item);
}
