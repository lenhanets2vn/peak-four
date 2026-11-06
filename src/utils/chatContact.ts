import type { LandingPageConfig } from '../types';

/** CMS-owned contact number; never accept a number supplied by the chat request. */
export function resolveChatSupportPhone(config?: Partial<LandingPageConfig> | null): string {
  return String(config?.aiChatbot?.supportPhone || config?.footer?.hotline || config?.hotline || '').trim();
}
