import React, { useMemo, useRef, useState } from 'react';
import { useSyncedStorage } from '@/hooks/useSyncedStorage';
import { StickyTheme } from '@/types';
import { STICKY_THEMES } from '@/components/sticky/themeConfig';
import { NoteEditor } from '@/components/sticky/NoteEditor';
import { SaveTabsModal } from '@/components/tabs/SaveTabsModal';
import { FolderList } from '@/components/tabs/FolderList';
import { exportService } from '@/services/exportService';
import { CloudSyncPanel } from '@/components/sync/CloudSyncPanel';

type WorkspaceTab = 'notes' | 'folders' | 'cloud' | 'backup';

export function SidePanelApp() {
  const { state, isLoaded, storageService } = useSyncedStorage();
  const [section, setSection] = useState<WorkspaceTab>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flash = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(null), 2600);
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredNotes = useMemo(() => {
    if (!query) return state.notes;
    return state.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
    );
  }, [state.notes, query]);

  const filteredFolders = useMemo(() => {
    if (!query) return state.tabFolders;
    return state.tabFolders.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.tabs.some(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.url.toLowerCase().includes(query)
        )
    );
  }, [state.tabFolders, query]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-xs">
        Loading SideNoteBook Workspace...
      </div>
    );
  }

  const activeNote =
    state.notes.find((n) => n.id === state.uiState.activeNoteId) ||
    state.notes[0];
  const activePalette = activeNote
    ? STICKY_THEMES[activeNote.theme] || STICKY_THEMES.yellow
    : STICKY_THEMES.yellow;
  const activeLinkedFolder = activeNote?.linkedFolderId
    ? state.tabFolders.find((f) => f.id === activeNote.linkedFolderId)
    : undefined;

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await exportService.importWorkspaceJson(text);
      flash(
        `Imported ${res.addedNotes} note(s) and ${res.addedFolders} folder(s)`
      );
    } catch (err) {
      flash(`Import failed: ${String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Workspace Header */}
      <header className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-amber-300 tracking-tight">
            SideNoteBook Workspace
          </h1>
          <p className="text-[11px] text-slate-400">
            {state.notes.length} notes • {state.tabFolders.length} tab folders
          </p>
        </div>

        <button
          type="button"
          onClick={() => storageService.toggleVisibility()}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
            state.uiState.isVisible
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Toggle floating sticky note on webpages (Alt+N)"
        >
          {state.uiState.isVisible ? 'Floating: ON' : 'Floating: OFF'}
        </button>
      </header>

      {/* Global Search + Section Tabs */}
      <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/40">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, quotes, folder names, or saved URLs..."
            className="w-full pl-3 pr-7 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setSection('notes')}
            className={`py-1.5 rounded transition ${
              section === 'notes'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📝 Notes ({filteredNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('folders')}
            className={`py-1.5 rounded transition ${
              section === 'folders'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📁 Folders ({filteredFolders.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('cloud')}
            className={`py-1.5 rounded transition ${
              section === 'cloud'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ☁ Cloud
          </button>
          <button
            type="button"
            onClick={() => setSection('backup')}
            className={`py-1.5 rounded transition ${
              section === 'backup'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⬇ Export
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="mx-3 mt-2.5 px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
          ✓ {statusBanner}
        </div>
      )}

      {/* NOTES WORKSPACE TAB */}
      {section === 'notes' && (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-3">
          {/* Note Selector Strip + New Note */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                storageService.createNote({
                  title: `Research Note #${state.notes.length + 1}`,
                  content: '# \n- ',
                  theme: 'yellow',
                })
              }
              className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
            >
              + New Note
            </button>

            {activeNote && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    exportService.downloadNoteMarkdown(
                      activeNote,
                      activeLinkedFolder
                    );
                    flash(`Exported "${activeNote.title}.md"`);
                  }}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200"
                  title="Download active note as Markdown (.md)"
                >
                  ⬇ .md
                </button>
                <button
                  type="button"
                  onClick={() =>
                    storageService.updateUIState({
                      isVisible: true,
                      isCollapsed: false,
                    })
                  }
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-amber-300"
                  title="Show this note in the floating sticky window on your active webpage"
                >
                  Pop to Page ↗
                </button>
              </div>
            )}
          </div>

          {/* Searchable Notes List */}
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredNotes.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                No notes match "{searchQuery}".
              </div>
            ) : (
              filteredNotes.map((n) => {
                const isCurrent = n.id === activeNote?.id;
                const t = STICKY_THEMES[n.theme] || STICKY_THEMES.yellow;
                return (
                  <div
                    key={n.id}
                    onClick={() =>
                      storageService.updateUIState({ activeNoteId: n.id })
                    }
                    className={`p-2 rounded border cursor-pointer flex items-center justify-between gap-2 text-xs transition ${
                      isCurrent
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        style={{ backgroundColor: t.swatch }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-slate-100">
                          {n.title || 'Untitled Note'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {n.content.replace(/\s+/g, ' ') || 'Empty note'}
                        </div>
                      </div>
                    </div>

                    {state.notes.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          storageService.deleteNote(n.id);
                        }}
                        className="px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/20"
                        title="Delete note"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Embedded Sticky-Styled Editor (Works even on chrome:// & PDF pages!) */}
          {activeNote && (
            <div
              style={{
                backgroundColor: activePalette.bodyBg,
                borderColor: activePalette.border,
                color: activePalette.textPrimary,
              }}
              className="flex-1 min-h-[260px] rounded-md border flex flex-col overflow-hidden shadow-lg"
            >
              <div
                style={{
                  backgroundColor: activePalette.headerBg,
                  borderBottom: `1px solid ${activePalette.border}`,
                }}
                className="px-3 py-2 flex items-center justify-between gap-2"
              >
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) =>
                    storageService.updateNote(activeNote.id, {
                      title: e.target.value,
                    })
                  }
                  placeholder="Note title..."
                  style={{ color: activePalette.textPrimary }}
                  className="flex-1 bg-transparent font-bold text-sm focus:outline-none"
                />
                <select
                  value={activeNote.theme}
                  onChange={(e) =>
                    storageService.updateNote(activeNote.id, {
                      theme: e.target.value as StickyTheme,
                    })
                  }
                  style={{
                    backgroundColor: activePalette.inputBg,
                    borderColor: activePalette.border,
                    color: activePalette.textPrimary,
                  }}
                  className="px-1.5 py-0.5 rounded border text-[11px]"
                >
                  {(Object.keys(STICKY_THEMES) as StickyTheme[]).map((k) => (
                    <option key={k} value={k}>
                      {STICKY_THEMES[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <NoteEditor
                note={activeNote}
                palette={activePalette}
                onSaveContent={(noteId, content) =>
                  storageService.updateNote(noteId, { content })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* TAB FOLDERS WORKSPACE TAB */}
      {section === 'folders' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {showSaveModal ? (
            <SaveTabsModal
              activeNoteId={activeNote?.id}
              activeNoteTitle={activeNote?.title}
              onSaved={(folderName) => {
                setShowSaveModal(false);
                flash(`Saved folder "${folderName}"`);
              }}
              onCancel={() => setShowSaveModal(false)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                className="w-full py-2 px-3 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
              >
                + Save Open Tabs into Named Folder
              </button>

              <FolderList
                folders={filteredFolders}
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
                  setSection('notes');
                }}
              />
            </>
          )}
        </div>
      )}

      {/* CLOUD SYNC WORKSPACE TAB */}
      {section === 'cloud' && (
        <CloudSyncPanel state={state} onStatusMessage={flash} />
      )}

      {/* BACKUP & EXPORT TAB */}
      {section === 'backup' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
            <h2 className="font-bold text-slate-100">
              Export Research Notes & Tab Folders
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export all notes as clean Markdown files (including linked tab
              references) or save a full JSON backup of your notes and tab
              folders.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  exportService.downloadAllNotesMarkdown(state);
                  flash('Exported all notes to Markdown (.md)');
                }}
                className="w-full py-2 px-3 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold"
              >
                ⬇ Export All Notes (.md)
              </button>
              <button
                type="button"
                onClick={() => {
                  exportService.downloadWorkspaceJson(state);
                  flash('Downloaded full workspace backup (.json)');
                }}
                className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold"
              >
                ⬇ Download Full Backup (.json)
              </button>
            </div>
          </div>

          <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
            <h2 className="font-bold text-slate-100">Restore from Backup</h2>
            <p className="text-[11px] text-slate-400">
              Merge notes and saved tab folders from a previously exported
              SideNoteBook `.json` file without overwriting existing items.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold"
            >
              ⬆ Import Backup (.json)
            </button>
          </div>

          <div className="p-3 rounded-md bg-slate-900 border border-slate-800 space-y-2">
            <h2 className="font-bold text-slate-100">Window & Controls</h2>
            <button
              type="button"
              onClick={async () => {
                await storageService.updateUIState({
                  isVisible: true,
                  isCollapsed: false,
                  isPinned: false,
                  geometry: { x: 40, y: 60, width: 340, height: 380 },
                });
                flash('Sticky window position reset to default');
              }}
              className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium"
            >
              ↺ Reset Floating Sticky Window Position
            </button>
            <div className="text-[11px] text-slate-400 pt-1 space-y-0.5">
              <div>• Toggle sticky overlay: `Alt+N`</div>
              <div>• Highlight text & right-click: Add quote to SideNoteBook</div>
              <div>• Cloud Sync via Gmail & Google Drive: Coming in Phase 6</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
