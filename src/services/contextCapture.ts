export interface CapturedPageContext {
  title: string;
  url: string;
  selection: string;
  isYouTube: boolean;
  youtubeTimeSeconds?: number;
  youtubeFormattedTime?: string;
  timestampedUrl?: string;
}

export function formatSeconds(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

function buildYouTubeTimestampUrl(rawUrl: string, seconds: number): string {
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.hostname.includes('youtube.com') &&
      parsed.pathname === '/watch'
    ) {
      parsed.searchParams.set('t', `${Math.floor(seconds)}s`);
      return parsed.toString();
    }
    if (parsed.hostname === 'youtu.be') {
      parsed.searchParams.set('t', `${Math.floor(seconds)}`);
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function getYouTubeVideoElement(): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;
  const video = document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
  if (video) return video;
  return document.querySelector('video') as HTMLVideoElement | null;
}

export function seekCurrentYouTubeVideo(seconds: number): boolean {
  const video = getYouTubeVideoElement();
  if (!video || Number.isNaN(seconds)) return false;
  video.currentTime = Math.max(0, seconds);
  return true;
}

export function parseYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.replace('/', '') || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseTimestampSecondsFromUrl(rawUrl: string): number | null {
  try {
    const parsed = new URL(rawUrl);
    const t = parsed.searchParams.get('t');
    if (!t) return null;

    if (/^\d+s?$/.test(t)) {
      return parseInt(t.replace('s', ''), 10);
    }

    const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return null;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    return h * 3600 + m * 60 + s;
  } catch {
    return null;
  }
}

export function capturePageContext(): CapturedPageContext {
  const rawTitle = (typeof document !== 'undefined' ? document.title : '') || 'Untitled Page';
  const cleanTitle = rawTitle
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*-\s*YouTube$/, '')
    .trim();

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const selection =
    typeof window !== 'undefined'
      ? (window.getSelection()?.toString() || '').trim()
      : '';

  const isYouTube =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('youtube.com') ||
      window.location.hostname === 'youtu.be');

  if (isYouTube) {
    const video = getYouTubeVideoElement();
    if (video && Number.isFinite(video.currentTime)) {
      const sec = Math.floor(video.currentTime);
      return {
        title: cleanTitle || rawTitle,
        url,
        selection,
        isYouTube: true,
        youtubeTimeSeconds: sec,
        youtubeFormattedTime: formatSeconds(sec),
        timestampedUrl: buildYouTubeTimestampUrl(url, sec),
      };
    }
  }

  return {
    title: cleanTitle || rawTitle,
    url,
    selection,
    isYouTube,
  };
}

export function formatCitationSnippet(ctx: CapturedPageContext): string {
  const safeTitle = ctx.title.replace(/\[|\]/g, '');
  if (ctx.isYouTube && ctx.youtubeFormattedTime && ctx.timestampedUrl) {
    return `- [▶ ${ctx.youtubeFormattedTime} — ${safeTitle}](${ctx.timestampedUrl})`;
  }
  return `- [${safeTitle}](${ctx.url})`;
}

export function formatQuoteSnippet(
  quoteText: string,
  title: string,
  url: string
): string {
  const cleanQuote = quoteText
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
  const safeTitle = (title || 'Source').replace(/\[|\]/g, '');
  return `${cleanQuote}\n> — [${safeTitle}](${url})`;
}
