import React, { useState } from 'react';
import { Note, StickyTheme } from '@/types';
import { STICKY_THEMES, ThemePalette } from './themeConfig';

interface StickyHeaderProps {
  notes: Note[];
  activeNote: Note;
  palette: ThemePalette;
  isCollapsed: boolean;
  isPinned: boolean;
  isTabDrawerOpen: boolean;
  tabFolderCount: number;
  opacity: number;
  isDragging: boolean;
  onStartDrag: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onEndDrag: (e: React.PointerEvent<HTMLElement>) => void;
  onCreateNote: () => void;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onChangeTheme: (theme: StickyTheme) => void;
  onToggleCollapse: () => void;
  onTogglePin: () => void;
  onToggleTabDrawer: () => void;
  onCycleOpacity: () => void;
  onClose: () => void;
}

export function StickyHeader({
  notes,
  activeNote,
  palette,
  isCollapsed,
  isPinned,
  isTabDrawerOpen,
  tabFolderCount,
  opacity,
  isDragging,
  onStartDrag,
  onPointerMove,
  onEndDrag,
  onCreateNote,
  onSelectNote,
  onDeleteNote,
  onChangeTheme,
  onToggleCollapse,
  onTogglePin,
  onToggleTabDrawer,
  onCycleOpacity,
  onClose,
}: StickyHeaderProps) {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showNoteList, setShowNoteList] = useState(false);

  const activeIndex = notes.findIndex((n) => n.id === activeNote.id);

  return (
    <div
      onPointerDown={onStartDrag}
      onPointerMove={onPointerMove}
      onPointerUp={onEndDrag}
      onPointerCancel={onEndDrag}
      onDoubleClick={onToggleCollapse}
      style={{
        backgroundColor: palette.headerBg,
        borderBottom: isCollapsed ? 'none' : `1px solid ${palette.border}`,
        color: palette.textPrimary,
        cursor: isPinned ? 'default' : isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      className="relative flex items-center justify-between px-2.5 py-1.5 text-xs select-none"
      title={
        isPinned
          ? 'Note position is pinned (unlock to drag)'
          : 'Drag to move anywhere • Double-click to collapse/expand'
      }
    >
      {/* Left Controls: Classic Win7 '+' New Note & Note Switcher */}
      <div className="flex items-center gap-1 min-w-0" data-no-drag="true">
        <button
          type="button"
          onClick={onCreateNote}
          style={{ color: palette.textPrimary }}
          className="w-6 h-6 flex items-center justify-center rounded font-bold text-base leading-none transition hover:bg-black/10"
          title="New Sticky Note"
        >
          +
        </button>

        {/* Note Switcher Pill */}
        <button
          type="button"
          onClick={() => {
            setShowNoteList((v) => !v);
            setShowThemePicker(false);
          }}
          style={{
            color: palette.textSecondary,
            backgroundColor: palette.inputBg,
          }}
          className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 max-w-[145px] truncate hover:opacity-90"
          title="Switch between sticky notes"
        >
          <span className="font-semibold">
            {activeIndex + 1}/{notes.length}
          </span>
          <span className="truncate">{activeNote.title || 'Untitled'}</span>
          <span className="text-[9px] opacity-75">▾</span>
        </button>
      </div>

      {/* Center Drag Grip Indicator */}
      <div className="flex-1 flex justify-center pointer-events-none px-2">
        <div
          style={{ backgroundColor: palette.textMuted }}
          className="w-7 h-1 rounded-full opacity-35"
        />
      </div>

      {/* Right Controls: Tab Folders, Theme, Opacity, Pin, Window-Shade Collapse, Close */}
      <div className="flex items-center gap-0.5" data-no-drag="true">
        {/* Save / Browse Tab Folders Button */}
        <button
          type="button"
          onClick={() => {
            onToggleTabDrawer();
            setShowThemePicker(false);
            setShowNoteList(false);
          }}
          style={{
            color: palette.textPrimary,
            backgroundColor: isTabDrawerOpen
              ? palette.buttonHover
              : 'transparent',
          }}
          className="px-1.5 h-6 flex items-center justify-center gap-0.5 rounded text-[11px] font-semibold transition hover:bg-black/10"
          title="Save open tabs into a named folder or reopen saved folders"
        >
          <span>📁</span>
          {tabFolderCount > 0 && (
            <span className="text-[10px] opacity-80">{tabFolderCount}</span>
          )}
        </button>

        {/* Color Theme Button */}
        <button
          type="button"
          onClick={() => {
            setShowThemePicker((v) => !v);
            setShowNoteList(false);
          }}
          className="w-6 h-6 flex items-center justify-center rounded transition hover:bg-black/10"
          title="Change sticky note color"
        >
          <span
            style={{
              backgroundColor: palette.swatch,
              border: `1.5px solid ${palette.textSecondary}`,
            }}
            className="w-3.5 h-3.5 rounded-full inline-block"
          />
        </button>

        {/* Opacity Button */}
        <button
          type="button"
          onClick={onCycleOpacity}
          style={{ color: palette.textSecondary }}
          className="px-1.5 h-6 flex items-center justify-center rounded text-[10px] font-semibold transition hover:bg-black/10"
          title={`Transparency: ${Math.round(opacity * 100)}% (click to cycle)`}
        >
          {Math.round(opacity * 100)}%
        </button>

        {/* Pin / Lock Position Button */}
        <button
          type="button"
          onClick={onTogglePin}
          style={{
            color: isPinned ? palette.textPrimary : palette.textMuted,
            backgroundColor: isPinned ? palette.buttonHover : 'transparent',
          }}
          className="w-6 h-6 flex items-center justify-center rounded text-xs transition hover:bg-black/10"
          title={
            isPinned
              ? 'Pinned: Position locked (click to unlock)'
              : 'Pin note position on screen'
          }
        >
          {isPinned ? '📌' : '📍'}
        </button>

        {/* Window Shade Collapse / Expand */}
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{ color: palette.textPrimary }}
          className="w-6 h-6 flex items-center justify-center rounded font-bold text-xs transition hover:bg-black/10"
          title={isCollapsed ? 'Expand sticky note' : 'Collapse (Window Shade)'}
        >
          {isCollapsed ? '▢' : '—'}
        </button>

        {/* Hide / Close Note */}
        <button
          type="button"
          onClick={onClose}
          style={{ color: palette.textPrimary }}
          className="w-6 h-6 flex items-center justify-center rounded font-bold text-xs transition hover:bg-black/10"
          title="Hide sticky note (Press Alt+N to reopen)"
        >
          ✕
        </button>
      </div>

      {/* Color Theme Popover */}
      {showThemePicker && (
        <div
          data-no-drag="true"
          style={{
            backgroundColor: palette.bodyBg,
            borderColor: palette.border,
          }}
          className="absolute right-2 top-9 z-50 flex items-center gap-1.5 p-2 rounded-md shadow-lg border"
        >
          {(Object.keys(STICKY_THEMES) as StickyTheme[]).map((themeKey) => {
            const t = STICKY_THEMES[themeKey];
            const isSelected = activeNote.theme === themeKey;
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => {
                  onChangeTheme(themeKey);
                  setShowThemePicker(false);
                }}
                style={{
                  backgroundColor: t.swatch,
                  borderColor: isSelected ? palette.textPrimary : t.border,
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  isSelected ? 'scale-110' : 'hover:scale-105'
                }`}
                title={t.label}
              />
            );
          })}
        </div>
      )}

      {/* Note Switcher Dropdown */}
      {showNoteList && (
        <div
          data-no-drag="true"
          style={{
            backgroundColor: palette.bodyBg,
            borderColor: palette.border,
            color: palette.textPrimary,
          }}
          className="absolute left-2 top-9 z-50 w-60 max-h-56 overflow-y-auto rounded-md shadow-xl border p-1.5 space-y-1"
        >
          <div
            style={{ color: palette.textMuted }}
            className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between"
          >
            <span>All Sticky Notes ({notes.length})</span>
            <button
              type="button"
              onClick={() => {
                onCreateNote();
                setShowNoteList(false);
              }}
              style={{ color: palette.textPrimary }}
              className="underline font-semibold"
            >
              + New
            </button>
          </div>
          {notes.map((n) => {
            const isCurrent = n.id === activeNote.id;
            const itemTheme = STICKY_THEMES[n.theme] || STICKY_THEMES.yellow;
            return (
              <div
                key={n.id}
                onClick={() => {
                  onSelectNote(n.id);
                  setShowNoteList(false);
                }}
                style={{
                  backgroundColor: isCurrent ? palette.buttonHover : 'transparent',
                }}
                className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    style={{
                      backgroundColor: itemTheme.swatch,
                      borderColor: itemTheme.border,
                    }}
                    className="w-2.5 h-2.5 rounded-full border shrink-0"
                  />
                  <span className="truncate text-xs font-medium">
                    {n.title || 'Untitled Note'}
                  </span>
                </div>
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(n.id);
                    }}
                    className="px-1 py-0.5 rounded text-[10px] opacity-70 hover:opacity-100 hover:bg-red-500/20"
                    title="Delete this note"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
