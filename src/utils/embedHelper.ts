/**
 * Utilities for parsing and rendering embedded videos (YouTube, MP4),
 * external website iframes, and file download links.
 */

export function parseYouTubeId(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  if (!str) return null;

  // Match 11-char YouTube ID from standard formats
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = str.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  // Check if string itself is just an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  return null;
}

export function getYouTubeEmbedUrl(
  urlOrId?: string | null,
  options: { autoplay?: boolean; mute?: boolean; loop?: boolean } = {}
): string | null {
  const id = parseYouTubeId(urlOrId);
  if (!id) return null;

  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  if (options.autoplay) {
    params.set('autoplay', '1');
    // Browsers require mute for autoplay
    params.set('mute', '1');
  } else if (options.mute) {
    params.set('mute', '1');
  }

  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', id);
  }

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function getYouTubeThumbnail(videoId: string, quality: 'maxres' | 'hq' | 'mq' = 'hq'): string {
  if (quality === 'maxres') {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function isVideoFile(url?: string | null): boolean {
  if (!url) return false;
  const clean = String(url).toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v')
  );
}

export function cleanEmbedUrl(url?: string | null): string {
  if (!url) return '';
  let str = String(url).trim();
  if (!str) return '';
  if (!/^https?:\/\//i.test(str)) {
    str = 'https://' + str;
  }
  try {
    const parsed = new URL(str);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {}
  return '';
}

export function getDomainName(url?: string | null): string {
  if (!url) return '';
  try {
    const clean = cleanEmbedUrl(url);
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export interface FileTypeInfo {
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  iconType: 'pdf' | 'word' | 'excel' | 'archive' | 'generic';
}

export function getFileTypeInfo(urlOrName?: string | null, explicitType?: string | null): FileTypeInfo {
  const raw = String(explicitType || urlOrName || '').toLowerCase();

  if (raw.includes('.pdf') || raw === 'pdf') {
    return {
      label: 'PDF Document',
      color: '#dc2626',
      badgeBg: 'bg-red-50 border-red-200 text-red-700',
      badgeText: 'PDF',
      iconType: 'pdf',
    };
  }
  if (raw.includes('.doc') || raw.includes('.docx') || raw === 'docx' || raw === 'word') {
    return {
      label: 'Word Document',
      color: '#2563eb',
      badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
      badgeText: 'DOCX',
      iconType: 'word',
    };
  }
  if (raw.includes('.xls') || raw.includes('.xlsx') || raw.includes('.csv') || raw === 'xlsx' || raw === 'excel') {
    return {
      label: 'Bảng tính Excel',
      color: '#16a34a',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      badgeText: 'XLSX',
      iconType: 'excel',
    };
  }
  if (raw.includes('.zip') || raw.includes('.rar') || raw.includes('.7z') || raw.includes('.tar') || raw === 'zip') {
    return {
      label: 'Tập tin nén',
      color: '#ea580c',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
      badgeText: 'ZIP',
      iconType: 'archive',
    };
  }

  const guessedLabel = explicitType?.toUpperCase() || (raw.split('.').pop() || 'FILE').toUpperCase();
  return {
    label: `${guessedLabel} File`,
    color: '#0054a6',
    badgeBg: 'bg-blue-50 border-blue-200 text-[#0054a6]',
    badgeText: guessedLabel.slice(0, 5),
    iconType: 'generic',
  };
}
