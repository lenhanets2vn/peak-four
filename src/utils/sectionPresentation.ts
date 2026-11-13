import React from 'react';
import { BreakpointSettings, LandingPageSection } from '../types';

function gradientCss(section: LandingPageSection) {
  const g = section.design?.gradient;
  if (!g) return undefined;
  if (g.type === 'radial') return `radial-gradient(circle, ${g.color1 || '#003870'}, ${g.color2 || '#0054a6'})`;
  const direction = g.direction === 'right-left' ? '270deg' : g.direction === 'top-bottom' ? '180deg' : g.direction === 'bottom-top' ? '0deg' : g.direction === 'custom' ? `${g.angle ?? 90}deg` : '90deg';
  return `linear-gradient(${direction}, ${g.color1 || '#003870'}, ${g.color2 || '#0054a6'})`;
}

const px = (value: number | undefined, fallback?: number) => value !== undefined ? `${value}px` : fallback !== undefined ? `${fallback}px` : undefined;
const widthValue = (value?: 'auto' | 'full') => value === 'full' ? '100%' : value === 'auto' ? 'auto' : undefined;

export function sectionDomId(section: LandingPageSection) {
  return (section.anchorId || `section-${section.id}`).replace(/^#/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
}

function applyBreakpointVars(style: Record<string, any>, prefix: string, bp: BreakpointSettings | undefined, fallback: BreakpointSettings = {}) {
  const source = { ...fallback, ...(bp || {}) };
  if (source.paddingTop !== undefined) style[`--sec-${prefix}-pt`] = px(source.paddingTop);
  if (source.paddingBottom !== undefined) style[`--sec-${prefix}-pb`] = px(source.paddingBottom);
  if (source.paddingLeft !== undefined) style[`--sec-${prefix}-pl`] = px(source.paddingLeft);
  if (source.paddingRight !== undefined) style[`--sec-${prefix}-pr`] = px(source.paddingRight);
  if (source.marginTop !== undefined) style[`--sec-${prefix}-mt`] = px(source.marginTop);
  if (source.marginBottom !== undefined) style[`--sec-${prefix}-mb`] = px(source.marginBottom);
  if (source.headingSize !== undefined) style[`--sec-${prefix}-heading-size`] = px(source.headingSize);
  if (source.fontSize !== undefined) style[`--sec-${prefix}-body-size`] = px(source.fontSize);
  if (source.alignment) style[`--sec-${prefix}-align`] = source.alignment;
  if (source.imageHeight !== undefined) style[`--sec-${prefix}-image-height`] = px(source.imageHeight);
  if (source.imagePosition) style[`--sec-${prefix}-image-position`] = source.imagePosition;
  if (source.sectionHeight !== undefined) style[`--sec-${prefix}-height`] = px(source.sectionHeight);
  const buttonWidth = widthValue(source.buttonWidth);
  if (buttonWidth) style[`--sec-${prefix}-button-width`] = buttonWidth;
}

export function sectionAdvancedStyle(section: LandingPageSection): React.CSSProperties {
  const d = section.design;
  const responsive = section.responsiveSettings;
  const style: Record<string, any> = {};

  if (d?.backgroundType === 'solid') style.background = d.backgroundColor || 'transparent';
  if (d?.backgroundType === 'gradient') style.background = gradientCss(section);
  if (d?.backgroundType === 'image' && d.backgroundImage) {
    style.backgroundImage = `url(${d.backgroundImage})`;
    style.backgroundPosition = d.backgroundPosition || 'center';
    style.backgroundSize = d.backgroundSize || 'cover';
    style.backgroundRepeat = d.backgroundRepeat || 'no-repeat';
  }
  if (d?.backgroundType === 'transparent') style.background = 'transparent';
  if (d?.mobileBackgroundImage) style['--sec-mobile-bg'] = `url(${d.mobileBackgroundImage})`;
  if (d?.textColor) style.color = d.textColor;
  if (d?.accentColor) style['--sec-accent'] = d.accentColor;
  if (d?.borderColor || d?.borderWidth) {
    style.borderStyle = 'solid';
    style.borderColor = d.borderColor || 'transparent';
    style.borderWidth = d.borderWidth ?? 0;
  }
  if (d?.borderRadius !== undefined) style.borderRadius = d.borderRadius;
  const shadows: Record<string,string> = { none:'none', sm:'0 1px 3px rgba(0,0,0,.08)', md:'0 8px 20px rgba(0,0,0,.10)', lg:'0 16px 36px rgba(0,0,0,.14)', xl:'0 24px 56px rgba(0,0,0,.18)' };
  if (d?.boxShadow) style.boxShadow = shadows[d.boxShadow];

  const typography = section.typographySettings;
  if (typography && typography.useGlobal !== true) {
    const heading = typography.heading || {};
    const body = typography.body || {};
    if (heading.fontFamily) style['--sec-heading-family'] = heading.fontFamily;
    if (heading.fontWeight) style['--sec-heading-weight'] = String(heading.fontWeight);
    if (heading.italic) style['--sec-heading-style'] = 'italic';
    if (heading.underline) style['--sec-heading-decoration'] = 'underline';
    if (heading.lineHeight) style['--sec-heading-line'] = String(heading.lineHeight);
    if (heading.letterSpacing !== undefined) style['--sec-heading-spacing'] = `${heading.letterSpacing}px`;
    if (heading.color) style['--sec-heading-color'] = heading.color;
    if (heading.fontSize) style['--sec-desktop-heading-size'] = `${heading.fontSize}px`;
    if (heading.tabletSize) style['--sec-tablet-heading-size'] = `${heading.tabletSize}px`;
    if (heading.mobileSize) style['--sec-mobile-heading-size'] = `${heading.mobileSize}px`;
    if (heading.textAlign) style['--sec-desktop-align'] = heading.textAlign;
    if (body.fontFamily) style['--sec-body-family'] = body.fontFamily;
    if (body.fontWeight) style['--sec-body-weight'] = String(body.fontWeight);
    if (body.italic) style['--sec-body-style'] = 'italic';
    if (body.underline) style['--sec-body-decoration'] = 'underline';
    if (body.lineHeight) style['--sec-body-line'] = String(body.lineHeight);
    if (body.letterSpacing !== undefined) style['--sec-body-spacing'] = `${body.letterSpacing}px`;
    if (body.color) style['--sec-body-color'] = body.color;
    if (body.fontSize) style['--sec-desktop-body-size'] = `${body.fontSize}px`;
    if (body.tabletSize) style['--sec-tablet-body-size'] = `${body.tabletSize}px`;
    if (body.mobileSize) style['--sec-mobile-body-size'] = `${body.mobileSize}px`;
  }

  const desktop: BreakpointSettings = {
    paddingTop: d?.paddingTop ?? 48,
    paddingBottom: d?.paddingBottom ?? 48,
    paddingLeft: d?.paddingLeft ?? 0,
    paddingRight: d?.paddingRight ?? 0,
    marginTop: d?.marginTop ?? 0,
    marginBottom: d?.marginBottom ?? 0,
    sectionHeight: d?.minHeight,
    alignment: section.layoutSettings?.contentAlign || section.textAlign,
    imagePosition: section.imagePosition === 'left' || section.imagePosition === 'right' ? section.imagePosition : 'center',
  };
  applyBreakpointVars(style, 'desktop', responsive?.desktop, desktop);
  applyBreakpointVars(style, 'tablet', responsive?.tablet, { ...desktop, headingSize: responsive?.desktop?.headingSize, fontSize: responsive?.desktop?.fontSize });
  applyBreakpointVars(style, 'mobile', responsive?.mobile, { ...desktop, paddingTop: 40, paddingBottom: 40, paddingLeft: 0, paddingRight: 0, headingSize: responsive?.tablet?.headingSize || responsive?.desktop?.headingSize, fontSize: responsive?.tablet?.fontSize || responsive?.desktop?.fontSize });

  // Backward-compatible aliases consumed by the CSS layer.
  style['--sec-pt'] = style['--sec-desktop-pt'];
  style['--sec-pb'] = style['--sec-desktop-pb'];
  style['--sec-pl'] = style['--sec-desktop-pl'];
  style['--sec-pr'] = style['--sec-desktop-pr'];
  style['--sec-mt'] = style['--sec-desktop-mt'];
  style['--sec-mb'] = style['--sec-desktop-mb'];
  if (d?.minHeight !== undefined) style.minHeight = d.minHeight;

  return style as React.CSSProperties;
}

export function sectionVisibilityClass(section: LandingPageSection) {
  const desktopVisible = section.responsiveSettings?.desktop?.visible !== false && !section.hideOnDesktop;
  const tabletVisible = section.responsiveSettings?.tablet?.visible !== false;
  const mobileVisible = section.responsiveSettings?.mobile?.visible !== false && !section.hideOnMobile;
  return [desktopVisible ? '' : 'cms-hide-desktop', tabletVisible ? '' : 'cms-hide-tablet', mobileVisible ? '' : 'cms-hide-mobile'].join(' ');
}

export function sectionContainerStyle(section: LandingPageSection): React.CSSProperties {
  const widthMode = section.contentWidthMode || section.layoutSettings?.widthMode;
  if (widthMode === 'full') {
    return { maxWidth: '100%', width: '100%' };
  }
  if (widthMode === 'narrow') {
    return { maxWidth: 860, width: '100%' };
  }
  const customWidth = section.contentContainerWidth || section.layoutSettings?.containerWidth;
  return { maxWidth: customWidth || 1280, width: '100%' };
}

export function sectionGridStyle(section: LandingPageSection): React.CSSProperties {
  const l = section.layoutSettings;
  const r = section.responsiveSettings;
  const style: Record<string, any> = {};
  const forceColumn = l?.direction === 'column';
  style['--cms-grid-desktop'] = String(forceColumn ? 1 : (r?.desktop?.columns ?? l?.columns ?? 3));
  style['--cms-grid-tablet'] = String(forceColumn ? 1 : (r?.tablet?.columns ?? Math.min(l?.columns ?? 3, 2)));
  style['--cms-grid-mobile'] = String(forceColumn ? 1 : (r?.mobile?.columns ?? 1));
  style['--cms-grid-col-gap'] = `${l?.columnGap ?? 24}px`;
  style['--cms-grid-row-gap'] = `${l?.rowGap ?? 24}px`;
  return style as React.CSSProperties;
}

const ratioMap: Record<string, string> = {
  equal: '1fr 1fr', '50-50': '1fr 1fr', '40-60': '2fr 3fr', '60-40': '3fr 2fr',
  '33-67': '1fr 2fr', '67-33': '2fr 1fr', '25-75': '1fr 3fr', '75-25': '3fr 1fr',
  '70-30': '7fr 3fr', '30-70': '3fr 7fr',
};

export function sectionSplitStyle(section: LandingPageSection): React.CSSProperties {
  const l = section.layoutSettings;
  const r = section.responsiveSettings;
  const defaultPos = l?.mediaPosition || section.imagePosition || 'right';
  const orderFor = (pos?: string) => {
    const p = pos || defaultPos;
    return p === 'left' || p === 'top' ? { image: 1, content: 2 } : { image: 2, content: 1 };
  };
  const columnsFor = (pos: string | undefined, requestedColumns: number | undefined, fallbackColumns: number) => {
    if (l?.direction === 'column') return '1fr';
    const p = pos || defaultPos;
    const cols = requestedColumns ?? fallbackColumns;
    if (cols <= 1 || p === 'top' || p === 'bottom' || p === 'center') return '1fr';
    const chosenRatio = (section as any).contentSplitRatio || l?.ratio || '50-50';
    return ratioMap[chosenRatio] || '1fr 1fr';
  };
  const desktop = orderFor(r?.desktop?.imagePosition);
  const tablet = orderFor(r?.tablet?.imagePosition);
  const mobile = orderFor(r?.mobile?.imagePosition);
  const style: Record<string, any> = {
    '--cms-split-desktop': columnsFor(r?.desktop?.imagePosition, r?.desktop?.columns, 2),
    '--cms-split-tablet': columnsFor(r?.tablet?.imagePosition, r?.tablet?.columns, 2),
    '--cms-split-mobile': columnsFor(r?.mobile?.imagePosition, r?.mobile?.columns, 1),
    '--cms-split-gap': `${l?.columnGap ?? 32}px`,
    '--cms-split-row-gap': `${l?.rowGap ?? 24}px`,
    '--cms-vertical-align': l?.verticalAlign === 'top' ? 'start' : l?.verticalAlign === 'bottom' ? 'end' : 'center',
    '--cms-image-order-desktop': String(desktop.image), '--cms-content-order-desktop': String(desktop.content),
    '--cms-image-order-tablet': String(tablet.image), '--cms-content-order-tablet': String(tablet.content),
    '--cms-image-order-mobile': String(mobile.image), '--cms-content-order-mobile': String(mobile.content),
  };
  return style as React.CSSProperties;
}

export function sectionContentAlignmentStyle(section: LandingPageSection): React.CSSProperties {
  const alignment = section.responsiveSettings?.desktop?.alignment || section.layoutSettings?.contentAlign || section.textAlign;
  return alignment ? { textAlign: alignment } : {};
}

const shadowMap: Record<string, string> = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,.08)',
  md: '0 8px 20px rgba(0,0,0,.12)',
  lg: '0 16px 36px rgba(0,0,0,.16)',
  xl: '0 24px 56px rgba(0,0,0,.22)',
};

