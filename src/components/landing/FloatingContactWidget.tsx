import React, { useState } from 'react';
import { PhoneCall, X, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { CustomContactButton, LandingPageConfig } from '../../types';
import { ContactButtonIcon, executeContactButtonAction } from '../common/ContactButtonIcon';

interface Props {
  config: LandingPageConfig;
}

export const FloatingContactWidget: React.FC<Props> = ({ config }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const effectiveHotline = config.websiteSettings?.header?.hotline || config.hotline || '1900 55 88 99';

  // Retrieve dynamic buttons from config
  const customButtons: CustomContactButton[] =
    config.footer?.customContactButtons || config.customContactButtons || [];

  // Filter only enabled buttons marked for floating display
  const floatingButtons = customButtons
    .filter((b) => b.enabled !== false && b.showFloating !== false)
    .sort((a, b) => a.order - b.order);

  // CMS is the source of truth: no hard-coded contact buttons are created when none are configured.
  const activeButtons: CustomContactButton[] = floatingButtons;

  if (activeButtons.length === 0) return null;

  return (
    <aside
      id="floating-contact-widget"
      aria-label="Liên hệ nhanh"
      className="fixed bottom-20 md:bottom-8 right-3.5 sm:right-6 z-[50] flex flex-col items-end gap-2.5 pointer-events-auto"
    >
      {/* Toggle button to collapse or expand list */}
      {activeButtons.length > 2 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-neutral-600 shadow-md border border-neutral-200 flex items-center justify-center text-[10px] cursor-pointer transition-all hover:scale-110"
          title={isExpanded ? 'Thu gọn nút liên hệ' : 'Mở rộng nút liên hệ'}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Buttons List */}
      {isExpanded && (
        <div className="flex flex-col items-end gap-2.5 transition-all">
          {activeButtons.map((btn) => {
            const isCall = btn.actionType === 'call' || btn.platform === 'hotline';
            const bg = btn.bgColor || (isCall ? '#0054a6' : '#0068ff');
            const text = btn.textColor || '#ffffff';

            return (
              <div key={btn.id} className="relative group flex items-center gap-2">
                {/* Tooltip on Desktop hover */}
                <span className="hidden md:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-900/90 text-white shadow-lg whitespace-nowrap">
                  {btn.name}
                  {isCall && ' (Bấm để gọi)'}
                </span>

                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={(e) => executeContactButtonAction(btn, e)}
                  style={{ backgroundColor: bg, color: text }}
                  className={`cms-ui-social-action relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer active:scale-95 ${
                    isCall ? 'ring-4 ring-blue-400/30' : ''
                  }`}
                  aria-label={btn.name}
                >
                  {/* Glowing Radar Pulse for Hotline */}
                  {isCall && (
                    <>
                      <span
                        className="absolute inset-0 rounded-full animate-ping opacity-35 -z-10"
                        style={{ backgroundColor: bg }}
                      />
                      <span
                        className="absolute -inset-1 rounded-full animate-pulse opacity-25 -z-10"
                        style={{ backgroundColor: bg }}
                      />
                    </>
                  )}

                  <ContactButtonIcon button={btn} className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
