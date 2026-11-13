import React, { useEffect, useState } from 'react';
import { Sparkles, Check, Star, ArrowRight, ShieldCheck, Award, HeartPulse, PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react';
import { LandingPageConfig } from '../../types';
import { CountdownBanner } from './CountdownBanner';
import { LeadForm } from './LeadForm';
import { SmartActionButton } from '../common/SmartActionButton';
import { safeNavigationUrl } from '../../utils/urlSafety';
import { samePageCmsSectionTarget, scrollToCmsSection } from '../../utils/actionRuntime';

interface Props {
  config: LandingPageConfig;
  onLeadSuccess?: (leadId: string) => void;
  onAdminClick?: () => void;
}

export const HeroSection: React.FC<Props> = ({ config, onLeadSuccess, onAdminClick }) => {
  const handleLegacyHeaderCta = (e: React.MouseEvent, target?: string) => {
    const sectionTarget = samePageCmsSectionTarget(target || '#lead-form-section');
    if (!sectionTarget) return;
    e.preventDefault();
    scrollToCmsSection(sectionTarget);
  };

  const scrollToProducts = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!scrollToCmsSection('section-sec_products')) scrollToCmsSection('section-sec_features');
  };

  const isImageBg = (config.heroBackgroundMode === 'image' || !config.heroBackgroundMode) && !!config.heroBackgroundImage;
  const overlayOpacity = typeof config.heroOverlayOpacity === 'number' ? config.heroOverlayOpacity / 100 : 0.15;
  const logoUrl = config.headerLogoUrl || config.brandLogoUrl;
  const headerLogoHeight = config.headerLogoHeight || 44;
  const effectiveHotline = config.websiteSettings?.header?.hotline || config.hotline || '';
  const heroSlides = (config.heroSlides || []).filter((slide) => !!slide?.url && slide.enabled !== false);
  const heroBenefits = config.heroBenefits || [];
  const hasConfiguredForm = (config.formFields || []).some((field) => field && field.visible !== false && !field.deletedAt);
  // New Hero mode: half-width image slideshow + lead form.
  // Keep the legacy 'full-image' value readable so old published configs do not break.
  const isImageFormHero =
    (config.heroLayoutMode === 'image-form' || config.heroLayoutMode === 'full-image') &&
    heroSlides.length > 0;
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const visualTheme = config.websiteSettings?.visualTheme;
  const useMotionVideo = visualTheme?.uxEnabled !== false && visualTheme?.heroVideoEnabled === true && !!visualTheme?.heroVideoUrl;
  const cinematicVideo = useMotionVideo ? (
    <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none cms-motion-hero-media ${visualTheme?.heroScrollMotion===false?'cms-motion-hero-static':''}`} aria-hidden="true">
      <video
        src={visualTheme?.heroVideoUrl}
        poster={visualTheme?.heroPosterUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        style={{ filter: `brightness(${visualTheme?.heroVideoBrightness ?? 62}%)` }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(visualTheme?.heroVideoOverlay ?? 58)/100})` }} />
      <div className="absolute inset-0 cms-motion-hero-vignette" />
    </div>
  ) : null;

  useEffect(() => {
    if (!isImageFormHero) {
      setActiveHeroSlide(0);
      return;
    }
    setActiveHeroSlide((current) => Math.min(current, heroSlides.length - 1));
    if (heroSlides.length <= 1) return;

    const interval = Math.max(2000, config.heroAutoplayMs || 4500);
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [isImageFormHero, heroSlides.length, config.heroAutoplayMs]);

  const currentHeroSlide = heroSlides[activeHeroSlide];
  // Image + form always uses a viewport-aware image frame. A CMS preset must
  // not force an oversized minimum height that crops portrait campaign artwork.
  // Other Hero variants retain their existing sizing and settings.
  const heroHeightClass = `cms-hero-responsive-media cms-hero-height-${['compact', 'normal', 'screen'].includes(config.heroHeightMode || '') ? config.heroHeightMode : 'large'}`;

  if (config.heroLayoutMode === 'cinematic') {
    const heroVisual=config.heroBackgroundImage||config.heroImage;
    return <section id="hero-main" data-section-name="Hero" className="cms-hero-cinematic relative min-h-[86vh] md:min-h-[100vh] overflow-hidden flex flex-col justify-between text-[#F9F8F5]" style={{backgroundColor:config.heroCustomBgColor||'#0B0C0E'}}>
      {cinematicVideo||(!useMotionVideo&&heroVisual&&<img src={heroVisual} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover cms-motion-hero-media"/>)}
      <div className="absolute inset-0 pointer-events-none" style={{background:`linear-gradient(90deg,rgba(11,12,14,${Math.max(.35,overlayOpacity)}) 0%,rgba(11,12,14,.48) 55%,rgba(11,12,14,.28) 100%)`}}/>
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-36 sm:pt-44 pb-10 flex-1 flex flex-col justify-center">
        {config.heroBadge&&<p className="text-[11px] sm:text-xs uppercase tracking-[.24em] font-semibold text-[#C5A880] mb-8">— &nbsp; {config.heroBadge}</p>}
        {config.headline&&<h1 className="max-w-5xl text-[clamp(3rem,7vw,6.5rem)] leading-[.98] tracking-[-.025em] font-normal" style={{fontFamily:config.heroTitleFontFamily||"'Cormorant Garamond', Georgia, serif",fontSize:config.heroTitleFontSize?`${config.heroTitleFontSize}px`:undefined,fontWeight:config.heroTitleFontWeight||400,color:config.heroTitleColor||'#F9F8F5'}}>{config.headline}</h1>}
        {config.subtitle&&<p className="max-w-2xl text-base sm:text-xl leading-relaxed mt-8 text-[#B3B0A6]" style={{fontFamily:config.heroSubtitleFontFamily||"'Plus Jakarta Sans', sans-serif",fontSize:config.heroSubtitleFontSize?`${config.heroSubtitleFontSize}px`:undefined,color:config.heroSubtitleColor||'#B3B0A6'}}>{config.subtitle}</p>}
        <div className="flex flex-wrap gap-3 mt-9">{(config.heroPrimaryCta||config.heroCtaPrimary)&&<SmartActionButton sectionId="hero-main" cta={config.heroPrimaryCta} fallbackText={config.heroCtaPrimary} fallbackAction={{type:'scroll',target:'lead-form-section'}}/>}{(config.heroSecondaryCta||config.heroCtaSecondary)&&<SmartActionButton sectionId="hero-secondary" cta={config.heroSecondaryCta} fallbackText={config.heroCtaSecondary} fallbackAction={{type:'scroll',target:'sec_products'}}/>}</div>
      </div>
      {heroBenefits.length>0&&<div className="relative z-10 border-t border-white/15 w-full"><div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">{heroBenefits.slice(0,3).map((benefit,index)=><div key={benefit.id} className="py-6 sm:px-6 first:sm:pl-0"><span className="text-xs tracking-widest text-[#C5A880]">0{index+1} / {benefit.title}</span><p className="text-sm text-[#B3B0A6] mt-2 leading-relaxed">{benefit.text}</p></div>)}</div></div>}
    </section>;
  }

  if (isImageFormHero && currentHeroSlide) {
    const goToSlide = (index: number) => {
      const total = heroSlides.length;
      setActiveHeroSlide((index + total) % total);
    };

    return (
      <section
        id="hero-main" data-section-name="Hero"
        className="cms-hero-image-form relative pt-3 pb-5 sm:pt-4 sm:pb-7 overflow-hidden"
        style={config.heroCustomBgColor ? { backgroundColor: config.heroCustomBgColor } : undefined}
      >
        {cinematicVideo}
        {!config.heroCustomBgColor && !useMotionVideo && (
          <div className="absolute inset-0 bg-radial from-blue-100/60 via-white to-neutral-50/80 -z-10" />
        )}

        {!useMotionVideo && isImageBg && config.heroBackgroundImage && (
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <img
              src={config.heroBackgroundImage || undefined}
              alt="Hero background"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ opacity: overlayOpacity }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: config.heroOverlayColor || 'transparent',
                opacity: config.heroOverlayColor ? 0.4 : 0,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/95 to-neutral-50" />
          </div>
        )}

        <div
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ maxWidth: config.heroContainerMaxWidth ? `${config.heroContainerMaxWidth}px` : undefined }}
        >
          {/* Keep the exact same brand/navigation header as the standard Hero mode. */}
          {!config.websiteSettings?.header && (<header className="flex items-center justify-between pb-6 sm:pb-8 border-b border-blue-100/80 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl || undefined}
                  alt={config.brandName}
                  referrerPolicy="no-referrer"
                  style={{ height: `${headerLogoHeight}px` }}
                  className="max-w-[200px] object-contain rounded-md shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#003870] to-[#0054a6] text-white font-black flex items-center justify-center shadow-md border border-blue-400/30 shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-300" />
                </div>
              )}
              <div className="min-w-0">
                <span className="font-black text-base sm:text-lg text-[#0054a6] tracking-tight block truncate">
                  {config.brandName || 'Thương hiệu'}
                </span>
                <span className="text-[10px] sm:text-xs text-neutral-500 font-bold tracking-wider uppercase block truncate">
                  {config.brandLogoText || ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {effectiveHotline && (
                <a
                  href={`tel:${effectiveHotline.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl transition-all shadow-xs"
                  title="Bấm gọi Hotline trực tiếp"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="hidden sm:inline">{`Hotline: ${effectiveHotline}`}</span>
                  <span className="sm:hidden">{effectiveHotline}</span>
                </a>
              )}

              {config.headerShowCta !== false && !!(config.headerCtaText || config.heroCtaPrimary) && (
                <a
                  href={config.headerCtaUrl || '#lead-form-section'}
                  onClick={(e) => handleLegacyHeaderCta(e, config.headerCtaUrl)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-[#0054a6] text-white hover:bg-[#004182] px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <span>{config.headerCtaText || config.heroCtaPrimary}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}

              {onAdminClick && (
                <button
                  id="btn-nav-admin-cms" data-analytics-ignore="true"
                  type="button"
                  onClick={onAdminClick}
                  className="text-[11px] sm:text-xs font-bold text-white bg-[#0054a6] hover:bg-[#004182] border border-[#0054a6] px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                  title="Đăng nhập"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </header>)}

          {heroSlides.length > 1 && config.heroShowTabs !== false && (
            <div className="mb-2 sm:mb-3 overflow-x-auto cms-no-scrollbar">
              <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Chọn nội dung Hero">
                {heroSlides.map((slide,index)=><button key={slide.id||index} type="button" role="tab" aria-selected={index===activeHeroSlide} onClick={()=>goToSlide(index)} className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${index===activeHeroSlide?'bg-[var(--cms-primary)] text-white border-[var(--cms-primary)] shadow-sm':'bg-white text-neutral-700 border-neutral-200 hover:border-[var(--cms-primary)] hover:text-[var(--cms-primary)]'}`}>{slide.tabLabel||`Ảnh ${index+1}`}</button>)}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 ${hasConfiguredForm ? 'md:grid-cols-2' : ''} gap-3 sm:gap-4 lg:gap-6 items-start`}>
            {/* Left: exactly half of the desktop Hero, dedicated to the rotating campaign image. */}
            <div className={`relative overflow-hidden rounded-2xl border border-neutral-200 shadow-md bg-white ${heroHeightClass}`}>
              {heroSlides.map((slide, index) => (
                <a key={slide.id || `${slide.url}-${index}`} href={safeNavigationUrl(slide.link,true)||undefined} tabIndex={slide.link&&index===activeHeroSlide?0:-1} aria-label={slide.link?`Mở ${slide.alt||'ảnh Hero'}`:undefined} className={`absolute inset-0 ${index===activeHeroSlide?'z-[1]':'pointer-events-none'}`}><img
                  src={slide.url || undefined}
                  alt={slide.alt || config.brandName || 'Hero'}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-contain transition-opacity duration-1000 ${
                    index === activeHeroSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ objectPosition: config.heroImageObjectPosition || 'center' }}
                /></a>
              ))}

              {Number(config.heroFullImageOverlayOpacity ?? 0) > 0 && (
                <div
                  className="absolute inset-0 bg-black pointer-events-none"
                  style={{ opacity: Math.max(0, Math.min(100, config.heroFullImageOverlayOpacity)) / 100 }}
                />
              )}

              {heroSlides.length > 1 && config.heroShowArrows !== false && (
                <>
                  <button
                    type="button"
                    aria-label="Ảnh Hero trước"
                    onClick={() => goToSlide(activeHeroSlide - 1)}
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Ảnh Hero tiếp theo"
                    onClick={() => goToSlide(activeHeroSlide + 1)}
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {heroSlides.length > 1 && config.heroShowDots !== false && (
                <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.id || `${index}`}
                      type="button"
                      aria-label={`Chuyển tới ảnh ${index + 1}`}
                      onClick={() => goToSlide(index)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        index === activeHeroSlide ? 'w-7 bg-white' : 'w-2 bg-white/60 hover:bg-white/90'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="absolute top-3 left-3 z-10 rounded-full bg-black/35 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-[10px] sm:text-xs font-bold text-white">
                {activeHeroSlide + 1} / {heroSlides.length}
              </div>
            </div>

            {hasConfiguredForm && <div id="lead-form-section" className="cms-hero-lead-form scroll-mt-6 min-w-0 flex items-start">
              <div className="w-full min-w-0">
                <LeadForm fields={config?.formFields || []} settings={config?.formSettings} onSuccess={onLeadSuccess} />
              </div>
            </div>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero-main" data-section-name="Hero"
      className="relative pt-5 pb-12 sm:pt-8 sm:pb-20 overflow-hidden"
      style={config.heroCustomBgColor ? { backgroundColor: config.heroCustomBgColor } : undefined}
    >
      {cinematicVideo}
      {/* Background Subtle Gradient & Accents */}
      {!config.heroCustomBgColor && !useMotionVideo && (
        <div className="absolute inset-0 bg-radial from-blue-100/60 via-white to-neutral-50/80 -z-10" />
      )}

      {!useMotionVideo && isImageBg && config.heroBackgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <img
            src={config.heroBackgroundImage || undefined}
            alt="Hero background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            style={{ opacity: overlayOpacity }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: config.heroOverlayColor || 'transparent',
              opacity: config.heroOverlayColor ? 0.4 : 0,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/95 to-neutral-50" />
        </div>
      )}

      <div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ maxWidth: config.heroContainerMaxWidth ? `${config.heroContainerMaxWidth}px` : undefined }}
      >
        {/* Navigation Bar / Brand Header */}
        {!config.websiteSettings?.header && (<header className="flex items-center justify-between pb-6 sm:pb-8 border-b border-blue-100/80 mb-8 sm:mb-12">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl || undefined}
                alt={config.brandName}
                referrerPolicy="no-referrer"
                style={{ height: `${headerLogoHeight}px` }}
                className="max-w-[200px] object-contain rounded-md"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#003870] to-[#0054a6] text-white font-black flex items-center justify-center shadow-md border border-blue-400/30">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
            )}
            <div>
              <span className="font-black text-base sm:text-lg text-[#0054a6] tracking-tight block">
                {config.brandName || 'Thương hiệu'}
              </span>
              <span className="text-[10px] sm:text-xs text-neutral-500 font-bold tracking-wider uppercase">
                {config.brandLogoText || ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Click-to-Call Hotline */}
            {effectiveHotline && (
              <a
                href={`tel:${effectiveHotline.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl transition-all shadow-xs"
                title="Bấm gọi Hotline trực tiếp"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline">{`Hotline: ${effectiveHotline}`}</span>
                <span className="sm:hidden">{effectiveHotline}</span>
              </a>
            )}

            {config.headerShowCta !== false && !!(config.headerCtaText || config.heroCtaPrimary) && (
              <a
                href={config.headerCtaUrl || '#lead-form-section'}
                onClick={(e) => handleLegacyHeaderCta(e, config.headerCtaUrl)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-[#0054a6] text-white hover:bg-[#004182] px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <span>{config.headerCtaText || config.heroCtaPrimary}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}

            {onAdminClick && (
              <button
                id="btn-nav-admin-cms" data-analytics-ignore="true"
                onClick={onAdminClick}
                className="text-[11px] sm:text-xs font-bold text-white bg-[#0054a6] hover:bg-[#004182] border border-[#0054a6] px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                title="Đăng nhập"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </header>)}

        {/* Hero Grid: Copy & Trust on Left, Lead Form on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Headline, Proof, Value, Countdown */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-left">
            {/* Urgency / Authority Badge */}
            {config.heroBadge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-[#0054a6] text-xs sm:text-sm font-bold shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{config.heroBadge}</span>
              </div>
            )}

            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-950 tracking-tight leading-[1.2]"
              style={{
                fontFamily: config.heroTitleFontFamily || undefined,
                fontSize: config.heroTitleFontSize ? `${config.heroTitleFontSize}px` : undefined,
                fontWeight: config.heroTitleFontWeight || undefined,
                color: config.heroTitleColor || undefined,
              }}
            >
              {config.headline}
            </h1>

            {/* Subtitle */}
            <p
              className="text-base sm:text-lg text-neutral-700 font-normal leading-relaxed max-w-2xl"
              style={{
                fontFamily: config.heroSubtitleFontFamily || undefined,
                fontSize: config.heroSubtitleFontSize ? `${config.heroSubtitleFontSize}px` : undefined,
                color: config.heroSubtitleColor || undefined,
              }}
            >
              {config.subtitle}
            </p>

            {/* Key Quick Benefit Bullets - editable from Đăng nhập */}
            {heroBenefits.length > 0 && (
              <div className="space-y-2.5 py-1">
                {heroBenefits.map((benefit) => (
                  <div key={benefit.id} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-neutral-800">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span><strong>{benefit.title}</strong> {benefit.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hero Visual Image Showcase */}
            {config.heroImage && (
              <div
                className="relative overflow-hidden border border-neutral-200/90 shadow-md group my-2"
                style={{
                  borderRadius: config.heroImageBorderRadius !== undefined ? `${config.heroImageBorderRadius}px` : '16px',
                }}
              >
                <img
                  src={config.heroImage || undefined}
                  alt={config.heroImageAlt || config.headline}
                  referrerPolicy="no-referrer"
                  className="w-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                  style={{
                    maxHeight: config.heroImageMaxHeight ? `${config.heroImageMaxHeight}px` : undefined,
                    height: config.heroImageMaxHeight ? `${config.heroImageMaxHeight}px` : undefined,
                  }}
                />
                {safeNavigationUrl(config.heroImageLink,true)&&<a href={safeNavigationUrl(config.heroImageLink,true)} aria-label={`Mở ${config.heroImageAlt||'ảnh Hero'}`} className="absolute inset-0 z-10"/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2">
                    {config.heroImageBadgeText && <span className="px-3 py-1 rounded-full text-white text-xs font-bold shadow-xs flex items-center gap-1.5" style={{background:'var(--cms-primary,#0054a6)'}}>
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      {config.heroImageBadgeText}
                    </span>}
                    <span className="text-white text-xs font-medium drop-shadow-sm">
                      {config.brandName}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Social Proof Bar - fully CMS configurable */}
            {config.heroSocialProofEnabled !== false && (config.heroRatingText || config.heroSocialProofText) && <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-600 border-t border-neutral-200">
              {config.heroRatingText && <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                <span className="font-bold text-neutral-900 ml-1">{config.heroRatingText}</span>
              </div>}
              {config.heroRatingText && config.heroSocialProofText && <span className="text-neutral-300">|</span>}
              {config.heroSocialProofText && <span className="font-medium">{config.heroSocialProofText}</span>}
            </div>}

            {/* Countdown card */}
            {config.countdown.enabled && (
              <div className="pt-2 max-w-lg">
                <CountdownBanner config={config.countdown} variant="card" />
              </div>
            )}

            {/* Action buttons */}
            {(config.heroPrimaryCta || config.heroCtaPrimary || config.heroSecondaryCta || config.heroCtaSecondary) && <div className="flex flex-wrap gap-3 pt-2">
              {(config.heroPrimaryCta || config.heroCtaPrimary) && <SmartActionButton
                sectionId="hero-main"
                cta={config.heroPrimaryCta}
                fallbackText={config.heroCtaPrimary}
                fallbackAction={{ type:'scroll', target:'lead-form-section', eventName:'hero_primary_cta_click' }}
                className="text-sm sm:text-base"
              />}
              {(config.heroSecondaryCta || config.heroCtaSecondary) && <SmartActionButton
                sectionId="hero-secondary"
                cta={config.heroSecondaryCta}
                fallbackText={config.heroCtaSecondary}
                fallbackAction={{ type:'scroll', target:'sec_products', eventName:'hero_secondary_cta_click' }}
                className="text-sm sm:text-base"
              />}
            </div>}
          </div>

          {hasConfiguredForm && <div id="lead-form-section" className="lg:col-span-5 scroll-mt-6">
            <LeadForm fields={config?.formFields || []} settings={config?.formSettings} onSuccess={onLeadSuccess} />
          </div>}
        </div>
      </div>
    </section>
  );
};
