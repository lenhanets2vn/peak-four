import type { LandingPageRecord } from '../types';

export interface SiteSearchResult {
  id: string;
  pageId: string;
  pageName: string;
  pageSlug: string;
  sectionId?: string;
  sectionTitle?: string;
  title: string;
  snippet: string;
  url: string;
  type: string;
  score: number;
}

export interface SystemSiteSearchEntry {
  id: string;
  title: string;
  snippet?: string;
  url: string;
  type: string;
  pageName?: string;
  keywords?: string[];
}

export function systemSiteSearch(query: string, entries: SystemSiteSearchEntry[]): SiteSearchResult[] {
  const results: SiteSearchResult[] = [];
  for (const entry of entries) {
    const pageName = entry.pageName || entry.title;
    const body = [entry.snippet || '', ...(entry.keywords || [])].join(' ');
    const score = siteSearchScore(query, entry.title, body, pageName);
    if (score <= 0) continue;
    results.push({
      id: `system:${entry.id}`,
      pageId: entry.id,
      pageName,
      pageSlug: entry.url,
      title: entry.title,
      snippet: cleanSiteSearchText(entry.snippet || body).slice(0, 320),
      url: entry.url,
      type: entry.type,
      score: score + 4,
    });
  }
  return results.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,'vi'));
}

export function siteSearchSuggestions(query: string, results: SiteSearchResult[], seed: string[] = []): string[] {
  const q = normalizeSiteSearchText(query);
  const values: string[] = [];
  const add=(value?:string)=>{const text=cleanSiteSearchText(value||'').trim();if(!text)return;const norm=normalizeSiteSearchText(text);if(!norm||norm===q||values.some(v=>normalizeSiteSearchText(v)===norm))return;values.push(text);};
  seed.forEach(add);
  results.slice(0,12).forEach(result=>{ add(result.title); if(result.pageName!==result.title)add(result.pageName); });
  return values.slice(0,8);
}

export function normalizeSiteSearchText(value: string): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function cleanSiteSearchText(value: string): string {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
}

const SITE_SEARCH_SKIP_KEYS = new Set(['id','order','enabled','deletedAt','createdAt','updatedAt','status','design','layoutSettings','responsiveSettings','typographySettings','style','action','parameters','mobileImageUrl','imageUrl','avatar','mobileImage','coverImage','bgImageUrl','backgroundImage','backgroundVideo','videoUrl','videoPoster','embedUrl','embedPageUrl','downloadUrl','ogImage','faviconUrl','canonical','logoUrl','mobileLogoUrl']);

export function collectPublishedSearchStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 8 || value == null) return out;
  if (typeof value === 'string') {
    const raw=value.trim();
    if (!raw || /^data:/i.test(raw) || /^https?:\/\//i.test(raw) || /^#[0-9a-f]{3,8}$/i.test(raw) || raw.length > 120000) return out;
    const clean=cleanSiteSearchText(raw);
    if (clean.length >= 2) out.push(clean.slice(0, 12000));
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return out;
  if (Array.isArray(value)) { for (const item of value) collectPublishedSearchStrings(item, depth + 1, out); return out; }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      if (SITE_SEARCH_SKIP_KEYS.has(childKey) || /(?:color|font|shadow|radius|padding|margin|opacity|width|height|focal|motion|background|gradient|border|position|align|fit)$/i.test(childKey)) continue;
      collectPublishedSearchStrings(childValue, depth + 1, out);
    }
  }
  return out;
}

export function siteSearchScore(query: string, title: string, body: string, pageName: string): number {
  const q=normalizeSiteSearchText(query), t=normalizeSiteSearchText(title), b=normalizeSiteSearchText(body), p=normalizeSiteSearchText(pageName);
  if (!q) return 0;
  let score=0;
  if (t===q) score+=40; else if (t.includes(q)) score+=22;
  if (p===q) score+=18; else if (p.includes(q)) score+=8;
  if (b.includes(q)) score+=14;
  for (const term of q.split(' ').filter(Boolean)) {
    if (term.length < 2) continue;
    if (t.includes(term)) score+=5;
    if (p.includes(term)) score+=2;
    score+=Math.min(b.split(term).length-1,4)*2;
  }
  return score;
}

