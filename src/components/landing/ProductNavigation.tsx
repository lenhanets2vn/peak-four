import React, { useEffect, useMemo, useState } from 'react';
import { LandingPageConfig, NavigationItem } from '../../types';
import { runCmsAction } from '../../utils/actionRuntime';

const shadowMap: Record<string, string> = {
  none: 'none',
  sm: '0 2px 8px rgba(15,23,42,.08)',
  md: '0 5px 18px rgba(15,23,42,.12)',
  lg: '0 10px 30px rgba(15,23,42,.16)',
};

const NavButton: React.FC<{
  item: NavigationItem;
  active: boolean;
  settings: any;
  motionUx: boolean;
  onClick: () => void;
}> = ({ item, active, settings, motionUx, onClick }) => {
  const [hover, setHover] = useState(false);
  const color = active
    ? item.activeColor || settings.activeColor || settings.textColor || '#0054a6'
    : hover
      ? item.hoverColor || settings.hoverColor || item.normalColor || settings.textColor || '#334155'
      : item.normalColor || settings.textColor || '#334155';
  const background = active
    ? item.activeBackground || settings.activeBackground || item.background || 'transparent'
    : hover
      ? settings.hoverBackground || item.background || 'transparent'
      : item.background || 'transparent';
  const radius = item.borderRadius ?? settings.itemBorderRadius ?? 10;
  const indicator = settings.activeIndicator || 'underline';
  const indicatorColor = item.activeColor || settings.activeIndicatorColor || settings.activeColor || '#0054a6';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={active ? 'page' : undefined}
      data-category-nav-id={item.id}
      className={`relative shrink-0 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${motionUx?'cms-motion-nav-button':''}`}
      style={{
        color,
        background,
        borderRadius: radius,
        padding: `${settings.itemPaddingY ?? 9}px ${settings.itemPaddingX ?? 14}px`,
        fontFamily: settings.fontFamily || 'var(--cms-button-family, var(--cms-body-family, inherit))',
        fontSize: `${settings.fontSize ?? 14}px`,
        fontWeight: item.fontWeight || settings.fontWeight || 700,
        letterSpacing: `${settings.letterSpacing ?? 0}px`,
        textTransform: settings.textTransform || 'none',
        minHeight: Math.max(36, (settings.height || 56) - 12),
      }}
    >
      {item.icon && <span className="mr-1.5" aria-hidden>{item.icon}</span>}
      {item.label}
      {active && indicator === 'underline' && (
        <span
          aria-hidden
          className="absolute left-3 right-3 bottom-1"
          style={{
            height: settings.activeIndicatorHeight ?? 3,
            background: indicatorColor,
            borderRadius: settings.activeIndicatorRadius ?? 999,
          }}
        />
      )}
      {active && indicator === 'bottom-border' && (
        <span aria-hidden className="absolute left-0 right-0 bottom-0" style={{ height: settings.activeIndicatorHeight ?? 3, background: indicatorColor }} />
      )}
      {active && indicator === 'top-border' && (
        <span aria-hidden className="absolute left-0 right-0 top-0" style={{ height: settings.activeIndicatorHeight ?? 3, background: indicatorColor }} />
      )}
      {active && indicator === 'pill' && (
        <span aria-hidden className="absolute inset-0 -z-0" style={{ border: `${settings.activeIndicatorHeight ?? 2}px solid ${indicatorColor}`, borderRadius: settings.activeIndicatorRadius ?? radius }} />
      )}
    </button>
  );
};

