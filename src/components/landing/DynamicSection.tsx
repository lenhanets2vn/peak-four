import React, { useState } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  Users,
  BarChart3,
  Zap,
  Layers,
  Star,
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Play,
  X,
  ExternalLink,
  Shield,
  HeartHandshake,
  Car,
  Plane,
  Check,
  Building,
} from 'lucide-react';
import { LandingPageSection, SectionItem, SectionImage, SectionType } from '../../types';
import { sectionAdvancedStyle, sectionDomId, sectionVisibilityClass, sectionContainerStyle, sectionGridStyle, sectionContentAlignmentStyle, sectionSplitStyle, sectionImageStyle, sectionImageWrapperStyle } from '../../utils/sectionPresentation';
import { SmartActionButton } from '../common/SmartActionButton';
import { useCmsConfig } from '../../context/CmsConfigContext';
import { resolveCardStyle, resolveSection } from '../../utils/styleResolver';
import {getUiMapping} from '../../utils/uiLibrary';
import { getFormDefinition } from '../../utils/configDefaults';
import { LeadForm } from './LeadForm';
import { cleanEmbedUrl, getYouTubeEmbedUrl, isVideoFile } from '../../utils/embedHelper';
import { BlogPostSection } from './BlogPostSection';
import { safeMediaUrl, safeNavigationUrl } from '../../utils/urlSafety';

interface Props {
  section: LandingPageSection;
}

// Icon mapper for dynamic icons
const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Award,
  Users,
  BarChart3,
  Zap,
  Layers,
  Star,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Shield,
  HeartHandshake,
  Car,
  Plane,
  Building,
};