export function sectionImageWrapperStyle(section: LandingPageSection): React.CSSProperties {
  const w = section.imageWidth || section.layoutSettings?.imageWidth;
  const align = section.imageAlignment || section.layoutSettings?.imageAlignment || 'center';
  const shadow = section.imageShadow || section.layoutSettings?.imageShadow;
  const radius = section.imageBorderRadius ?? section.layoutSettings?.imageBorderRadius;

  const style: React.CSSProperties = {
    width: w ? (typeof w === 'number' ? `${w}px` : String(w)) : '100%',
    maxWidth: '100%',
    margin: align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0 auto 0 0',
  };

  if (shadow && shadowMap[shadow]) {
    style.boxShadow = shadowMap[shadow];
  }
  if (radius !== undefined) {
    style.borderRadius = `${radius}px`;
    style.overflow = 'hidden';
  }
  return style;
}

export function sectionImageStyle(section: LandingPageSection): React.CSSProperties {
  const x = Math.max(0, Math.min(100, section.imageFocalPointX ?? 50));
  const y = Math.max(0, Math.min(100, section.imageFocalPointY ?? 50));
  const h = section.imageHeight || section.layoutSettings?.imageHeight;
  const maxH = section.imageMaxHeight || section.layoutSettings?.imageMaxHeight;
  const ratio = section.imageAspectRatio || section.layoutSettings?.imageAspectRatio;
  const radius = section.imageBorderRadius ?? section.layoutSettings?.imageBorderRadius;

  const style: React.CSSProperties = {
    objectFit: section.imageFit === 'auto' ? 'cover' : (section.imageFit || 'cover'),
    objectPosition: section.imageFocalPoint || `${x}% ${y}%`,
    width: '100%',
  };

  if (h) {
    style.height = typeof h === 'number' ? `${h}px` : String(h);
  }
  if (maxH) {
    style.maxHeight = `${maxH}px`;
  }
  if (ratio && ratio !== 'auto') {
    style.aspectRatio = ratio.replace(':', '/');
  }
  if (radius !== undefined) {
    style.borderRadius = `${radius}px`;
  }

  return style;
}
