export interface ChatTopicFrame {
  id: string;
  productId?: string;
  productName?: string;
  componentId?: string;
  componentName?: string;
  intent?: string;
  subjectId?: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  label: string;
  createdAt: number;
  updatedAt: number;
}

export interface TopicStackResolution {
  action: 'PUSH' | 'UPDATE' | 'BACK' | 'FIRST' | 'ORDINAL' | 'KEEP';
  targetIndex?: number;
}

const norm = (s:string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

export function resolveTopicStackCommand(message:string, stack:ChatTopicFrame[] = []): TopicStackResolution {
  const m = norm(message);
  if (!stack.length) return { action:'KEEP' };
  if (/\b(quay lai|tro lai|noi lai|phan truoc|van de truoc)\b/.test(m)) return { action:'BACK', targetIndex: Math.max(0, stack.length - 2) };
  if (/\b(y dau tien|phan dau tien|van de dau tien|luc dau)\b/.test(m)) return { action:'FIRST', targetIndex:0 };
  const ordinal = m.match(/\b(?:y|phan|truong hop|van de)\s*(?:thu\s*)?(\d+)\b/);
  if (ordinal) {
    const idx = Number(ordinal[1]) - 1;
    if (idx >= 0 && idx < stack.length) return { action:'ORDINAL', targetIndex:idx };
  }
  return { action:'KEEP' };
}

export function upsertTopicFrame(
  stack:ChatTopicFrame[] = [],
  input: Omit<ChatTopicFrame,'id'|'label'|'createdAt'|'updatedAt'> & { label?:string },
  maxDepth = 12,
): ChatTopicFrame[] {
  const now = Date.now();
  const label = input.label || [input.productName, input.componentName, input.intent].filter(Boolean).join(' → ') || 'Ngữ cảnh hội thoại';
  const last = stack[stack.length - 1];
  const same = !!last && last.productId === input.productId && last.componentId === input.componentId && last.intent === input.intent && last.subjectId === input.subjectId;
  if (same) {
    const next = stack.slice();
    next[next.length - 1] = { ...last, ...input, label, updatedAt:now };
    return next;
  }
  const frame:ChatTopicFrame = { ...input, id:`topic_${now}_${Math.random().toString(36).slice(2,7)}`, label, createdAt:now, updatedAt:now };
  return [...stack, frame].slice(-maxDepth);
}

export function getTopicFrame(stack:ChatTopicFrame[] = [], index?:number): ChatTopicFrame | undefined {
  if (!stack.length) return undefined;
  if (index === undefined) return stack[stack.length - 1];
  return stack[index];
}
