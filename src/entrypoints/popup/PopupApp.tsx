import React, { useState } from 'react';
import { useSyncedStorage } from '@/hooks/useSyncedStorage';
import { StickyTheme } from '@/types';

const THEMES: StickyTheme[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'dark'];

export function PopupApp() {
  const { state, isLoaded, storageService } = useSyncedStorage();
  const [newTitle, setNewTitle] = useState('');

  if (!isLoaded) {
    return (
      <div className="w-80 p-4 text-xs text-slate-400">
        Loading SideNoteBook storage...
      </div>
    );
  }

  const handleAddTestNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || `Research Note #${state.notes.length + 1}`;
    await storageService.createNote({
      title,
      content: `Created during Phase 1 verification at ${new Date().toLocaleTimeString()}`,
      theme: 'yellow',
    });
    setNewTitle('');
  };

  return (
    <div className="w-[350px] p-4 bg-slate-900 text-slate-100 font-sans space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <h1 className="text-sm font-bold text-amber-300">
            SideNoteBook • Phase 1
          </h1>
          <p className="text-[11px] text-slate-400">
            Core Storage & Cross-Tab Sync Inspector
          </p>
        </div>
        <button
          onClick={() => storageService.toggleVisibility()}
          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
            state.uiState.isVisible
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {state.uiState.isVisible ? 'In-Page Note: ON' : 'In-Page Note: OFF'}
        </button>
      </div>

      {/* Create Test Note Form */}
      <form onSubmit={handleAddTestNote} className="flex gap-1.5">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New test note title..."
          className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs"
        >
          + Add
        </button>
      </form>

      {/* Live Stored Notes List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Stored Notes ({state.notes.length})</span>
          <span>Active Theme: {state.notes.find((n) => n.id === state.uiState.activeNoteId)?.theme ?? 'yellow'}</span>
        </div>

        {state.notes.map((note) => {
          const isActive = note.id === state.uiState.activeNoteId;
          return (
            <div
              key={note.id}
              onClick={() =>
                storageService.updateUIState({ activeNoteId: note.id })
              }
              className={`p-2 rounded border text-xs cursor-pointer transition flex items-start justify-between gap-2 ${
                isActive
                  ? 'bg-slate-800/90 border-amber-400/80'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-100 truncate">
                  {note.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {note.content}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={note.theme}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    storageService.updateNote(note.id, {
                      theme: e.target.value as StickyTheme,
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300"
                >
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {state.notes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      storageService.deleteNote(note.id);
                    }}
                    className="px-1.5 py-0.5 rounded hover:bg-red-500/20 text-red-400"
                    title="Delete Note"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 1 Status Footer */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Shortcut: Alt+N</span>
        <span>Tab Folders: {state.tabFolders.length}</span>
      </div>
    </div>
  );
}
