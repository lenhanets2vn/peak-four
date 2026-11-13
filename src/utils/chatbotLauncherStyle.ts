import type { AiChatbotConfig } from '../types';

const safeNumber = (value: number | undefined, fallback: number) => Number.isFinite(value) ? Number(value) : fallback;

export function chatbotSideMargin(config?: AiChatbotConfig): number {
  return Math.max(40, Math.min(160, safeNumber(config?.floatingMarginSide, 40)));
}

export function chatbotMascotSize(config?: AiChatbotConfig): number {
  return Math.max(40, Math.min(180, safeNumber(config?.mascotSize, 54)));
}

export function chatbotBadgeTextShadow(config?: AiChatbotConfig): string {
  const requested = config?.floatingBadgeTextShadowColor || '#005baa';
  const color = /^#[0-9a-f]{6}$/i.test(requested) ? requested : '#005baa';
  return `0 1px 2px ${color}, 0 2px 7px ${color}`;
}
