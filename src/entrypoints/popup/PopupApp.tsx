import React, { useState } from 'react';
import { useSyncedStorage } from '@/hooks/useSyncedStorage';
import { StickyTheme } from '@/types';
import { SaveTabsModal } from '@/components/tabs/SaveTabsModal';
import { FolderList } from '@/components/tabs/FolderList';

const THEMES: StickyTheme[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'dark'];

export function PopupApp() {
  const { state, isLoaded, storageService } = useSyncedStorage();
  const [activeTab, setActiveTab] = useState<'folders' | 'notes'>('folders');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="w-[370px] p-4 text-xs text-slate-400">
        Loading SideNoteBook...
      </div>
    );
  }

  const activeNote =
    state.notes.find((n) => n.id === state.uiState.activeNoteId) ||
    state.notes[0];

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newNoteTitle.trim() || `Research Note #${state.notes.length + 1}`;
    await storageService.createNote({
      title,
      content: `# ${title}\n- `,
      theme: 'yellow',
    });
    setNewNoteTitle('');
  };

  return (
    <div className="w-[380px] p-3.5 bg-slate-900 text-slate-100 font-sans space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <h1 className="text-sm font-bold text-amber-300">SideNoteBook</h1>
          <p className="text-[11px] text-slate-400">
            Floating Notes & Research Tab Folders
          </p>
        </div>
        <button
          onClick={() => storageService.toggleVisibility()}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
            state.uiState.isVisible
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {state.uiState.isVisible ? 'Sticky: ON' : 'Sticky: OFF'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-800/80 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('folders')}
          className={`py-1.5 rounded transition ${
            activeTab === 'folders'
              ? 'bg-slate-700 text-amber-300 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📁 Tab Folders ({state.tabFolders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`py-1.5 rounded transition ${
            activeTab === 'notes'
              ? 'bg-slate-700 text-amber-300 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 Sticky Notes ({state.notes.length})
        </button>
      </div>

      {banner && (
        <div className="px-2.5 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
          ✓ {banner}
        </div>
      )}

      {/* TAB FOLDERS VIEW */}
      {activeTab === 'folders' && (
        <div className="space-y-2.5">
          {showSaveModal ? (
            <SaveTabsModal
              activeNoteId={activeNote?.id}
              activeNoteTitle={activeNote?.title}
              onSaved={(folderName) => {
                setShowSaveModal(false);
                setBanner(`Saved "${folderName}"! Ready to reopen anytime.`);
                window.setTimeout(() => setBanner(null), 3000);
              }}
              onCancel={() => setShowSaveModal(false)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                className="w-full py-2 px-3 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>📁</span>
                <span>Save Open Tabs into a Named Folder</span>
              </button>

              <div className="max-h-72 overflow-y-auto pr-0.5">
                <FolderList
                  folders={state.tabFolders}
                  notes={state.notes}
                  onDeleteFolder={(folderId) =>
                    storageService.deleteTabFolder(folderId)
                  }
                  onOpenLinkedNote={async (noteId) => {
                    await storageService.updateUIState({
                      activeNoteId: noteId,
                      isVisible: true,
                      isCollapsed: false,
                    });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* STICKY NOTES VIEW */}
      {activeTab === 'notes' && (
        <div className="space-y-2.5">
          <form onSubmit={handleAddNote} className="flex gap-1.5">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="New sticky note title..."
              className="flex-1 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs"
            >
              + Add
            </button>
          </form>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {state.notes.map((note) => {
              const isActive = note.id === state.uiState.activeNoteId;
              const linkedFolder = note.linkedFolderId
                ? state.tabFolders.find((f) => f.id === note.linkedFolderId)
                : undefined;

              return (
                <div
                  key={note.id}
                  onClick={() =>
                    storageService.updateUIState({
                      activeNoteId: note.id,
                      isVisible: true,
                      isCollapsed: false,
                    })
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
                      {note.content || 'Empty note'}
                    </div>
                    {linkedFolder && (
                      <div className="text-[10px] text-amber-300/90 mt-0.5 truncate">
                        📁 Linked: {linkedFolder.name}
                      </div>
                    )}
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
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Toggle sticky: Alt+N</span>
        <span>Phase 4 • Tab Folders</span>
      </div>
    </div>
  );
}
