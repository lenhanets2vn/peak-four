import type { AiChatbotConfig } from '../types';
import { MASCOT_IDS, mascotId } from './mascotCatalog';

export const MASCOT_VISIT_KEY = 'cms:mascot-visit:v1';
type VisitStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function allowedMascots(config?: AiChatbotConfig): string[] {
  const configured = config?.mascotAllowedIds;
  if (configured === undefined) return [...MASCOT_IDS];
  const valid = [...new Set(configured.filter(id => (MASCOT_IDS as readonly string[]).includes(id)))];
  return valid.length ? valid : [mascotId(config?.mascotId)];
}

export function storeVisitMascot(id: string, storage?: VisitStorage, manual = true): void {
  try { storage?.setItem(MASCOT_VISIT_KEY, JSON.stringify({id, manual})); } catch { /* Private mode can deny storage. */ }
}

export function resolveVisitMascot(config?: AiChatbotConfig, storage?: VisitStorage, random = Math.random): string {
  const fixed = mascotId(config?.mascotId);
  if (config?.launcherVisual !== 'mascot') return fixed;
  const pool = allowedMascots(config);
  let saved: {id?: string; manual?: boolean} | null = null;
  try { saved = JSON.parse(storage?.getItem(MASCOT_VISIT_KEY) || 'null'); } catch { /* Use current visit fallback. */ }
  if (saved?.id && pool.includes(saved.id)) {
    if (saved.manual && config.mascotAllowVisitorChange !== false) return saved.id;
    if (!saved.manual && config.mascotRandomPerVisit) return saved.id;
  }
  const chosen = config.mascotRandomPerVisit
    ? pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))]
    : pool.includes(fixed) ? fixed : pool[0];
  storeVisitMascot(chosen, storage, false);
  return chosen;
}

export function visitorSessionStorage(): Storage | undefined {
  try { return typeof window !== 'undefined' ? window.sessionStorage : undefined; } catch { return undefined; }
}
