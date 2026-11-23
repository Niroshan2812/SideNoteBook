import React, { useEffect, useRef, useState } from 'react';
import {
  Note,
  StickyTheme,
  StickyUIState,
  StickyWindowGeometry,
} from '@/types';
import { STICKY_THEMES } from './themeConfig';
import { StickyHeader } from './StickyHeader';
import { NoteEditor } from './NoteEditor';
import { useDraggableWindow } from '@/hooks/useDraggableWindow';

interface StickyWindowProps {
  notes: Note[];
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
}

const OPACITY_STEPS = [0.98, 0.85, 0.68];

export function StickyWindow({
  notes,
  activeNote,
  uiState,
  onUpdateGeometry,
  onUpdateUIState,
  onCreateNote,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
}: StickyWindowProps) {
  const palette = STICKY_THEMES[activeNote.theme] || STICKY_THEMES.yellow;
  const [titleDraft, setTitleDraft] = useState(activeNote.title);
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
        opacity={uiState.opacity}
        isDragging={isDragging}
        onStartDrag={startDrag}
        onPointerMove={onPointerMove}
        onEndDrag={endInteraction}
        onCreateNote={onCreateNote}
        onSelectNote={onSelectNote}
        onDeleteNote={onDeleteNote}
        onChangeTheme={(theme: StickyTheme) =>
          onUpdateNote(activeNote.id, { theme })
        }
        onToggleCollapse={() =>
          onUpdateUIState({ isCollapsed: !uiState.isCollapsed })
        }
        onTogglePin={() => onUpdateUIState({ isPinned: !uiState.isPinned })}
        onCycleOpacity={handleCycleOpacity}
        onClose={() => onUpdateUIState({ isVisible: false })}
      />

      {/* Note Body (Hidden when Window-Shaded / Collapsed) */}
      {!uiState.isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Editable Note Title */}
          <div
            style={{ borderBottom: `1px solid ${palette.divider}` }}
            className="px-3 pt-2 pb-1"
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
              className="w-full text-sm font-bold focus:outline-none placeholder:opacity-50"
            />
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