export const ProductNavigation: React.FC<{ config: LandingPageConfig }> = ({ config }) => {
  const nav = config.websiteSettings?.navigation as any;
  const visualTheme = config.websiteSettings?.visualTheme;
  const motionUx = visualTheme?.uxEnabled !== false && visualTheme?.categoryBarMotion !== false;
  const [activeId, setActiveId] = useState('nav_home');
  const [motionHidden, setMotionHidden] = useState(false);
  const [barScrolled, setBarScrolled] = useState(false);
  const items = useMemo(
    () => [...(nav?.items || [])].filter((i: NavigationItem) => i.enabled !== false).sort((a: NavigationItem, b: NavigationItem) => a.order - b.order),
    [nav?.items]
  );



  useEffect(() => {
    if (!motionUx) { setBarScrolled(false); return; }
    const onScroll = () => setBarScrolled((window.scrollY || 0) > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [motionUx]);

  useEffect(() => {
    if (!motionUx || !activeId) return;
    const el = document.querySelector(`[data-category-nav-id="${CSS.escape(activeId)}"]`) as HTMLElement | null;
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId, motionUx]);
  useEffect(() => {
    if (!motionUx || !visualTheme?.categoryBarAutoHide) { setMotionHidden(false); return; }
    let lastY = window.scrollY || 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY || 0;
      const delta = y - lastY;
      if (y < 120) setMotionHidden(false);
      else if (delta > 8) setMotionHidden(true);
      else if (delta < -8) setMotionHidden(false);
      lastY = y;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [motionUx, visualTheme?.categoryBarAutoHide]);
  useEffect(() => {
    if (!nav?.scrollSpy) return;
    const targets = items
      .map((i: NavigationItem) => i.action.type === 'scroll' ? i.action.target?.replace(/^#/, '') : '')
      .filter(Boolean) as string[];
    if (!targets.length || typeof IntersectionObserver === 'undefined') return;
    const byTarget = new Map<string, string>();
    items.forEach((item: NavigationItem) => {
      if (item.action.type === 'scroll' && item.action.target) {
        const id = item.action.target.replace(/^#/, '');
        byTarget.set(id, item.id);
      }
    });
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      setActiveId(byTarget.get(visible.target.id) || byTarget.get(visible.target.id.replace(/^section-/, '')) || '');
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, .25, .5] });
    targets.forEach(id => {
      const el = document.getElementById(id) || document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [nav?.scrollSpy, JSON.stringify(items.map((i: NavigationItem) => [i.id, i.action.type, i.action.target, i.enabled]))]);

  if (nav?.enabled === false || !items.length) return null;

  const bg = nav.background || '#fff';
  const mobileBg = nav.mobileBackground || bg;
  const borderWidth = nav.borderWidth ?? 1;
  const alignClass = nav.align === 'left' ? 'justify-start' : nav.align === 'right' ? 'justify-end' : nav.align === 'space-between' ? 'justify-between' : 'justify-center';
  const width = Math.max(640, Number(nav.containerWidth || 1280));

  return (
    <nav
      className={`${nav.sticky !== false ? 'sticky top-[var(--cms-header-height,0px)]' : 'relative'} z-30 w-full ${motionUx?'cms-motion-category-bar':''} ${motionHidden?'cms-motion-category-hidden':''} ${barScrolled?'cms-motion-category-scrolled':''}`}
      aria-label="Category Bar / Primary Menu / Main Navigation"
      style={{
        background: bg,
        color: nav.textColor || '#334155',
        minHeight: nav.height || 56,
        borderTop: `${borderWidth}px solid ${nav.borderColor || '#dbe7f3'}`,
        borderBottom: `${borderWidth}px solid ${nav.borderColor || '#dbe7f3'}`,
        borderRadius: nav.borderRadius ?? 0,
        boxShadow: shadowMap[nav.shadow || 'sm'],
        backdropFilter: nav.backdropBlur ? 'blur(10px)' : undefined,
      }}
    >
      <div
        className={`mx-auto flex items-center ${alignClass} ${nav.mobileHorizontalScroll !== false ? 'overflow-x-auto whitespace-nowrap cms-no-scrollbar' : 'flex-wrap'}`}
        style={{
          maxWidth: width,
          minHeight: nav.height || 56,
          gap: nav.itemGap ?? 4,
          padding: '4px 16px',
        }}
      >
        {items.map((item: NavigationItem) => {
          const targetId = item.action.target?.replace(/^#/, '') || '';
          const active = activeId === item.id;
          return (
            <NavButton
              key={item.id}
              item={item}
              active={active}
              settings={nav}
              motionUx={motionUx}
              onClick={() => {
                setActiveId(item.id);
                runCmsAction(item.action, { sectionId: targetId, smoothScroll: nav.smoothScroll !== false });
              }}
            />
          );
        })}
      </div>
      <style>{`@media (max-width: 767px){[aria-label="Category Bar / Primary Menu / Main Navigation"]{min-height:${nav.mobileHeight || 52}px!important;background:${mobileBg}!important;color:${nav.mobileTextColor || nav.textColor || '#334155'}!important}[aria-label="Category Bar / Primary Menu / Main Navigation"]>div{min-height:${nav.mobileHeight || 52}px!important}[aria-label="Category Bar / Primary Menu / Main Navigation"] button{font-size:${nav.mobileFontSize || nav.fontSize || 13}px!important}}`}</style>
    </nav>
  );
};
