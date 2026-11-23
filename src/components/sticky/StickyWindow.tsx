import React, { useEffect, useRef, useState } from 'react';
import {
  Note,
  StickyTheme,
  StickyUIState,
  StickyWindowGeometry,
  TabFolder,
} from '@/types';
import { STICKY_THEMES } from './themeConfig';
import { StickyHeader } from './StickyHeader';
import { NoteEditor } from './NoteEditor';
import { SaveTabsModal } from '@/components/tabs/SaveTabsModal';
import { FolderList } from '@/components/tabs/FolderList';
import { useDraggableWindow } from '@/hooks/useDraggableWindow';

interface StickyWindowProps {
  notes: Note[];
  tabFolders: TabFolder[];
  activeNote: Note;
  uiState: StickyUIState;
  onUpdateGeometry: (geometry: StickyWindowGeometry) => void;
  onUpdateUIState: (patch: Partial<StickyUIState>) => void;
  onCreateNote: () => void;
  onSelectNote: (noteId: string) => void;
  onUpdateNote: (
    noteId: string,
    patch: Partial<Omit<Note, 'id' | 'createdAt'>>
  ) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

const OPACITY_STEPS = [0.98, 0.85, 0.68];

export function StickyWindow({
  notes,
  tabFolders,
  activeNote,
  uiState,
  onUpdateGeometry,
  onUpdateUIState,
  onCreateNote,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteFolder,
}: StickyWindowProps) {
  const palette = STICKY_THEMES[activeNote.theme] || STICKY_THEMES.yellow;
  const [titleDraft, setTitleDraft] = useState(activeNote.title);
  const [tabDrawerMode, setTabDrawerMode] = useState<'none' | 'save' | 'list'>(
    'none'
  );
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const activeIdRef = useRef(activeNote.id);

  useEffect(() => {
    if (activeIdRef.current !== activeNote.id) {
      activeIdRef.current = activeNote.id;
      setTitleDraft(activeNote.title);
    }
  }, [activeNote.id, activeNote.title]);

  useEffect(() => {
    return () => {
      if (titleSaveTimerRef.current) {
        window.clearTimeout(titleSaveTimerRef.current);
      }
    };
  }, []);

  const handleTitleChange = (nextTitle: string) => {
    setTitleDraft(nextTitle);
    if (titleSaveTimerRef.current) {
      window.clearTimeout(titleSaveTimerRef.current);
    }
    const targetId = activeNote.id;
    titleSaveTimerRef.current = window.setTimeout(() => {
      onUpdateNote(targetId, { title: nextTitle });
      titleSaveTimerRef.current = null;
    }, 180);
  };

  const {
    liveGeo,
    isDragging,
    isResizing,
    startDrag,
    startResize,
    onPointerMove,
    endInteraction,
  } = useDraggableWindow({
    geometry: uiState.geometry,
    isPinned: uiState.isPinned,
    isCollapsed: uiState.isCollapsed,
    onGeometryCommit: onUpdateGeometry,
  });

  const handleCycleOpacity = () => {
    const currentIndex = OPACITY_STEPS.findIndex(
      (step) => Math.abs(step - uiState.opacity) < 0.05
    );
    const nextOpacity =
      OPACITY_STEPS[(currentIndex + 1) % OPACITY_STEPS.length];
    onUpdateUIState({ opacity: nextOpacity });
  };

  const linkedFolder = activeNote.linkedFolderId
    ? tabFolders.find((f) => f.id === activeNote.linkedFolderId)
    : undefined;

  const wordCount = activeNote.content.trim()
    ? activeNote.content.trim().split(/\s+/).length
    : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate3d(${liveGeo.x}px, ${liveGeo.y}px, 0)`,
        width: `${liveGeo.width}px`,
        height: uiState.isCollapsed ? 'auto' : `${liveGeo.height}px`,
        zIndex: 2147483647,
        opacity: uiState.opacity,
        backgroundColor: palette.bodyBg,
        borderColor: palette.border,
        color: palette.textPrimary,
        boxShadow:
          isDragging || isResizing
            ? '0 22px 45px -10px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0,0,0,0.2)'
            : '0 12px 28px -6px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0,0,0,0.14)',
        fontFamily:
          '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
      }}
      className="flex flex-col rounded-md border overflow-hidden transition-shadow duration-150"
    >
      {/* Windows 7 Sticky Note Header Bar */}
      <StickyHeader
        notes={notes}
        activeNote={activeNote}
        palette={palette}
        isCollapsed={uiState.isCollapsed}
        isPinned={uiState.isPinned}
        isTabDrawerOpen={tabDrawerMode !== 'none'}
        tabFolderCount={tabFolders.length}
        opacity={uiState.opacity}
        isDragging={isDragging}
        onStartDrag={startDrag}
        onPointerMove={onPointerMove}
        onEndDrag={endInteraction}
        onCreateNote={() => {
          setTabDrawerMode('none');
          onCreateNote();
        }}
        onSelectNote={(noteId) => {
          setTabDrawerMode('none');
          onSelectNote(noteId);
        }}
        onDeleteNote={onDeleteNote}
        onChangeTheme={(theme: StickyTheme) =>
          onUpdateNote(activeNote.id, { theme })
        }
        onToggleCollapse={() =>
          onUpdateUIState({ isCollapsed: !uiState.isCollapsed })
        }
        onTogglePin={() => onUpdateUIState({ isPinned: !uiState.isPinned })}
        onToggleTabDrawer={() => {
          if (uiState.isCollapsed) {
            onUpdateUIState({ isCollapsed: false });
          }
          setTabDrawerMode((prev) => (prev === 'none' ? 'list' : 'none'));
        }}
        onCycleOpacity={handleCycleOpacity}
        onClose={() => onUpdateUIState({ isVisible: false })}
      />

      {/* Note Body or In-Sticky Tab Folder Drawer */}
      {!uiState.isCollapsed && tabDrawerMode === 'save' && (
        <SaveTabsModal
          activeNoteId={activeNote.id}
          activeNoteTitle={activeNote.title}
          palette={palette}
          onSaved={(savedName) => {
            setDrawerNotice(`Saved folder "${savedName}"!`);
            setTabDrawerMode('list');
            window.setTimeout(() => setDrawerNotice(null), 2500);
          }}
          onCancel={() => setTabDrawerMode('list')}
        />
      )}

      {!uiState.isCollapsed && tabDrawerMode === 'list' && (
        <div className="flex-1 flex flex-col min-h-0 p-2.5 gap-2 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setTabDrawerMode('save')}
              className="flex-1 py-1.5 px-2.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
            >
              + Save Open Tabs to Folder
            </button>
            <button
              type="button"
              onClick={() => setTabDrawerMode('none')}
              style={{
                backgroundColor: palette.buttonHover,
                color: palette.textPrimary,
              }}
              className="py-1.5 px-2.5 rounded text-xs font-semibold"
            >
              Back to Note
            </button>
          </div>

          {drawerNotice && (
            <div
              style={{
                backgroundColor: palette.headerBg,
                borderColor: palette.border,
              }}
              className="px-2.5 py-1 rounded border text-[11px] font-semibold"
            >
              ✓ {drawerNotice}
            </div>
          )}

          <FolderList
            folders={tabFolders}
            notes={notes}
            palette={palette}
            onDeleteFolder={onDeleteFolder}
            onOpenLinkedNote={(noteId) => {
              onSelectNote(noteId);
              setTabDrawerMode('none');
            }}
          />
        </div>
      )}

      {!uiState.isCollapsed && tabDrawerMode === 'none' && (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Editable Note Title + Linked Folder Indicator */}
          <div
            style={{ borderBottom: `1px solid ${palette.divider}` }}
            className="px-3 pt-2 pb-1 flex items-center justify-between gap-2"
          >
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => onUpdateNote(activeNote.id, { title: titleDraft })}
              placeholder="Note title..."
              style={{
                color: palette.textPrimary,
                backgroundColor: 'transparent',
              }}
              className="flex-1 min-w-0 text-sm font-bold focus:outline-none placeholder:opacity-50"
            />
            {linkedFolder && (
              <button
                type="button"
                onClick={() => setTabDrawerMode('list')}
                style={{
                  backgroundColor: palette.buttonHover,
                  color: palette.textSecondary,
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 max-w-[110px] truncate"
                title={`Linked Tab Folder: ${linkedFolder.name} (${linkedFolder.tabs.length} tabs)`}
              >
                📁 {linkedFolder.name}
              </button>
            )}
          </div>

          {/* Phase 3: Research Note Editor + Context Capture */}
          <NoteEditor
            note={activeNote}
            palette={palette}
            onSaveContent={(noteId, content) =>
              onUpdateNote(noteId, { content })
            }
          />

          {/* Bottom Status Bar + Corner Resize Grip */}
          <div
            style={{
              borderTop: `1px solid ${palette.divider}`,
              color: palette.textMuted,
            }}
            className="px-3 py-1 text-[10px] flex items-center justify-between select-none"
          >
            <span>
              {uiState.isPinned
                ? `📌 Locked • ${wordCount} words`
                : `${wordCount} words • ${Math.round(liveGeo.width)}×${Math.round(liveGeo.height)}`}
            </span>
            <span className="pr-3">Alt+N to toggle</span>
          </div>

          {/* Right Edge Resize Handle */}
          {!uiState.isPinned && (
            <div
              onPointerDown={(e) => startResize(e, 'e')}
              onPointerMove={onPointerMove}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
              style={{ cursor: 'ew-resize' }}
              className="absolute top-0 right-0 w-1.5 h-full"
            />
          )}

          {/* Bottom Edge Resize Handle */}
          {!uiState.isPinned && (
            <div
              onPointerDown={(e) => startResize(e, 's')}
              onPointerMove={onPointerMove}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
              style={{ cursor: 'ns-resize' }}
              className="absolute bottom-0 left-0 h-1.5 w-full"
            />
          )}

          {/* Bottom-Right Corner Resize Grip (Classic Win7 Diagonal Grip Lines) */}
          {!uiState.isPinned && (
            <div
              onPointerDown={(e) => startResize(e, 'se')}
              onPointerMove={onPointerMove}
              onPointerUp={endInteraction}
              onPointerCancel={endInteraction}
              style={{ cursor: 'nwse-resize', color: palette.textMuted }}
              className="absolute bottom-0 right-0 w-4 h-4 flex items-end justify-end p-0.5 opacity-70 hover:opacity-100"
              title="Drag to resize sticky note"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M9 1L1 9M9 5L5 9M9 8.5L8.5 9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
