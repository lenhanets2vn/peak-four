import React, { useState, useEffect } from 'react';
import { LandingPageConfig, CustomContactButton } from '../../types';
import { ContactButtonIcon, executeContactButtonAction } from '../common/ContactButtonIcon';
import { SmartActionButton } from '../common/SmartActionButton';

interface Props {
  config?: LandingPageConfig;
  ctaText?: string;
  badgeText?: string;
}

export const MobileStickyCTA: React.FC<Props> = ({
  config,
  ctaText = '',
  badgeText = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const formEl = document.getElementById('lead-form-container') || document.getElementById('lead-form-section');
      if (formEl) {
        const rect = formEl.getBoundingClientRect();
        // Hide if form is currently prominently in view
        const formInView = rect.top < window.innerHeight && rect.bottom > 80;
        setVisible(window.scrollY > 200 && !formInView);
      } else {
        setVisible(window.scrollY > 200);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;


  // Find mobile buttons
  const customButtons: CustomContactButton[] =
    config?.footer?.customContactButtons || config?.customContactButtons || [];
  const mobileButtons = customButtons
    .filter((b) => b.enabled !== false && b.showMobileBar)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      id="mobile-sticky-cta"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-2.5 sm:p-3 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-2xl transition-all"
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Dynamic Mobile Contact Buttons (e.g. Call / Zalo) */}
        {mobileButtons.length > 0 ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {mobileButtons.slice(0, 2).map((btn) => {
              const isCall = btn.actionType === 'call' || btn.platform === 'hotline';
              const bg = btn.bgColor || (isCall ? '#0054a6' : '#0068ff');
              const text = btn.textColor || '#ffffff';
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={(e) => executeContactButtonAction(btn, e)}
                  style={{ backgroundColor: bg, color: text }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                  title={btn.name}
                  aria-label={btn.name}
                >
                  <ContactButtonIcon button={btn} className="w-5 h-5" />
                </button>
              );
            })}
          </div>
) : null}

        {/* Lead CTA uses the same CMS Button/Action configuration as Hero. */}
        <div className="flex-1 min-w-0">
          <SmartActionButton
            slot="heroPrimary"
            cta={config?.heroPrimaryCta}
            fallbackText={ctaText}
            fallbackAction={{ type:'scroll', target:'lead-form-section', eventName:'mobile_sticky_cta_click' }}
            className="w-full text-xs"
          />
        </div>
      </div>
    </div>
  );
};

