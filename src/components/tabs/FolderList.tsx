import React, { useState } from 'react';
import { Note, TabFolder, TabGroupColor } from '@/types';
import { tabFolderService } from '@/services/tabFolderService';
import { ThemePalette } from '@/components/sticky/themeConfig';

const COLOR_HEX: Record<TabGroupColor, string> = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  green: '#22C55E',
  purple: '#A855F7',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
  red: '#EF4444',
  grey: '#6B7280',
};

interface FolderListProps {
  folders: TabFolder[];
  notes: Note[];
  palette?: ThemePalette;
  onDeleteFolder: (folderId: string) => void;
  onOpenLinkedNote: (noteId: string) => void;
}

export function FolderList({
  folders,
  notes,
  palette,
  onDeleteFolder,
  onOpenLinkedNote,
}: FolderListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSticky = Boolean(palette);

  const flash = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(null), 2000);
  };

  if (folders.length === 0) {
    return (
      <div
        style={
          isSticky && palette ? { color: palette.textMuted } : undefined
        }
        className={`text-center py-6 px-3 text-xs space-y-1 ${
          isSticky ? '' : 'text-slate-400'
        }`}
      >
        <div className="text-lg">📁</div>
        <div className="font-semibold">No saved tab folders yet</div>
        <div className="text-[11px] opacity-80">
          Save your currently open research tabs into a named folder so you can
          reopen them anytime on later days.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {statusMessage && (
        <div className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium">
          ✓ {statusMessage}
        </div>
      )}

      {folders.map((folder) => {
        const isExpanded = expandedId === folder.id;
        const linkedNote = folder.linkedNoteId
          ? notes.find((n) => n.id === folder.linkedNoteId)
          : undefined;

        return (
          <div
            key={folder.id}
            style={
              isSticky && palette
                ? {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }
                : undefined
            }
            className={`rounded-md border p-2.5 space-y-2 ${
              isSticky
                ? ''
                : 'bg-slate-800/60 border-slate-700/80 text-slate-100'
            }`}
          >
            {/* Folder Header */}
            <div className="flex items-start justify-between gap-2">
              <div
                onClick={() =>
                  setExpandedId(isExpanded ? null : folder.id)
                }
                className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer"
              >
                <span
                  style={{ backgroundColor: COLOR_HEX[folder.color] || '#3B82F6' }}
                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate">
                    {folder.name}
                  </div>
                  <div className="text-[10.5px] opacity-70 flex items-center gap-1.5 flex-wrap">
                    <span>
                      {folder.tabs.length} tab
                      {folder.tabs.length === 1 ? '' : 's'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </span>
                    {folder.chromeBookmarkFolderId && (
                      <span title="Synced to Chrome Bookmarks Bar">★ Bookmarked</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteFolder(folder.id)}
                className="px-1.5 py-0.5 rounded text-[11px] opacity-60 hover:opacity-100 hover:bg-red-500/20 text-red-400"
                title="Delete folder from SideNoteBook"
              >
                ✕
              </button>
            </div>

            {/* Linked Note Pill */}
            {linkedNote && (
              <button
                type="button"
                onClick={() => onOpenLinkedNote(linkedNote.id)}
                style={
                  isSticky && palette
                    ? {
                        backgroundColor: palette.buttonHover,
                        color: palette.textSecondary,
                      }
                    : undefined
                }
                className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                  isSticky
                    ? ''
                    : 'bg-slate-900/70 text-amber-300 hover:bg-slate-900'
                }`}
                title="Click to open linked sticky note"
              >
                <span className="truncate">📝 Linked: {linkedNote.title}</span>
                <span className="text-[10px] opacity-75 shrink-0 ml-1">
                  Open ↗
                </span>
              </button>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  await tabFolderService.restoreTabFolder(folder.id, 'tabGroup');
                  flash(`Opened "${folder.name}" as Chrome Tab Group`);
                }}
                className="flex-1 py-1 px-2 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition text-center"
                title="Reopen all tabs grouped under a colored Chrome Tab Group"
              >
                Open Tab Group
              </button>

              <button
                type="button"
                onClick={async () => {
                  await tabFolderService.restoreTabFolder(folder.id, 'newWindow');
                  flash(`Opened "${folder.name}" in new window`);
                }}
                style={
                  isSticky && palette
                    ? {
                        backgroundColor: palette.buttonHover,
                        color: palette.textPrimary,
                      }
                    : undefined
                }
                className={`py-1 px-2 rounded text-[11px] font-medium transition ${
                  isSticky
                    ? 'hover:opacity-80'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                }`}
                title="Open all tabs in a dedicated new window"
              >
                New Win
              </button>

              <button
                type="button"
                onClick={async () => {
                  const added = await tabFolderService.addActiveTabToFolder(
                    folder.id
                  );
                  flash(
                    added
                      ? `Added current tab to "${folder.name}"`
                      : 'Current tab already in folder'
                  );
                }}
                style={
                  isSticky && palette
                    ? {
                        backgroundColor: palette.buttonHover,
                        color: palette.textPrimary,
                      }
                    : undefined
                }
                className={`py-1 px-2 rounded text-[11px] font-medium transition ${
                  isSticky
                    ? 'hover:opacity-80'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                }`}
                title="Add current active browser tab to this folder"
              >
                + Tab
              </button>

              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : folder.id)}
                style={
                  isSticky && palette
                    ? {
                        backgroundColor: palette.buttonHover,
                        color: palette.textPrimary,
                      }
                    : undefined
                }
                className={`py-1 px-2 rounded text-[11px] font-medium transition ${
                  isSticky
                    ? 'hover:opacity-80'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                }`}
              >
                {isExpanded ? 'Hide' : 'Tabs ▾'}
              </button>
            </div>

            {/* Expandable Individual Tab List */}
            {isExpanded && (
              <div
                style={
                  isSticky && palette
                    ? { borderTop: `1px solid ${palette.divider}` }
                    : undefined
                }
                className={`pt-1.5 space-y-1 max-h-36 overflow-y-auto ${
                  isSticky ? '' : 'border-t border-slate-700/80'
                }`}
              >
                {folder.tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="flex items-center justify-between gap-1.5 px-1.5 py-1 rounded hover:bg-black/10 text-[11px]"
                  >
                    <button
                      type="button"
                      onClick={() => tabFolderService.openSingleTab(tab.url)}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                      title={tab.url}
                    >
                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded-sm shrink-0"
                        />
                      ) : (
                        <span className="text-[10px] shrink-0">🌐</span>
                      )}
                      <span className="truncate hover:underline">
                        {tab.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        tabFolderService.removeTabFromFolder(folder.id, tab.id)
                      }
                      className="px-1 opacity-55 hover:opacity-100 text-[10px]"
                      title="Remove tab from folder"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
