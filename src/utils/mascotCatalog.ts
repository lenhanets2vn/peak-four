// Served sprite pairs bundled from page-mascot (MIT).
import type { AiChatbotConfig } from '../types';
import type { CSSProperties } from 'react';
export const MASCOT_IDS = ["afro", "astronaut", "bald", "ballerina", "bear", "beard", "builder", "bunny", "cap", "cat", "chef", "clockwork", "crt", "cube", "deer", "dino", "drone", "fox", "fox-ink", "fox-paper", "fox-pixel", "fox-riso", "fox-sketch", "frog", "gearbot", "glasses", "grandpa", "granny", "hamster", "hedgehog", "hijabi", "kamran", "knight", "koala", "lantern", "mouse", "nurse", "otter", "owl", "panda", "penguin", "pirate", "postbot", "pug", "raccoon", "radio", "redpanda", "rocket", "scientist", "scout", "sheep", "sikh", "skater", "sloth", "tiger", "toaster", "tv", "wizard"] as const;

export const DEFAULT_MASCOT_ID = 'fox';
const mascotSet: ReadonlySet<string> = new Set(MASCOT_IDS);
export function mascotId(value?: string): string { return value && mascotSet.has(value) ? value : DEFAULT_MASCOT_ID; }
export function mascotSheets(value?: string) { const id = mascotId(value); return { directions: `/mascots/${id}-directions.webp`, reactions: `/mascots/${id}-reactions.webp` }; }
export function mascotLabel(id: string) { return id.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }

export function mascotBubbleStyle(config?: AiChatbotConfig): CSSProperties {
  const requestedOpacity = Number(config?.mascotBubbleOpacity ?? 0);
  const opacity = Number.isFinite(requestedOpacity) ? Math.max(0, Math.min(100, requestedOpacity)) : 0;
  const hex = /^#[0-9a-f]{6}$/i.test(config?.mascotBubbleColor || '') ? config!.mascotBubbleColor! : '#ffffff';
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, ${opacity / 100})`,
    borderColor: opacity === 0 ? 'transparent' : `rgba(255, 255, 255, ${opacity / 100})`,
    boxShadow: opacity === 0 ? 'none' : undefined,
  };
}
