import React from 'react';
import {
  Phone,
  PhoneCall,
  Mail,
  MapPin,
  Globe,
  Share2,
  FileText,
  ShieldCheck,
  Star,
  ArrowUp,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { CustomContactButton } from '../../types';
import { safeNavigationUrl } from '../../utils/urlSafety';
import { scrollToCmsSection } from '../../utils/actionRuntime';

// Crisp SVG Vector Icons for Brand Platforms
export const BrandFacebookSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const BrandYoutubeSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const BrandTikTokSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

export const BrandZaloSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <span className={`font-black tracking-tighter text-[11px] leading-none inline-flex items-center justify-center font-sans ${className}`}>
    Zalo
  </span>
);

export const BrandMessengerSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.082.3 2.235.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.963z" />
  </svg>
);

export const BrandWhatsAppSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.954 1.18-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.101-.201.05-.377-.025-.527-.075-.15-.678-1.634-.929-2.238-.244-.588-.493-.509-.678-.518-.175-.009-.376-.011-.577-.011-.201 0-.527.075-.803.376s-1.054 1.03-1.054 2.512c0 1.482 1.079 2.912 1.23 3.113.15.201 2.124 3.243 5.144 4.548 3.02 1.305 3.02.87 3.572.815.552-.055 1.78-.728 2.031-1.431.251-.703.251-1.305.176-1.43-.076-.126-.277-.201-.578-.352zM12.04 21.796c-1.782 0-3.528-.48-5.06-1.388l-.363-.215-3.76.986 1.003-3.664-.236-.375a9.852 9.852 0 0 1-1.512-5.26c0-5.46 4.442-9.902 9.902-9.902 2.646 0 5.133 1.03 7.004 2.901a9.857 9.857 0 0 1 2.898 7.004c0 5.462-4.442 9.907-9.876 9.907z" />
  </svg>
);

export const BrandTelegramSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.43 7.21l-2.03 9.58c-.15.68-.56.84-1.13.53l-3.13-2.31-1.51 1.45c-.17.17-.31.31-.63.31l.22-3.19 5.81-5.25c.25-.22-.06-.35-.39-.13l-7.18 4.52-3.1-.97c-.67-.21-.69-.67.14-.99l12.14-4.68c.56-.21 1.06.13.76.86z" />
  </svg>
);

export const BrandGoogleMapsSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <MapPin className={className} />
);

interface ContactIconProps {
  button: CustomContactButton;
  className?: string;
}

export const ContactButtonIcon: React.FC<ContactIconProps> = ({ button, className = 'w-4 h-4' }) => {
  // If user uploaded a custom icon/logo image
  if ((button.iconType === 'custom_upload' || (button as any).iconType === 'custom') && button.customIconUrl) {
    return (
      <img
        src={button.customIconUrl || undefined}
        alt={button.name}
        referrerPolicy="no-referrer"
        className={`${className} object-contain rounded-xs`}
      />
    );
  }

  // Preset icon selection
  const iconKey = button.presetIcon || button.platform;

  switch (iconKey) {
    case 'hotline':
    case 'phone':
      return <PhoneCall className={className} />;
    case 'zalo':
      return <BrandZaloSvg className={className} />;
    case 'messenger':
      return <BrandMessengerSvg className={className} />;
    case 'facebook':
      return <BrandFacebookSvg className={className} />;
    case 'youtube':
      return <BrandYoutubeSvg className={className} />;
    case 'tiktok':
      return <BrandTikTokSvg className={className} />;
    case 'whatsapp':
      return <BrandWhatsAppSvg className={className} />;
    case 'telegram':
      return <BrandTelegramSvg className={className} />;
    case 'maps':
      return <BrandGoogleMapsSvg className={className} />;
    case 'email':
    case 'mail':
      return <Mail className={className} />;
    case 'form':
      return <FileText className={className} />;
    case 'shield':
      return <ShieldCheck className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'arrow-up':
      return <ArrowUp className={className} />;
    case 'globe':
      return <Globe className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
};

// Helper to compute click action and trigger real click-to-call or navigation
export const executeContactButtonAction = (
  btn: CustomContactButton,
  e?: React.MouseEvent
) => {
  if (e) {
    e.stopPropagation();
  }

  switch (btn.actionType) {
    case 'call': {
      const cleanPhone = (btn.value || '').replace(/[^0-9+]/g, '');
      if (cleanPhone) window.location.href = `tel:${cleanPhone}`;
      break;
    }
    case 'zalo': {
      let url = btn.value || '';
      if (!url) break;
      if (!url.startsWith('http') && !url.startsWith('https')) {
        const cleanDigits = url.replace(/[^0-9+]/g, '');
        url = `https://zalo.me/${cleanDigits}`;
      }
      { const safeUrl=safeNavigationUrl(url,false); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer'); }
      break;
    }
    case 'messenger': {
      let url = btn.value || '';
      if (!url) break;
      if (!url.startsWith('http') && !url.startsWith('https')) {
        url = `https://m.me/${url.replace(/^@/, '')}`;
      }
      { const safeUrl=safeNavigationUrl(url,false); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer'); }
      break;
    }
    case 'whatsapp': {
      let url = btn.value || '';
      if (!url) break;
      if (!url.startsWith('http') && !url.startsWith('https')) {
        url = `https://wa.me/${url.replace(/[^0-9]/g, '')}`;
      }
      { const safeUrl=safeNavigationUrl(url,false); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer'); }
      break;
    }
    case 'maps': {
      let url = btn.value || '';
      if (!url) break;
      if (!url.startsWith('http') && !url.startsWith('https')) {
        url = `https://maps.google.com/?q=${encodeURIComponent(url)}`;
      }
      { const safeUrl=safeNavigationUrl(url,false); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer'); }
      break;
    }
    case 'email': {
      const email = btn.value?.replace('mailto:', '') || '';
      if (email) window.location.href = `mailto:${email}`;
      break;
    }
    case 'form':
    case 'scroll_form': {
      if (!scrollToCmsSection('lead-form-section')) scrollToCmsSection('lead-form-container');
      break;
    }
    case 'url':
    default: {
      if (btn.value) {
        if (btn.openInNewTab !== false) {
          const safeUrl=safeNavigationUrl(btn.value,true); if(safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
        } else {
          const safeUrl=safeNavigationUrl(btn.value,true); if(safeUrl) window.location.href = safeUrl;
        }
      }
      break;
    }
  }
};
