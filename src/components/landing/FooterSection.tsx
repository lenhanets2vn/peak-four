import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowUp,
  MessageCircle,
  FileText,
  Settings,
  Sparkles,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { LandingPageConfig, FooterConfig, FooterColumn, FooterButton, CustomContactButton } from '../../types';
import { ContactButtonIcon, executeContactButtonAction } from '../common/ContactButtonIcon';
import { safeNavigationUrl } from '../../utils/urlSafety';
import { samePageCmsSectionTarget, scrollToCmsSection } from '../../utils/actionRuntime';

interface Props {
  config: LandingPageConfig;
  onAdminClick?: () => void;
}

// SVG Icons for Social Networks
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const ZaloIcon = ({ className }: { className?: string }) => (
  <span className={`font-black tracking-tight text-[11px] leading-none ${className}`}>
    Zalo
  </span>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export const FooterSection: React.FC<Props> = ({ config, onAdminClick }) => {
  const effectiveHotline = config.websiteSettings?.header?.hotline || config.hotline || '';
  const footer: FooterConfig = config.footer || {
    enabled: true,
    bgType: 'dark',
    customBgColor: '#0b1329',
    textColor: '#e5e7eb',
    headingColor: '#ffffff',
    mutedTextColor: '#9ca3af',
    columns: [],
    socialLinks: {},
    actionButtons: [],
    copyrightText: config.footerText,
    disclaimerText: config.footerDisclaimer,
  };

  if (footer.enabled === false) return null;

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToForm = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToCmsSection('lead-form-section');
  };

  // Button Action Handler
  const handleButtonClick = (btn: FooterButton, e: React.MouseEvent) => {
    switch (btn.action) {
      case 'call': {
        const phone = btn.targetUrl || effectiveHotline || '';
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        if (cleanPhone) window.location.href = `tel:${cleanPhone}`;
        break;
      }
      case 'zalo': {
        const zaloUrl = btn.targetUrl || footer.socialLinks?.zalo || '';
        if (zaloUrl) { const safeUrl=safeNavigationUrl(zaloUrl,false); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer'); }
        break;
      }
      case 'form':
        scrollToForm(e);
        break;
      case 'scroll_top':
        scrollToTop(e);
        break;
      case 'link':
        if (btn.targetUrl) {
          if (btn.openInNewTab) {
            const safeUrl=safeNavigationUrl(btn.targetUrl,true); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
          } else {
            const safeUrl=safeNavigationUrl(btn.targetUrl,true); if(safeUrl) window.location.href = safeUrl;
          }
        }
        break;
      default:
        break;
    }
  };

  // Resolve Background styling
  const getBgStyle = () => {
    const isImageMode = footer.bgMode === 'image' && footer.bgImageUrl;
    if (isImageMode) {
      return {
        backgroundImage: `url(${footer.bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (footer.bgType === 'custom' && footer.customBgColor) {
      return { backgroundColor: footer.customBgColor };
    }
    if (footer.customBgColor) {
      return { backgroundColor: footer.customBgColor };
    }
    return {};
  };

  const getBgClasses = () => {
    if (footer.bgType === 'brand-blue') return 'bg-[#003870] text-white';
    if (footer.bgType === 'light') return 'bg-neutral-100 text-neutral-900 border-t border-neutral-200';
    if (footer.bgType === 'white') return 'bg-white text-neutral-900 border-t border-neutral-200';
    if (footer.bgType === 'black') return 'bg-black text-neutral-300';
    return 'bg-[#0b1329] text-neutral-300';
  };

  const isLight = footer.bgType === 'light' || footer.bgType === 'white';
  const overlayOpacity = typeof footer.overlayOpacity === 'number' ? footer.overlayOpacity / 100 : 0.4;
  const sortedColumns = [...(footer.columns || [])]
    .filter((c) => c.enabled !== false)
    .sort((a, b) => a.order - b.order);

  const sortedCustomButtons: CustomContactButton[] = (
    footer.customContactButtons || config.customContactButtons || []
  )
    .filter((b) => b.enabled !== false && b.showInFooter !== false)
    .sort((a, b) => a.order - b.order);

  const sortedLegacyButtons = [...(footer.actionButtons || [])]
    .filter((b) => b.enabled !== false)
    .sort((a, b) => a.order - b.order);

  // Logo source: footer logo -> header logo -> brand logo
  const logoUrl = footer.footerLogoUrl || config.footerLogoUrl || config.brandLogoUrl;
  const logoLink = safeNavigationUrl(footer.footerLogoLink,true);
  const footerLogoHeight = footer.footerLogoHeight || config.footerLogoHeight || 44;

  const renderButtonIcon = (iconName: string) => {
    switch (iconName) {
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'message':
        return <MessageCircle className="w-4 h-4" />;
      case 'mail':
        return <Mail className="w-4 h-4" />;
      case 'form':
        return <FileText className="w-4 h-4" />;
      case 'arrow-up':
        return <ArrowUp className="w-4 h-4" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <footer
      id="site-footer"
      className={`relative pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden ${footer.visualStyle==='heritage'?'cms-footer-heritage':''} ${getBgClasses()}`}
      style={{
        ...getBgStyle(),
        fontFamily: footer.fontFamily ? `"${footer.fontFamily}", sans-serif` : undefined,
        '--footer-text-color': footer.textColor || '#e5e7eb',
        '--footer-heading-color': footer.headingColor || '#ffffff',
        '--footer-muted-color': footer.mutedTextColor || '#9ca3af',
        '--footer-heading-family': footer.headingFontFamily ? `"${footer.headingFontFamily}", sans-serif` : (footer.fontFamily ? `"${footer.fontFamily}", sans-serif` : 'inherit'),
      } as unknown as React.CSSProperties}
    >
      {/* Background Overlay if image or custom color */}
      {footer.bgMode === 'image' && footer.bgImageUrl && (
        <div
          className="absolute inset-0 pointer-events-none -z-0"
          style={{
            backgroundColor: footer.overlayColor || '#000000',
            opacity: overlayOpacity,
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* 1. Dynamic Quick Action & Contact Buttons Bar
            Có thể bật/tắt hoàn toàn từ CMS. Mặc định TẮT để Footer chỉ giữ
            phần nội dung và các icon nhỏ bên trong cột thương hiệu. */}
        {footer.showTopContactBar === true && (sortedCustomButtons.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pb-8 border-b border-white/10">
            {sortedCustomButtons.map((btn) => {
              const bg = btn.bgColor || (isLight ? '#0054a6' : '#1e293b');
              const text = btn.textColor || '#ffffff';
              return (
                <button
                  key={btn.id}
                  onClick={(e) => executeContactButtonAction(btn, e)}
                  style={{ backgroundColor: bg, color: text }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer"
                  title={btn.name}
                >
                  <ContactButtonIcon button={btn} className="w-4 h-4" />
                  <span>{btn.name}</span>
                </button>
              );
            })}
          </div>
        ) : sortedLegacyButtons.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3 pb-8 border-b border-white/10">
            {sortedLegacyButtons.map((btn) => {
              const bg = btn.bgColor || (isLight ? '#0054a6' : '#1e293b');
              const text = btn.textColor || '#ffffff';
              return (
                <button
                  key={btn.id}
                  onClick={(e) => handleButtonClick(btn, e)}
                  style={{ backgroundColor: bg, color: text }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {renderButtonIcon(btn.icon)}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        ) : null)}

        {/* 2. Main Columns Grid */}
        {sortedColumns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {sortedColumns.map((col) => (
              <div key={col.id} className="space-y-4">
                {/* Column Type 1: Brand Info */}
                {col.type === 'brand' && (
                  <>
                    <div className="flex items-center gap-3">
                      {col.showLogo !== false && (
                        logoUrl ? (
                          <a href={logoLink||undefined} className="inline-flex" aria-label={logoLink?`Đến ${config.brandName}`:undefined}><img
                            src={logoUrl || undefined}
                            alt={config.brandName}
                            referrerPolicy="no-referrer"
                            style={{ height: `${footerLogoHeight}px` }}
                            className="max-w-[200px] object-contain rounded-md"
                          /></a>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#0054a6] text-white flex items-center justify-center font-black shadow-md border border-blue-400/30">
                            <ShieldCheck className="w-6 h-6 text-amber-300" />
                          </div>
                        )
                      )}
                      <div>
                        <h4 className="font-black text-sm sm:text-base tracking-tight" style={{ color: 'var(--footer-heading-color)' }}>
                          {col.title || config.brandName}
                        </h4>
                        <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--footer-muted-color)' }}>
                          {config.brandLogoText || 'BẢO HIỂM BẢO VIỆT'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--footer-text-color)' }}>
                      {col.content || footer.footerDescription}
                    </p>

                    {/* Social links row */}
                    {col.showSocials !== false && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--footer-muted-color)' }}>
                          Kết Nối Với Chúng Tôi:
                        </span>
                        {/* If dynamic custom contact buttons exist, render them */}
                        {sortedCustomButtons.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {sortedCustomButtons.map((btn) => (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={(e) => executeContactButtonAction(btn, e)}
                                style={{ backgroundColor: btn.bgColor || '#1e293b', color: btn.textColor || '#ffffff' }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
                                title={btn.name}
                              >
                                <ContactButtonIcon button={btn} className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        ) : footer.socialLinks ? (
                          <div className="flex items-center gap-2">
                            {footer.socialLinks.facebook && (
                              <a
                                href={safeNavigationUrl(footer.socialLinks.facebook,true)||undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#1877F2] text-white flex items-center justify-center transition-colors shadow-xs"
                                title="Facebook Bảo Việt"
                              >
                                <FacebookIcon className="w-4 h-4" />
                              </a>
                            )}
                            {footer.socialLinks.youtube && (
                              <a
                                href={safeNavigationUrl(footer.socialLinks.youtube,true)||undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#FF0000] text-white flex items-center justify-center transition-colors shadow-xs"
                                title="YouTube Bảo Việt"
                              >
                                <YoutubeIcon className="w-4 h-4" />
                              </a>
                            )}
                            {footer.socialLinks.tiktok && (
                              <a
                                href={safeNavigationUrl(footer.socialLinks.tiktok,true)||undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-black text-white flex items-center justify-center transition-colors shadow-xs"
                                title="TikTok Bảo Việt"
                              >
                                <TikTokIcon className="w-4 h-4" />
                              </a>
                            )}
                            {footer.socialLinks.zalo && (
                              <a
                                href={safeNavigationUrl(footer.socialLinks.zalo,true)||undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#0068FF] text-white flex items-center justify-center transition-colors shadow-xs font-bold"
                                title="Zalo Official Bảo Việt"
                              >
                                <ZaloIcon />
                              </a>
                            )}
                            {footer.socialLinks.linkedin && (
                              <a
                                href={safeNavigationUrl(footer.socialLinks.linkedin,true)||undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#0A66C2] text-white flex items-center justify-center transition-colors shadow-xs"
                                title="LinkedIn Bảo Việt"
                              >
                                <LinkedInIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}

                {/* Column Type 2: Links List */}
                {col.type === 'links' && (
                  <>
                    <h4 className="font-bold text-sm sm:text-base tracking-tight border-b border-white/10 pb-2" style={{ color: 'var(--footer-heading-color)', fontFamily: 'var(--footer-heading-family)' }}>
                      {col.title}
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm">
                      {(col.links || []).map((link) => (
                        <li key={link.id}>
                          <a
                            href={safeNavigationUrl(link.url,true)||undefined}
                            target={link.openInNewTab ? '_blank' : '_self'}
                            rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                            onClick={e=>{if(link.openInNewTab)return;const target=samePageCmsSectionTarget(link.url);if(target){e.preventDefault();scrollToCmsSection(target);}}}
                            className="hover:text-white transition-colors flex items-center gap-1.5 group" style={{ color: 'var(--footer-text-color)' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                            <span>{link.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Column Type 3: Contact Info */}
                {col.type === 'contact' && (
                  <>
                    <h4 className="font-bold text-sm sm:text-base tracking-tight border-b border-white/10 pb-2" style={{ color: 'var(--footer-heading-color)', fontFamily: 'var(--footer-heading-family)' }}>
                      {col.title}
                    </h4>
                    <div className="space-y-3 text-xs sm:text-sm" style={{ color: 'var(--footer-text-color)' }}>
                      {(col.contactAddress || footer.address) && (
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{col.contactAddress || footer.address}</span>
                        </div>
                      )}

                      {(col.contactHotline || footer.hotline || effectiveHotline) && (
                        <div className="flex items-start gap-2.5">
                          <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--footer-muted-color)' }}>
                              Hotline 24/7 (Bấm để gọi):
                            </span>
                            <a
                              href={`tel:${(col.contactHotline || footer.hotline || effectiveHotline || '').replace(/[^0-9+]/g, '')}`}
                              className="font-bold text-sm hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5" style={{ color: 'var(--footer-heading-color)' }}
                            >
                              <span>{col.contactHotline || footer.hotline || effectiveHotline}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                Miễn Cước
                              </span>
                            </a>
                          </div>
                        </div>
                      )}

                      {(col.contactEmail || footer.email) && (
                        <div className="flex items-start gap-2.5">
                          <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <a
                            href={`mailto:${col.contactEmail || footer.email}`}
                            className="hover:text-white transition-colors"
                          >
                            {col.contactEmail || footer.email}
                          </a>
                        </div>
                      )}

                      {(col.contactHours || footer.workingHours) && (
                        <div className="flex items-start gap-2.5">
                          <Clock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                          <span>{col.contactHours || footer.workingHours}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Column Type 4: Social Links & Compliance Badges */}
                {col.type === 'social' && (
                  <>
                    <h4 className="font-bold text-sm sm:text-base tracking-tight border-b border-white/10 pb-2" style={{ color: 'var(--footer-heading-color)', fontFamily: 'var(--footer-heading-family)' }}>
                      {col.title}
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--footer-muted-color)' }}>
                      {col.content || 'Theo dõi và kết nối với chúng tôi qua các nền tảng mạng xã hội chính thức.'}
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                        <div className="text-[11px] leading-tight text-neutral-300">
                          <strong className="block" style={{ color: 'var(--footer-heading-color)' }}>Đã Đăng Ký Bộ Công Thương</strong>
                          Chứng nhận website thương mại điện tử bảo hiểm uy tín
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Column Type 5: Custom Content */}
                {col.type === 'custom' && (
                  <>
                    <h4 className="font-bold text-sm sm:text-base tracking-tight border-b border-white/10 pb-2" style={{ color: 'var(--footer-heading-color)', fontFamily: 'var(--footer-heading-family)' }}>
                      {col.title}
                    </h4>
                    <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--footer-text-color)' }}>
                      {col.content}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback simple row if no columns */
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold text-sm">
                <span className="w-5 h-5 rounded bg-blue-700 text-white flex items-center justify-center text-xs">
                  {config.brandLogoText?.[0] || 'B'}
                </span>
                <span>{config.brandName}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--footer-text-color)' }}>{footer.footerDescription || config.footerText}</p>
            </div>
          </div>
        )}

        {/* 3. Trust Seals & Admin Button */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--footer-muted-color)' }}>

          <div className="flex items-center gap-3">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-xs hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10" style={{ color: 'var(--footer-muted-color)' }}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Lên Đầu Trang</span>
            </button>
          </div>
        </div>

        {/* 4. Copyright & Compliance Disclaimer */}
        <div className="pt-4 border-t border-white/5 space-y-3 text-center">
          <p className="text-xs font-normal" style={{ color: 'var(--footer-muted-color)' }}>
            {footer.copyrightText || config.footerText}
          </p>

          {(footer.disclaimerText || config.footerDisclaimer) && (
            <p className="max-w-4xl mx-auto text-[11px] leading-relaxed font-light" style={{ color: 'var(--footer-muted-color)' }}>
              {footer.disclaimerText || config.footerDisclaimer}
            </p>
          )}
        </div>
      </div>

      {/* 5. Floating Call & Zalo Action Widget */}
      {footer.showFloatingContactBar !== false && (
        <aside aria-label="Kênh liên hệ nhanh" className="fixed bottom-20 sm:bottom-8 right-4 sm:right-6 z-40 flex flex-col gap-3">
          {/* Zalo Button */}
          {footer.socialLinks?.zalo && (
            <a
              href={safeNavigationUrl(footer.socialLinks.zalo,true)||undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all cursor-pointer group"
              title="Chat Zalo với chuyên viên Bảo Việt"
            >
              <span className="font-black text-xs">Zalo</span>
            </a>
          )}

          {/* Hotline Call Button with pulsating waves */}
          {(footer.hotline || effectiveHotline) && (
            <a
              href={`tel:${(footer.hotline || effectiveHotline || '').replace(/[^0-9+]/g, '')}`}
              className="relative w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-emerald-500/50 hover:shadow-xl transition-all cursor-pointer group"
              title={`Bấm để gọi Hotline: ${footer.hotline || effectiveHotline}`}
            >
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 pointer-events-none" />
              <PhoneCall className="w-5 h-5 relative z-10 animate-bounce" />
            </a>
          )}
        </aside>
      )}
    </footer>
  );
};
