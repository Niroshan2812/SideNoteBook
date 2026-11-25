import { Note, SavedTab, StickyTheme, TabFolder, TabGroupColor } from '@/types';

const ALLOWED_THEMES = new Set<StickyTheme>([
  'yellow',
  'blue',
  'green',
  'pink',
  'purple',
  'dark',
]);

const ALLOWED_GROUP_COLORS = new Set<TabGroupColor>([
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
]);

/**
 * Allows only http:// and https:// URLs for clickable Markdown links.
 * Blocks javascript:, data:, vbscript:, and file: injection in rendered notes.
 */
export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Allows http://, https://, and file:// (local PDFs) for browser tab restoration.
 * Blocks javascript:, data:, chrome://, and other dangerous schemes.
 */
export function isSafeTabUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'file:'
    );
  } catch {
    return false;
  }
}

export function sanitizeImportedNotes(rawNotes: unknown): Note[] {
  if (!Array.isArray(rawNotes)) return [];
  const now = Date.now();
  const valid: Note[] = [];

  for (const item of rawNotes) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || !record.id.trim()) continue;

    const theme = ALLOWED_THEMES.has(record.theme as StickyTheme)
      ? (record.theme as StickyTheme)
      : 'yellow';

    const sourceUrl =
      typeof record.sourceUrl === 'string' && isSafeHttpUrl(record.sourceUrl)
        ? record.sourceUrl
        : undefined;

    valid.push({
      id: record.id.slice(0, 128),
      title:
        typeof record.title === 'string'
          ? record.title.slice(0, 300)
          : 'Untitled Note',
      content:
        typeof record.content === 'string' ? record.content : '',
      theme,
      linkedFolderId:
        typeof record.linkedFolderId === 'string'
          ? record.linkedFolderId.slice(0, 128)
          : undefined,
      sourceUrl,
      sourceTitle:
        typeof record.sourceTitle === 'string'
          ? record.sourceTitle.slice(0, 300)
          : undefined,
      createdAt:
        typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
          ? record.createdAt
          : now,
      updatedAt:
        typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
          ? record.updatedAt
          : now,
    });
  }

  return valid;
}

export function sanitizeImportedFolders(rawFolders: unknown): TabFolder[] {
  if (!Array.isArray(rawFolders)) return [];
  const now = Date.now();
  const valid: TabFolder[] = [];

  for (const item of rawFolders) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || !record.id.trim()) continue;

    const color = ALLOWED_GROUP_COLORS.has(record.color as TabGroupColor)
      ? (record.color as TabGroupColor)
      : 'blue';

    const rawTabs = Array.isArray(record.tabs) ? record.tabs : [];
    const safeTabs: SavedTab[] = [];
    for (const t of rawTabs) {
      if (!t || typeof t !== 'object') continue;
      const tabRec = t as Record<string, unknown>;
      if (typeof tabRec.url !== 'string' || !isSafeTabUrl(tabRec.url)) {
        continue;
      }
      safeTabs.push({
        id:
          typeof tabRec.id === 'string' && tabRec.id.trim()
            ? tabRec.id.slice(0, 128)
            : `tab-${now}-${safeTabs.length}`,
        title:
          typeof tabRec.title === 'string'
            ? tabRec.title.slice(0, 300)
            : tabRec.url,
        url: tabRec.url,
        favIconUrl:
          typeof tabRec.favIconUrl === 'string' &&
          isSafeHttpUrl(tabRec.favIconUrl)
            ? tabRec.favIconUrl
            : undefined,
      });
    }

    valid.push({
      id: record.id.slice(0, 128),
      name:
        typeof record.name === 'string' && record.name.trim()
          ? record.name.slice(0, 200)
          : 'Imported Folder',
      color,
      tabs: safeTabs,
      linkedNoteId:
        typeof record.linkedNoteId === 'string'
          ? record.linkedNoteId.slice(0, 128)
          : undefined,
      chromeBookmarkFolderId:
        typeof record.chromeBookmarkFolderId === 'string'
          ? record.chromeBookmarkFolderId.slice(0, 64)
          : undefined,
      createdAt:
        typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
          ? record.createdAt
          : now,
      updatedAt:
        typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
          ? record.updatedAt
          : now,
    });
  }

  return valid;
}