export const DynamicSection: React.FC<Props> = ({ section: sourceSection }) => {
  const cmsConfig = useCmsConfig();
  const aliasMap: Partial<Record<SectionType, SectionType>> = { productCards:'products', productShowcase:'textMedia', imageContent:'textMedia', contentImage:'textMedia', trust:'features', cta:'ctaBanner', customContent:'textMedia', banner:'ctaBanner' };
  const aliasType = aliasMap[sourceSection.type] || sourceSection.type;
  const aliasMediaPosition = sourceSection.type === 'contentImage' ? 'right' : sourceSection.type === 'imageContent' || sourceSection.type === 'productShowcase' ? 'left' : undefined;
  const section = resolveSection(cmsConfig, { ...sourceSection, type: aliasType, imagePosition: sourceSection.imagePosition || aliasMediaPosition } as LandingPageSection);
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);
  const [activeImageLightbox, setActiveImageLightbox] = useState<SectionImage | null>(null);
  const [activeEditorialItemId, setActiveEditorialItemId] = useState<string | null>(null);

  if (!section.enabled || section.status === 'inactive' || section.deletedAt) return null;
  if (sourceSection.type === 'blogPost') return <BlogPostSection section={section} config={cmsConfig}/>;

  // Helper for background style
  const isImageMode = (section.bgMode === 'image' || section.bgType === 'image') && !!section.bgImageUrl;

  const getSectionBgStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = { ...sectionAdvancedStyle(section) };
    if (section.design?.backgroundType) return style;
    if (isImageMode && section.bgImageUrl) {
      style.backgroundImage = `url(${section.bgImageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    } else if (section.bgType === 'custom' && section.customBgColor) {
      style.backgroundColor = section.customBgColor;
    } else if (section.bgType === 'gradient') {
      style.background = `linear-gradient(135deg, var(--cms-secondary, #003870), var(--cms-primary, #0054a6))`;
    } else if (section.bgType === 'brand-blue') {
      style.backgroundColor = 'var(--cms-primary, #0054a6)';
    } else if (section.bgType === 'light') {
      style.backgroundColor = 'var(--cms-background-light, #f4f8fc)';
    } else if (section.customBgColor) {
      style.backgroundColor = section.customBgColor;
    }
    return style;
  };

  const getBgClasses = () => {
    if (isImageMode) {
      return 'text-white';
    }
    switch (section.bgType) {
      case 'brand-blue':
        return 'bg-[var(--cms-primary)] text-white';
      case 'dark':
        return 'bg-neutral-950 text-white';
      case 'light':
        return 'bg-[var(--cms-background-light)] text-[var(--cms-text-primary)] border-y border-[var(--cms-border)]';
      case 'gradient':
        return 'text-white';
      case 'custom':
        return 'text-neutral-900';
      case 'white':
      default:
        return 'bg-white text-neutral-900';
    }
  };

  // Helper for vertical padding
  const getPaddingClasses = () => {
    const layoutClass = section.layout ? `cms-layout-${section.layout}` : '';
    if (section.design || section.responsiveSettings || section.typographySettings) return `cms-advanced-section ${layoutClass}`;
    let spacing = 'py-12 sm:py-18';
    switch (section.paddingY) {
      case 'compact': spacing = 'py-8 sm:py-12'; break;
      case 'spacious': spacing = 'py-16 sm:py-24'; break;
      case 'normal':
      default: spacing = 'py-12 sm:py-18'; break;
    }
    return `${spacing} ${layoutClass}`;
  };

  // Responsive visibility
  const getVisibilityClasses = () => {
    if (section.responsiveSettings) return sectionVisibilityClass(section);
    let classes = '';
    if (section.hideOnMobile) classes += ' hidden md:block';
    if (section.hideOnDesktop) classes += ' md:hidden';
    return classes;
  };

  const isDarkBg =
    isImageMode ||
    section.bgType === 'brand-blue' ||
    section.bgType === 'dark' ||
    section.bgType === 'gradient';

  const renderBackgroundVideo = () => {
    if (section.design?.backgroundType !== 'video' || !section.design.backgroundVideo) return null;
    return (
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
        src={section.design.backgroundVideo || undefined}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    );
  };

  const renderBgOverlay = () => {
    const designOverlay = section.design?.overlayOpacity;
    const legacyHasOverlay = isImageMode || !!section.overlayColor;
    const advancedHasOverlay = (section.design?.backgroundType === 'image' || section.design?.backgroundType === 'video') && typeof designOverlay === 'number';
    if (!legacyHasOverlay && !advancedHasOverlay) return null;
    const opacity = typeof designOverlay === 'number'
      ? designOverlay / 100
      : typeof section.overlayOpacity === 'number'
      ? section.overlayOpacity / 100
      : isImageMode ? 0.5 : 0;
    if (opacity <= 0) return null;
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: section.design?.overlayColor || section.overlayColor || '#000000', opacity, zIndex: 1 }}
      />
    );
  };

  const advancedGridClass = section.layoutSettings || section.responsiveSettings ? `cms-config-grid ${section.layoutSettings?.cardsLayout === 'horizontal' ? 'cms-cards-horizontal' : ''}` : '';
  const advancedGridStyle = sectionGridStyle(section);
  const contentAlignmentStyle = sectionContentAlignmentStyle(section);

  const typoH = section.typographySettings?.heading;
  const typoB = section.typographySettings?.body;

  const headingCustomStyle: React.CSSProperties = {
    fontFamily: typoH?.fontFamily || undefined,
    color: typoH?.color || undefined,
    fontWeight: typoH?.fontWeight || undefined,
    fontStyle: typoH?.italic?'italic':undefined,
    textDecoration: typoH?.underline?'underline':undefined,
    lineHeight: typoH?.lineHeight || undefined,
    letterSpacing: typoH?.letterSpacing !== undefined ? `${typoH.letterSpacing}px` : undefined,
    textAlign: typoH?.textAlign || undefined,
    ...(typeof typoH?.fontSize === 'number' ? { fontSize: `${typoH.fontSize}px` } : (typoH?.fontSize as any)?.desktop ? { fontSize: `${(typoH?.fontSize as any).desktop}px` } : {}),
  };

  const bodyCustomStyle: React.CSSProperties = {
    fontFamily: typoB?.fontFamily || undefined,
    color: typoB?.color || undefined,
    fontWeight: typoB?.fontWeight || undefined,
    fontStyle: typoB?.italic?'italic':undefined,
    textDecoration: typoB?.underline?'underline':undefined,
    lineHeight: typoB?.lineHeight || undefined,
    letterSpacing: typoB?.letterSpacing !== undefined ? `${typoB.letterSpacing}px` : undefined,
    textAlign: typoB?.textAlign || undefined,
    ...(typeof typoB?.fontSize === 'number' ? { fontSize: `${typoB.fontSize}px` } : (typoB?.fontSize as any)?.desktop ? { fontSize: `${(typoB?.fontSize as any).desktop}px` } : {}),
  };

  // Typography is resolved at the smallest scope: item -> section -> website.
  // Item-specific font settings never mutate or overwrite the global website typography.
  const itemTypographyStyle = (item: SectionItem, kind: 'title' | 'body' | 'meta'): React.CSSProperties => {
    if (item.typography?.useGlobal !== false) return {};
    const t = item.typography?.[kind];
    if (!t) return {};
    return {
      fontFamily: t.fontFamily || undefined,
      color: t.color || undefined,
      fontWeight: t.fontWeight || undefined,
      lineHeight: t.lineHeight || undefined,
      letterSpacing: t.letterSpacing !== undefined ? `${t.letterSpacing}px` : undefined,
      textAlign: t.textAlign || undefined,
      ...(t.fontSize !== undefined ? { fontSize: `${t.fontSize}px` } : {}),
      ...(t.mobileSize !== undefined ? { ['--cms-item-mobile-size' as any]: `${t.mobileSize}px` } : {}),
    };
  };

  const activeItems = [...(section.items || [])]
    .filter((item) => item.enabled !== false && !item.deletedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const cardCss = (item: SectionItem): React.CSSProperties => {
    const st = resolveCardStyle(cmsConfig, item) || {};
    const shadows: Record<string,string> = { none:'none', sm:'0 1px 3px rgba(0,0,0,.08)', md:'0 8px 20px rgba(0,0,0,.10)', lg:'0 16px 36px rgba(0,0,0,.14)' };
    return {
      background: st.background, color: st.textColor, borderColor: st.borderColor, borderRadius: st.borderRadius,
      boxShadow: st.shadow ? shadows[st.shadow] : undefined, padding: st.padding,
      ['--cms-card-hover-bg' as any]: st.hoverBackground || st.background || '', ['--cms-card-hover-text' as any]: st.hoverTextColor || st.textColor || '',
    };
  };

  // Full-width image content block. The image keeps its intrinsic aspect ratio;
  // editors never need to configure a fixed image height for this section type.
  if (section.type === 'fullImage') {
    const imageUrl=safeMediaUrl(section.imageUrl || section.images?.[0]?.url || '');
    const mobileImageUrl=safeMediaUrl(section.mobileImageUrl || section.images?.[0]?.mobileUrl || '');
    const pos=section.overlayPosition || 'center';
    const positionClass:Record<string,string>={
      'top-left':'items-start justify-start text-left','top-center':'items-start justify-center text-center','top-right':'items-start justify-end text-right',
      'center-left':'items-center justify-start text-left','center':'items-center justify-center text-center','center-right':'items-center justify-end text-right',
      'bottom-left':'items-end justify-start text-left','bottom-center':'items-end justify-center text-center','bottom-right':'items-end justify-end text-right',
    };
    const overlayStyle=section.overlayTextStyle || {};
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getVisibilityClasses()} relative overflow-hidden`} style={{...sectionAdvancedStyle(section),background:section.customBgColor||'#f5f5f5'}}>
      {imageUrl ? <picture className="block w-full">
        {mobileImageUrl&&<source media="(max-width: 767px)" srcSet={mobileImageUrl}/>}<img src={imageUrl} alt={section.imageAlt||section.title||''} className="block w-full h-auto" loading="lazy"/>
      </picture> : <div className="min-h-64 grid place-items-center text-sm text-neutral-500 border border-dashed border-neutral-300">Chưa cấu hình ảnh cho khối.</div>}
      {(section.overlayText || section.cta?.text) && <div className={`absolute inset-0 z-10 flex p-5 sm:p-8 lg:p-12 ${positionClass[pos]||positionClass.center}`}>
        <div style={{maxWidth:section.overlayMaxWidth?`${section.overlayMaxWidth}px`:'min(680px, 90%)'}}>
          {section.overlayText&&<div className="whitespace-pre-line drop-shadow-sm" style={{fontFamily:overlayStyle.fontFamily||undefined,fontSize:overlayStyle.fontSize?`${overlayStyle.fontSize}px`:undefined,fontWeight:overlayStyle.fontWeight||700,fontStyle:overlayStyle.italic?'italic':undefined,textDecoration:overlayStyle.underline?'underline':undefined,lineHeight:overlayStyle.lineHeight||1.2,letterSpacing:overlayStyle.letterSpacing!==undefined?`${overlayStyle.letterSpacing}px`:undefined,textAlign:overlayStyle.textAlign||undefined,color:overlayStyle.color||'#ffffff'}}>{section.overlayText}</div>}
          {section.cta?.text&&<div className={`mt-4 ${pos.endsWith('right')?'flex justify-end':pos.endsWith('center')||pos==='center'?'flex justify-center':''}`}><SmartActionButton cta={section.cta} fallbackText={section.cta.text} sectionId={sectionDomId(section)} className="cms-section-cta"/></div>}
        </div>
      </div>}
      {(section.overlayOpacity||0)>0&&<div className="absolute inset-0 z-[5] pointer-events-none" style={{background:section.overlayColor||'#000',opacity:Math.max(0,Math.min(100,section.overlayOpacity||0))/100}}/>}
    </section>;
  }

  // Partner / brand logo marquee. Duplicate the track for a seamless loop.
  if (section.type === 'logoMarquee') {
    const logoItems:Array<{id:string;title:string;url?:string;link?:string;icon?:string}>=activeItems.length
      ? activeItems.map(item=>({id:item.id,title:item.title,url:safeMediaUrl(item.avatar),link:safeNavigationUrl(item.link||item.ctaLink,true),icon:item.icon}))
      : (section.images||[]).map((img,index)=>({id:img.id||`img-${index}`,title:img.alt||img.caption||'',url:safeMediaUrl(img.url),link:safeNavigationUrl(img.link,true)}));
    const loopItems=[...logoItems,...logoItems];
    const speed=Math.max(6,Math.min(120,section.marqueeSpeedSeconds||28));
    // Center the visible marquee viewport rather than disabling animation for short lists.
    // Two identically-sized runs guarantee a seamless -50% loop for any logo count.
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
      {renderBackgroundVideo()}{renderBgOverlay()}
      <div className="relative z-10 cms-section-content mx-auto px-4 sm:px-6" style={{...sectionContainerStyle(section),...contentAlignmentStyle}}>
        {(section.title||section.subtitle)&&<div className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-7"><h2 className="cms-section-heading text-2xl sm:text-3xl font-extrabold" style={headingCustomStyle}>{section.title}</h2>{section.subtitle&&<p className="cms-section-body mt-2 opacity-70" style={bodyCustomStyle}>{section.subtitle}</p>}</div>}
        {logoItems.length>0?<div className={`cms-logo-marquee ${section.marqueePauseOnHover!==false?'cms-logo-marquee-pause':''}`} style={{'--cms-logo-count':logoItems.length} as React.CSSProperties}>
          <div className="cms-logo-marquee-track flex items-center w-max" style={{animationDuration:`${speed}s`,animationDirection:section.marqueeDirection==='right'?'reverse':'normal'}}>
            {loopItems.map((item,index)=>{const IconComp=item.icon&&iconMap[item.icon]?iconMap[item.icon]:null;const body=<div className="cms-logo-marquee-card h-16 sm:h-20 px-5 flex items-center justify-center rounded-2xl border border-neutral-200/70 bg-white/95 shadow-sm">{item.url?<img src={item.url} alt={item.title||'Đối tác'} className="max-h-10 sm:max-h-12 max-w-[135px] object-contain" loading="lazy"/>:IconComp?<div className="flex items-center gap-2 text-neutral-700"><IconComp className="w-8 h-8"/><span className="text-sm font-bold">{item.title}</span></div>:<span className="text-sm font-bold text-neutral-700 text-center">{item.title}</span>}</div>;const duplicate=index>=logoItems.length;return item.link?<a key={`${item.id}-${index}`} href={item.link} aria-hidden={duplicate||undefined} tabIndex={duplicate?-1:undefined} className={`shrink-0 ${duplicate?'cms-logo-marquee-duplicate':''}`} target={item.link.startsWith('http')?'_blank':undefined} rel={item.link.startsWith('http')?'noopener noreferrer':undefined}>{body}</a>:<div key={`${item.id}-${index}`} aria-hidden={duplicate||undefined} className={`shrink-0 ${duplicate?'cms-logo-marquee-duplicate':''}`}>{body}</div>})}
          </div>
        </div>:<div className="max-w-5xl mx-auto px-4 text-center text-sm opacity-60">Thêm logo/đối tác trong tab Mục Con / Thẻ.</div>}
      </div>
    </section>;
  }

  // Purpose-built two-product comparison block. Exactly two active cards are rendered;
  // each card shows at most four product features and has its own CTA/action/design.
  if (section.type === 'dualProduct') {
    const products=activeItems.slice(0,2);
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
      {renderBackgroundVideo()}{renderBgOverlay()}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 cms-section-content" style={{...sectionContainerStyle(section),...contentAlignmentStyle}}>
        {(section.title||section.subtitle)&&<div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">{section.title&&<h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold" style={headingCustomStyle}>{section.title}</h2>}{section.subtitle&&<p className="cms-section-body mt-3 opacity-70" style={bodyCustomStyle}>{section.subtitle}</p>}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {products.map(item=><article key={item.id} className="cms-config-card cms-card-hover bg-white border rounded-3xl overflow-hidden flex flex-col" data-hover={resolveCardStyle(cmsConfig,item)?.hoverEffect||'none'} style={cardCss(item)}>
            {item.avatar&&<picture className="block w-full bg-neutral-100"><>{item.mobileImage&&<source media="(max-width: 767px)" srcSet={item.mobileImage}/>}<img src={item.avatar} alt={item.imageAlt||item.title} className="block w-full h-auto max-h-[360px] object-cover" loading="lazy"/></></picture>}
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              {item.tag&&<div className="text-xs font-black uppercase tracking-wider text-[#0054a6] mb-2">{item.tag}</div>}
              <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-950" style={itemTypographyStyle(item,'title')}>{item.title}</h3>
              {item.price&&<div className="mt-2 text-base font-black text-[#0054a6]" style={itemTypographyStyle(item,'meta')}>{item.price}</div>}
              {item.description&&<p className="mt-3 text-sm text-neutral-600 leading-relaxed" style={itemTypographyStyle(item,'body')}>{item.description}</p>}
              <ul className="mt-5 space-y-3 flex-1">{(item.features||[]).slice(0,4).map((feature,index)=><li key={index} className="flex items-start gap-3 text-sm text-neutral-700"><span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Check className="w-3 h-3 stroke-[3]"/></span><span>{feature}</span></li>)}</ul>
              <div className="pt-6"><SmartActionButton cta={item.cta} fallbackText={item.ctaText||'Xem chi tiết'} fallbackAction={item.ctaLink?{type:item.ctaLink.startsWith('#')?'scroll':'url',target:item.ctaLink.replace(/^#/,'')}:{type:'scroll',target:'lead-form-section'}} sectionId={sectionDomId(section)} product={item.title} className="cms-section-cta w-full"/></div>
            </div>
          </article>)}
        </div>
        {products.length<2&&<div className="mt-4 text-center text-xs opacity-60">Khối 2 sản phẩm cần đủ 2 mục đang bật trong CMS.</div>}
      </div>
    </section>;
  }

  // Section-level Embed: this is a full-size content block, independent of Section items/cards.
  if (section.type === 'embed') {
    const sourceType = section.embedSourceType || 'url';
    const rawUrl = section.embedUrl || section.videoUrl || '';
    let resolvedUrl = rawUrl;
    if (sourceType === 'landingPage' || sourceType === 'section') {
      resolvedUrl = section.embedPageUrl || '';
      if (sourceType === 'section' && section.embedSectionId && resolvedUrl) {
        try { const u = new URL(resolvedUrl, window.location.origin); u.searchParams.set('embed_section', section.embedSectionId.replace(/^#/, '')); resolvedUrl = u.toString(); } catch {}
      }
    }
    const safeUrl = cleanEmbedUrl(resolvedUrl);
    const youtubeUrl = getYouTubeEmbedUrl(rawUrl);
    const mediaUrl = youtubeUrl || safeUrl;
    const mode = section.embedDisplayMode || 'iframe';
    const height = Math.max(200, Math.min(2000, section.embedHeight || 600));
    const isVideo = !youtubeUrl && isVideoFile(safeUrl);
    const shouldEmbed = mode === 'iframe' || mode === 'both';
    const shouldLink = mode === 'link' || mode === 'both';
    return (
      <section id={sectionDomId(section)} data-section-name={section.internalName || section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          {(section.badge || section.title || section.subtitle) && (
            <div className="text-center mb-6 sm:mb-8">
              {section.badge && <span className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 inline-block ${isDarkBg ? 'bg-white/15 text-amber-300 border border-white/20' : 'text-[#0054a6] bg-blue-100'}`}>{section.badge}</span>}
              {section.title && <h2 className={`cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 ${isDarkBg ? 'text-white' : 'text-neutral-950'}`} style={headingCustomStyle}>{section.title}</h2>}
              {section.subtitle && <p className={`cms-section-body text-sm sm:text-base max-w-3xl mx-auto ${isDarkBg ? 'text-blue-100' : 'text-neutral-600'}`} style={bodyCustomStyle}>{section.subtitle}</p>}
            </div>
          )}
          {shouldEmbed && safeUrl && (
            <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" style={{ height }}>
              {isVideo ? (
                <video src={mediaUrl} controls playsInline className="w-full h-full object-contain bg-black" />
              ) : (
                <iframe src={mediaUrl} title={section.title || 'Nội dung nhúng'} className="w-full h-full border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              )}
            </div>
          )}
          {shouldLink && safeUrl && (
            <div className="mt-4 text-center">
              <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0054a6] text-white text-sm font-bold hover:bg-[#004182] transition-colors">
                {section.embedLinkText || 'Mở nội dung trong tab mới'} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
          {!safeUrl && <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">Chưa cấu hình URL nhúng.</div>}
        </div>
      </section>
    );
  }

  // Section-level downloadable resource.
  if (section.type === 'downloads') {
    const safeUrl = cleanEmbedUrl(section.downloadUrl || '');
    return (
      <section id={sectionDomId(section)} data-section-name={section.internalName || section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 cms-section-content text-center" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          {section.title && <h2 className={`cms-section-heading text-2xl sm:text-3xl font-extrabold mb-2 ${isDarkBg ? 'text-white' : 'text-neutral-950'}`} style={headingCustomStyle}>{section.title}</h2>}
          {section.subtitle && <p className={`cms-section-body text-sm sm:text-base mb-6 ${isDarkBg ? 'text-blue-100' : 'text-neutral-600'}`} style={bodyCustomStyle}>{section.subtitle}</p>}
          {safeUrl ? (
            <a href={safeUrl} download={section.downloadFileName || undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0054a6] text-white text-sm font-bold hover:bg-[#004182] transition-colors">
              {section.downloadButtonText || 'Tải xuống'} <ExternalLink className="w-4 h-4" />
            </a>
          ) : <div className="text-sm text-neutral-500">Chưa cấu hình đường dẫn tải xuống.</div>}
          {section.downloadFileName && <div className="mt-2 text-xs opacity-70">{section.downloadFileName}{section.downloadFileSize ? ` • ${section.downloadFileSize}` : ''}</div>}
        </div>
      </section>
    );
  }

  // Form section uses the selected reusable form rather than hard-coded main fields.
  if (section.type === 'form') {
    const form = getFormDefinition(cmsConfig, section.formId || 'main');
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
      {renderBackgroundVideo()}{renderBgOverlay()}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 cms-section-content" style={{...sectionContainerStyle(section),...contentAlignmentStyle}}>
        {section.title && <h2 className="cms-section-heading text-2xl sm:text-3xl font-extrabold mb-2" style={headingCustomStyle}>{section.title}</h2>}
        {section.subtitle && <p className="cms-section-body mb-6 opacity-80" style={bodyCustomStyle}>{section.subtitle}</p>}
        {form.enabled && <LeadForm instanceId={`section-form-${section.id}`} fields={form.fields} settings={{...form.settings,formId:form.id}} initialTracking={{section:sectionDomId(section),formId:form.id}}/>}
      </div>
    </section>;
  }

  // Optional navigation section: items can point to sections, popups, forms or URLs via normal CTA actions.
  if (sourceSection.type === 'productNavigation') {
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative`} style={getSectionBgStyle()}>
      {renderBackgroundVideo()}{renderBgOverlay()}<div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 cms-section-content" style={{...sectionContainerStyle(section),...contentAlignmentStyle}}>
        {section.title && <h2 className="cms-section-heading text-2xl sm:text-3xl font-extrabold mb-2">{section.title}</h2>}
        {section.subtitle && <p className="cms-section-body mb-5 opacity-80">{section.subtitle}</p>}
        <div className="flex gap-3 overflow-x-auto cms-no-scrollbar pb-1">{(section.items||[]).filter(i=>i.enabled!==false&&!i.deletedAt).sort((a,b)=>(a.order||0)-(b.order||0)).map(item=><SmartActionButton key={item.id} cta={item.cta} fallbackText={item.title} fallbackAction={{type:'scroll',target:item.ctaLink||item.link||item.value||item.title,eventName:item.cta?.action?.eventName}} sectionId={sectionDomId(section)} product={item.title} className="shrink-0 text-xs"/>)}</div>
      </div>
    </section>;
  }

  // 1. STATS SECTION
  if (section.type === 'stats') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          {section.badge && (
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 inline-block ${
                isDarkBg
                  ? 'bg-white/15 text-amber-300 border border-white/20'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {section.badge}
            </span>
          )}
          <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">
            {section.title}
          </h2>
          {section.subtitle && (
            <p
              className={`text-sm sm:text-base max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed ${
                isDarkBg ? 'text-blue-100' : 'text-neutral-600'
              }`}
            >
              {section.subtitle}
            </p>
          )}

          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${advancedGridClass}`} style={advancedGridStyle}>
            {activeItems.map((item) => {
              const IconComp = item.icon && iconMap[item.icon] ? iconMap[item.icon] : Award;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-5 sm:p-6 text-center transition-all ${
                    isDarkBg
                      ? 'bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xs'
                      : 'bg-white border border-neutral-200/80 shadow-xs hover:border-blue-300'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3.5 ${
                      isDarkBg ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-50 text-[#0054a6]'
                    }`}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-1 ${
                      isDarkBg ? 'text-white' : 'text-[#0054a6]'
                    }`}
                    style={itemTypographyStyle(item, 'title')}
                  >
                    {item.title}
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-medium ${
                      isDarkBg ? 'text-blue-100' : 'text-neutral-600'
                    }`}
                    style={itemTypographyStyle(item, 'body')}
                  >
                    {item.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Editorial selector: CMS items on the left, detail and existing CTA action on the right.
  if (section.type === 'products' && section.layoutSettings?.cardsLayout === 'editorial-panel') {
    const selected=activeItems.find(item=>item.id===activeEditorialItemId)||activeItems[0];
    return <section id={sectionDomId(section)} data-section-name={section.internalName||section.title} className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`} style={getSectionBgStyle()}>
      {renderBackgroundVideo()}{renderBgOverlay()}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 cms-section-content" style={{...sectionContainerStyle(section),...contentAlignmentStyle}}>
        {section.badge&&<div className="cms-editorial-kicker text-xs uppercase tracking-[.2em] mb-5" style={{color:section.design?.accentColor||'#C5A880'}}>{section.badge}</div>}
        {section.title&&<h2 className="cms-section-heading text-4xl md:text-6xl font-normal mb-5" style={headingCustomStyle}>{section.title}</h2>}
        {section.subtitle&&<p className="cms-section-body max-w-3xl mb-10" style={bodyCustomStyle}>{section.subtitle}</p>}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 lg:gap-8">
          <div className="flex flex-col gap-3" role="tablist" aria-label={`Danh mục ${section.title}`}>{activeItems.map((item,index)=><button key={item.id} id={`editorial-tab-${section.id}-${item.id}`} type="button" role="tab" aria-selected={selected?.id===item.id} aria-controls={`editorial-panel-${section.id}`} onClick={()=>setActiveEditorialItemId(item.id)} className={`cms-editorial-choice text-left border p-5 md:p-6 transition-colors ${selected?.id===item.id?'cms-editorial-choice-active':''}`}><span className="cms-editorial-kicker block text-xs tracking-widest mb-2" style={{color:section.design?.accentColor||'#C5A880'}}>{String(index+1).padStart(2,'0')} / {item.tag||'DANH MỤC'}</span><span className="block text-2xl leading-tight cms-editorial-title" style={itemTypographyStyle(item,'title')}>{item.title}</span>{item.role&&<span className="block text-xs uppercase opacity-60 mt-2">{item.role}</span>}</button>)}</div>
          <div id={`editorial-panel-${section.id}`} role="tabpanel" aria-labelledby={selected?`editorial-tab-${section.id}-${selected.id}`:undefined} className="cms-editorial-panel border p-6 md:p-10 min-h-[350px] flex flex-col justify-between">
            {selected?<><div>{selected.avatar&&<img src={selected.avatar} alt={selected.imageAlt||selected.title} className="w-full max-h-56 object-cover mb-6"/>}<span className="cms-editorial-kicker text-xs tracking-widest" style={{color:section.design?.accentColor||'#C5A880'}}>{selected.tag||'CHI TIẾT'}</span><h3 className="cms-editorial-title text-3xl md:text-4xl mt-3 mb-5" style={itemTypographyStyle(selected,'title')}>{selected.title}</h3><p className="cms-section-body leading-relaxed" style={{color:section.typographySettings?.body?.color,...itemTypographyStyle(selected,'body')}}>{selected.description}</p>{selected.features?.length>0&&<ul className="mt-6 border-t border-current/15 pt-5 space-y-3">{selected.features.map((feature,i)=><li key={i} className="text-sm flex gap-3"><span style={{color:section.design?.accentColor||'#C5A880'}}>◌</span>{feature}</li>)}</ul>}</div><div className="mt-8 pt-6 border-t border-current/15"><SmartActionButton cta={selected.cta} fallbackText={selected.ctaText||'Tìm hiểu giải pháp'} fallbackAction={selected.ctaLink?{type:selected.ctaLink.startsWith('#')?'scroll':'url',target:selected.ctaLink.replace(/^#/,'')}:{type:'scroll',target:'lead-form-section'}} sectionId={sectionDomId(section)} product={selected.title}/></div></>:<p className="opacity-70">Thêm mục trong CMS để hiển thị danh mục.</p>}
          </div>
        </div>
      </div>
    </section>;
  }

  // 2. PRODUCTS / PACKAGES SECTION
  if (section.type === 'products') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {section.badge && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#0054a6] bg-blue-100/90 border border-blue-200 px-3.5 py-1 rounded-full mb-3 inline-block">
                {section.badge}
              </span>
            )}
            <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight mb-3" style={headingCustomStyle}>
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="cms-section-body text-sm sm:text-base text-neutral-600 leading-relaxed" style={bodyCustomStyle}>
                {section.subtitle}
              </p>
            )}
          </div>

          <div
            className={`grid gap-6 sm:gap-8 ${advancedGridClass} ${
              section.layout === 'grid-2'
                ? 'grid-cols-1 md:grid-cols-2'
                : section.layout === 'grid-4'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-3'
            }`}
            style={advancedGridStyle}
          >
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="cms-config-card cms-card-hover bg-white border rounded-2xl overflow-hidden flex flex-col group"
                data-hover={resolveCardStyle(cmsConfig,item)?.hoverEffect ?? (cmsConfig?.websiteSettings?.visualTheme?.cardMotion===false?'none':getUiMapping(cmsConfig?.websiteSettings,'productCard'))} style={cardCss(item)}
              >
                {item.avatar && (
                  <div className="h-44 sm:h-48 w-full overflow-hidden relative bg-neutral-100">
                    <picture>
                      {item.mobileImage && <source media="(max-width: 767px)" srcSet={item.mobileImage} />}
                      <img
                        src={item.avatar || undefined}
                        alt={item.imageAlt || item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </picture>
                    {item.tag && (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                        {item.tag}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug" style={itemTypographyStyle(item, 'title')}>
                        {item.title}
                      </h3>
                    </div>

                    {item.price && (
                      <div className="text-base font-black text-[#0054a6] mb-2.5" style={itemTypographyStyle(item, 'meta')}>
                        {item.price}
                      </div>
                    )}

                    <p className="cms-section-body text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4" style={itemTypographyStyle(item, 'body')}>
                      {item.description}
                    </p>

                    {item.features && item.features.length > 0 && (
                      <ul className="space-y-2 pt-2 border-t border-neutral-100">
                        {item.features.map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-xs text-neutral-700">
                            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-2">
                    <SmartActionButton
                      cta={item.cta}
                      fallbackText={item.ctaText || 'Nhận Báo Phí Gói Này'}
                      fallbackAction={item.ctaLink ? { type: item.ctaLink.startsWith('#') ? 'scroll' : 'url', target: item.ctaLink.replace(/^#/, '') } : { type: 'scroll', target: 'lead-form-section' }}
                      sectionId={sectionDomId(section)}
                      product={item.title}
                      className="cms-section-cta w-full text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 3. FEATURES / VALUE DELIVERABLES SECTION
  if (section.type === 'features') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {section.badge && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#0054a6] bg-blue-100/90 border border-blue-200 px-3.5 py-1 rounded-full mb-3 inline-block">
                {section.badge}
              </span>
            )}
            <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight mb-3" style={headingCustomStyle}>
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="cms-section-body text-sm sm:text-base text-neutral-600 leading-relaxed" style={bodyCustomStyle}>
                {section.subtitle}
              </p>
            )}
          </div>

          <div
            className={`grid gap-6 sm:gap-8 ${advancedGridClass} ${
              section.layout === 'grid-2'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-3'
            }`}
            style={advancedGridStyle}
          >
            {activeItems.map((item) => {
              const IconComp = item.icon && iconMap[item.icon] ? iconMap[item.icon] : Zap;
              return (
                <div
                  key={item.id}
                  className="cms-config-card cms-card-hover bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between" data-hover={resolveCardStyle(cmsConfig,item)?.hoverEffect ?? (cmsConfig?.websiteSettings?.visualTheme?.cardMotion===false?'none':getUiMapping(cmsConfig?.websiteSettings,'otherCard'))} style={cardCss(item)}
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0054a6] flex items-center justify-center mb-5 shadow-inner">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-950 mb-2.5 leading-snug" style={itemTypographyStyle(item, 'title')}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-neutral-600 leading-relaxed" style={itemTypographyStyle(item, 'body')}>
                      {item.description}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // 4. GALLERY / PARTNER HOSPITALS / IMAGE SHOWCASE
  if (section.type === 'gallery') {
    const images = section.images || [];
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {section.badge && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#0054a6] bg-blue-100/90 border border-blue-200 px-3.5 py-1 rounded-full mb-3 inline-block">
                {section.badge}
              </span>
            )}
            <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight mb-3" style={headingCustomStyle}>
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="cms-section-body text-sm sm:text-base text-neutral-600 leading-relaxed" style={bodyCustomStyle}>
                {section.subtitle}
              </p>
            )}
          </div>

          <div
            className={`grid gap-4 sm:gap-6 ${advancedGridClass} ${
              section.layout === 'grid-2'
                ? 'grid-cols-1 sm:grid-cols-2'
                : section.layout === 'grid-3'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-2 md:grid-cols-4'
            }`}
            style={advancedGridStyle}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImageLightbox(img)}
                className="group relative rounded-2xl overflow-hidden bg-white border border-neutral-200 shadow-xs cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="h-44 sm:h-52 w-full overflow-hidden bg-neutral-100">
                  <picture>
                    {img.mobileUrl && <source media="(max-width: 767px)" srcSet={img.mobileUrl} />}
                    <img
                      src={img.url || undefined}
                      alt={img.alt || img.caption || 'Hình ảnh hoạt động'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      style={{ objectFit: (img.fit === 'auto' ? 'cover' : (img.fit || 'cover')), objectPosition: `${img.focalPointX ?? 50}% ${img.focalPointY ?? 50}%` }}
                    />
                  </picture>
                </div>
                {img.caption && (
                  <div className="p-3 bg-white border-t border-neutral-100">
                    <p className="text-xs font-bold text-neutral-800 truncate">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox modal */}
        {activeImageLightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setActiveImageLightbox(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveImageLightbox(null)}
                className="absolute top-4 right-4 bg-black/60 text-white hover:text-amber-400 p-2 rounded-full cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={activeImageLightbox.url || undefined}
                alt={activeImageLightbox.alt || 'Xem ảnh'}
                referrerPolicy="no-referrer"
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
              {activeImageLightbox.caption && (
                <div className="p-4 text-center text-sm font-semibold text-white">
                  {activeImageLightbox.caption}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  // 5. TESTIMONIALS SECTION
  if (section.type === 'testimonials') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {section.badge && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#0054a6] bg-blue-100/90 border border-blue-200 px-3.5 py-1 rounded-full mb-3 inline-block">
                {section.badge}
              </span>
            )}
            <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3" style={headingCustomStyle}>
              {section.title}
            </h2>
            {section.subtitle && (
              <p
                className={`cms-section-body text-sm sm:text-base leading-relaxed ${
                  isDarkBg ? 'text-blue-100' : 'text-neutral-600'
                }`}
                style={bodyCustomStyle}
              >
                {section.subtitle}
              </p>
            )}
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 ${advancedGridClass}`} style={advancedGridStyle}>
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="cms-config-card cms-card-hover bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between" data-hover={resolveCardStyle(cmsConfig,item)?.hoverEffect ?? (cmsConfig?.websiteSettings?.visualTheme?.cardMotion===false?'none':getUiMapping(cmsConfig?.websiteSettings,'otherCard'))} style={cardCss(item)}
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-4">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <h4 className="text-base font-bold text-neutral-950 mb-2 leading-snug" style={itemTypographyStyle(item, 'title')}>
                    {item.title}
                  </h4>
                  <p className="text-sm text-neutral-600 leading-relaxed italic mb-6" style={itemTypographyStyle(item, 'body')}>
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
                  {item.avatar && (
                    <img
                      src={item.avatar || undefined}
                      alt={item.role || 'Avatar'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-neutral-800 block truncate">
                      {item.role || 'Khách hàng thân thiết'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 6. GUARANTEE & TRUST SECTION
  if (section.type === 'guarantee') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-300/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-9 h-9" />
          </div>

          {section.badge && (
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-white/15 border border-white/20 px-3.5 py-1 rounded-full mb-4 inline-block">
              {section.badge}
            </span>
          )}

          <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-4" style={headingCustomStyle}>
            {section.title}
          </h2>

          <p
            className={`cms-section-body text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-8 ${
              isDarkBg ? 'text-blue-100' : 'text-neutral-600'
            }`}
            style={bodyCustomStyle}
          >
            {section.subtitle}
          </p>

          {(section.ctaText || section.cta?.text) && (
            <SmartActionButton cta={section.cta} fallbackText={section.ctaText} fallbackAction={{ type: 'scroll', target: 'lead-form-section' }} sectionId={sectionDomId(section)} className="cms-section-cta text-sm sm:text-base" />
          )}
        </div>
      </section>
    );
  }

  // 7. CTA BANNER SECTION
  if (section.type === 'ctaBanner') {
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden border-y border-blue-900`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {section.badge && (
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 border border-amber-400/30 px-3.5 py-1 rounded-full mb-4 inline-block">
              {section.badge}
            </span>
          )}

          <h2 className="cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-3" style={headingCustomStyle}>
            {section.title}
          </h2>

          <p
            className={`cms-section-body text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8 ${
              isDarkBg ? 'text-blue-100' : 'text-neutral-600'
            }`}
            style={bodyCustomStyle}
          >
            {section.subtitle}
          </p>

          <SmartActionButton cta={section.cta} fallbackText={section.ctaText || 'Đăng Ký Tư Vấn Ngay'} fallbackAction={{ type: 'scroll', target: 'lead-form-section' }} sectionId={sectionDomId(section)} className="cms-section-cta text-sm sm:text-base" />
        </div>
      </section>
    );
  }

  // 8. FAQ SECTION (Accordion)
  if (section.type === 'faq') {
    return <FaqAccordion section={section} />;
  }

  // 9. TEXT & MEDIA (Custom content)
  if (section.type === 'textMedia') {
    const mediaPosition = section.layoutSettings?.mediaPosition || section.imagePosition || 'right';
    const isImageLeft = mediaPosition === 'left';
    return (
      <section
        id={sectionDomId(section)}
        className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
        style={getSectionBgStyle()}
      >
        {renderBackgroundVideo()}{renderBgOverlay()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 cms-section-content" style={{ ...sectionContainerStyle(section), ...contentAlignmentStyle }}>
          <div className="cms-config-split" style={sectionSplitStyle(section)}>
            {/* Image column */}
            {section.imageUrl && (
              <div
                className="cms-split-image"
                style={sectionImageWrapperStyle(section)}
              >
                <div
                  className="relative overflow-hidden shadow-md border border-neutral-200/80 w-full"
                  style={{
                    borderRadius: (section.imageBorderRadius ?? section.layoutSettings?.imageBorderRadius) !== undefined
                      ? `${section.imageBorderRadius ?? section.layoutSettings?.imageBorderRadius}px`
                      : '16px',
                  }}
                >
                  <picture>
                    {section.mobileImageUrl && <source media="(max-width: 767px)" srcSet={section.mobileImageUrl} />}
                    <img
                      src={section.imageUrl || undefined}
                      alt={section.imageAlt || section.title}
                      referrerPolicy="no-referrer"
                      className="cms-section-image w-full h-auto"
                      style={sectionImageStyle(section)}
                    />
                  </picture>
                </div>
              </div>
            )}

            {/* Text column */}
            <div
              className={`${section.imageUrl ? '' : 'max-w-3xl mx-auto text-center'} space-y-4 cms-section-content cms-split-content`}
            >
              {section.badge && (
                <span className="text-xs font-bold uppercase tracking-wider text-[#0054a6] bg-blue-100 px-3.5 py-1 rounded-full inline-block">
                  {section.badge}
                </span>
              )}
              <h2
                className={`cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${
                  isDarkBg ? 'text-white' : 'text-neutral-950'
                }`}
                style={headingCustomStyle}
              >
                {section.title}
              </h2>
              {section.subtitle && (
                <p
                  className={`cms-section-body text-base leading-relaxed ${
                    isDarkBg ? 'text-blue-100' : 'text-neutral-600'
                  }`}
                  style={bodyCustomStyle}
                >
                  {section.subtitle}
                </p>
              )}
              {section.content && (
                <div
                  className={`cms-section-body text-sm leading-relaxed whitespace-pre-line ${
                    isDarkBg ? 'text-neutral-200' : 'text-neutral-700'
                  }`}
                  style={bodyCustomStyle}
                >
                  {section.content}
                </div>
              )}
              {activeItems.length > 0 && (
                <div className="grid gap-3 pt-1">
                  {activeItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--sec-accent, var(--cms-primary))' }} />
                      <div>
                        {item.title && <div className="font-bold text-sm" style={itemTypographyStyle(item, 'title')}>{item.title}</div>}
                        {item.description && <div className="cms-section-body text-sm opacity-80" style={itemTypographyStyle(item, 'body')}>{item.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(section.ctaText || section.cta?.text) && (
                <div className="pt-2">
                  <SmartActionButton cta={section.cta} fallbackText={section.ctaText} fallbackAction={{ type: 'scroll', target: 'lead-form-section' }} sectionId={sectionDomId(section)} className="cms-section-cta text-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Fallback default renderer
  return (
    <section
      id={sectionDomId(section)}
      className={`${getBgClasses()} ${getPaddingClasses()} ${getVisibilityClasses()} relative overflow-hidden`}
      style={getSectionBgStyle()}
    >
      {renderBackgroundVideo()}{renderBgOverlay()}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <h2 className="cms-section-heading text-2xl sm:text-3xl font-extrabold mb-2" style={headingCustomStyle}>{section.title}</h2>
        {section.subtitle && (
          <p
            className={`cms-section-body text-sm sm:text-base mb-6 ${
              isDarkBg ? 'text-blue-100' : 'text-neutral-600'
            }`}
            style={bodyCustomStyle}
          >
            {section.subtitle}
          </p>
        )}
        {section.content && (
          <div
            className={`cms-section-body text-sm leading-relaxed text-left ${
              isDarkBg ? 'text-neutral-200' : 'text-neutral-700'
            }`}
            style={bodyCustomStyle}
          >
            {section.content}
          </div>
        )}
      </div>
    </section>
  );
};

// FAQ Accordion subcomponent
const FaqAccordion: React.FC<{ section: LandingPageSection }> = ({ section }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const itemTypographyStyle = (item: SectionItem, kind: 'title' | 'body' | 'meta'): React.CSSProperties => {
    if (item.typography?.useGlobal !== false) return {};
    const t = item.typography?.[kind];
    if (!t) return {};
    return {
      fontFamily: t.fontFamily || undefined,
      color: t.color || undefined,
      fontWeight: t.fontWeight || undefined,
      lineHeight: t.lineHeight || undefined,
      letterSpacing: t.letterSpacing !== undefined ? `${t.letterSpacing}px` : undefined,
      textAlign: t.textAlign || undefined,
      ...(t.fontSize !== undefined ? { fontSize: `${t.fontSize}px` } : {}),
    };
  };

  const isImageMode = (section.bgMode === 'image' || section.bgType === 'image') && !!section.bgImageUrl;
  const isDarkBg =
    isImageMode ||
    section.bgType === 'brand-blue' ||
    section.bgType === 'dark' ||
    section.bgType === 'gradient';

  const getFaqBgStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = { ...sectionAdvancedStyle(section) };
    if (section.design?.backgroundType) return style;
    if (isImageMode && section.bgImageUrl) {
      style.backgroundImage = `url(${section.bgImageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    } else if (section.bgType === 'gradient') {
      style.background = 'linear-gradient(135deg, var(--cms-secondary, #003870), var(--cms-primary, #0054a6))';
    } else if (section.bgType === 'brand-blue') {
      style.backgroundColor = 'var(--cms-primary, #0054a6)';
    } else if (section.bgType === 'light') {
      style.backgroundColor = 'var(--cms-background-light, #f4f8fc)';
    } else if (section.customBgColor) {
      style.backgroundColor = section.customBgColor;
    }
    return style;
  };

  return (
    <section
      id={sectionDomId(section)}
      className={`${section.design ? 'cms-advanced-section' : 'py-14 sm:py-20'} ${sectionVisibilityClass(section)} relative overflow-hidden ${
        isImageMode
          ? 'text-white'
          : section.bgType === 'brand-blue'
          ? 'bg-[var(--cms-primary)] text-white'
          : section.bgType === 'dark'
          ? 'bg-neutral-950 text-white'
          : section.bgType === 'gradient'
          ? 'text-white'
          : 'bg-[var(--cms-background-light)] text-[var(--cms-text-primary)]'
      }`}
      style={getFaqBgStyle()}
    >
      {section.design?.backgroundType === 'video' && section.design.backgroundVideo && (
        <video className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ zIndex: 0 }} src={section.design.backgroundVideo || undefined} autoPlay muted loop playsInline aria-hidden="true" />
      )}
      {(() => {
        const advancedOpacity = section.design?.overlayOpacity;
        const opacity = typeof advancedOpacity === 'number' ? advancedOpacity / 100 : typeof section.overlayOpacity === 'number' ? section.overlayOpacity / 100 : isImageMode ? 0.5 : 0;
        if (opacity <= 0) return null;
        return <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: section.design?.overlayColor || section.overlayColor || '#000000', opacity, zIndex: 1 }} />;
      })()}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 sm:mb-14">
          {section.badge && (
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 inline-block ${
                isDarkBg
                  ? 'bg-white/15 text-amber-300 border border-white/20'
                  : 'text-[#0054a6] bg-blue-100'
              }`}
            >
              {section.badge}
            </span>
          )}
          <h2
            className={`cms-section-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 ${
              isDarkBg ? 'text-white' : 'text-neutral-900'
            }`}
          >
            {section.title}
          </h2>
          {section.subtitle && (
            <p
              className={`text-sm sm:text-base ${
                isDarkBg ? 'text-blue-100' : 'text-neutral-600'
              }`}
            >
              {section.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {(section.items || []).filter((item) => item.enabled !== false && !item.deletedAt).map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.id}
                className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full py-4 px-5 sm:px-6 text-left flex items-center justify-between gap-4 font-bold text-neutral-900 text-sm sm:text-base hover:bg-neutral-50/70 cursor-pointer"
                >
                  <span style={itemTypographyStyle(item, 'title')}>{item.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#0054a6]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-1 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100" style={itemTypographyStyle(item, 'body')}>
                    {item.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