export function publishedSiteSearch(query: string, pages: LandingPageRecord[]): SiteSearchResult[] {
  const results: SiteSearchResult[]=[];
  for (const page of pages) {
    if (page.deletedAt || page.status!=='active' || page.published!==true || page.publishedConfig?.published===false) continue;
    const config=page.publishedConfig;
    const footer=config.footer?.enabled===false ? undefined : config.footer;
    const pageExtra=collectPublishedSearchStrings({
      heroBenefits:config.heroBenefits,
      heroSlides:(config.heroSlides||[]).map(slide=>({alt:slide.alt,title:(slide as any).title,subtitle:(slide as any).subtitle,caption:(slide as any).caption})),
      countdown:config.countdown?.enabled===false ? undefined : {title:config.countdown?.title,urgencyBannerText:config.countdown?.urgencyBannerText,expiredMessage:config.countdown?.expiredMessage},
      formSettings:{title:config.formSettings?.title,subtitle:config.formSettings?.subtitle,badge:config.formSettings?.badge,submitButtonText:config.formSettings?.submitButtonText,successHeading:config.formSettings?.successHeading,successMessage:config.formSettings?.successMessage,privacyDisclaimer:config.formSettings?.privacyDisclaimer},
      formFields:(config.formFields||[]).filter(field=>field.visible!==false && !field.deletedAt).map(field=>({label:field.label,placeholder:field.placeholder,helpText:field.helpText,options:field.options})),
      footer:footer ? {
        description:footer.footerDescription,address:footer.address,hotline:footer.hotline,email:footer.email,workingHours:footer.workingHours,copyrightText:footer.copyrightText,disclaimerText:footer.disclaimerText,
        columns:(footer.columns||[]).filter(column=>column.enabled!==false).map(column=>({title:column.title,content:column.content,links:column.links?.map(link=>link.label),contactAddress:column.contactAddress,contactHotline:column.contactHotline,contactEmail:column.contactEmail,contactHours:column.contactHours})),
        actionButtons:(footer.actionButtons||[]).filter(button=>button.enabled!==false).map(button=>button.label),
        customContactButtons:(footer.customContactButtons||[]).filter(button=>button.enabled!==false && button.showInFooter!==false).map(button=>button.name),
      } : undefined,
    });
    const pageMeta=[config.headline,config.subtitle,config.heroTitle,config.heroSubtitle,config.heroBadge,config.websiteSettings?.seo?.pageTitle,config.websiteSettings?.seo?.seoTitle,config.websiteSettings?.seo?.metaDescription,config.websiteSettings?.seo?.keywords,...pageExtra].filter(Boolean).join(' ');
    const pageScore=siteSearchScore(query,page.name,pageMeta,page.name);
    if(pageScore>0) results.push({id:`page:${page.id}`,pageId:page.id,pageName:page.name,pageSlug:page.slug,title:page.name,snippet:cleanSiteSearchText(pageMeta).slice(0,280),url:page.slug,type:'page',score:pageScore});
    for (const section of config.sections || []) {
      if (!section || section.enabled===false || section.status==='inactive' || section.deletedAt) continue;
      const sectionTitle=section.title || section.internalName || page.name;
      const searchableItems=(section.items||[]).filter(item=>item.enabled!==false && !item.deletedAt);
      const ctaTexts=[section.cta?.text,...searchableItems.map(item=>item.cta?.text||item.ctaText)].filter(Boolean);
      const body=[section.title,section.subtitle,section.content,section.overlayText,section.badge,...ctaTexts,...collectPublishedSearchStrings({blog:section.blog,items:searchableItems,images:(section.images||[]).map(image=>({alt:image.alt,caption:image.caption}))})].filter(Boolean).join(' ');
      const score=siteSearchScore(query,sectionTitle,body,page.name);
      if(score<=0) continue;
      const anchor=(section.anchorId || `section-${section.id}`).replace(/^#/,'').replace(/[^a-zA-Z0-9_-]/g,'-');
      const base=page.slug==='/'?'/':page.slug;
      results.push({id:`section:${page.id}:${section.id}`,pageId:page.id,pageName:page.name,pageSlug:page.slug,sectionId:anchor,sectionTitle,title:sectionTitle,snippet:cleanSiteSearchText(body).slice(0,320),url:`${base}#${anchor}`,type:section.type,score});
    }
  }
  return results.sort((a,b)=>b.score-a.score || a.pageName.localeCompare(b.pageName,'vi')).slice(0,30);
}
