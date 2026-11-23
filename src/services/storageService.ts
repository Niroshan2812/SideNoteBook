import {
  Note,
  SideNoteBookStorage,
  StickyTheme,
  StickyUIState,
  TabFolder,
} from '@/types';

export const STORAGE_KEY = 'sidenotebook_state_v1';

const DEFAULT_NOTE_ID = 'note-welcome-seed';

export const DEFAULT_STORAGE: SideNoteBookStorage = {
  notes: [
    {
      id: DEFAULT_NOTE_ID,
      title: 'Metacognitive LLMs — Research Note',
      content:
        '# Metacognitive LLMs Notes\n- Welcome to SideNoteBook!\n- Press Alt+N anytime to toggle the floating sticky note.\n- Drag the note anywhere on your screen while reading papers or watching lectures.',
      theme: 'yellow',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  tabFolders: [],
  uiState: {
    isVisible: true,
    isCollapsed: false,
    isPinned: false,
    opacity: 0.98,
    activeNoteId: DEFAULT_NOTE_ID,
    geometry: {
      x: 40,
      y: 60,
      width: 340,
      height: 380,
    },
  },
  cloudSync: {
    encryptionEnabled: true,
  },
};

const isChromeStorageAvailable = (): boolean =>
  typeof chrome !== 'undefined' &&
  typeof chrome.storage !== 'undefined' &&
  typeof chrome.storage.local !== 'undefined';

let fallbackMemoryStore: SideNoteBookStorage = structuredClone(DEFAULT_STORAGE);

export const storageService = {
  async getState(): Promise<SideNoteBookStorage> {
    if (!isChromeStorageAvailable()) {
      return fallbackMemoryStore;
    }

    const result = await chrome.storage.local.get(STORAGE_KEY);
    const existing = result[STORAGE_KEY] as SideNoteBookStorage | undefined;

    if (!existing) {
      await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_STORAGE });
      return DEFAULT_STORAGE;
    }

    return {
      ...DEFAULT_STORAGE,
      ...existing,
      uiState: {
        ...DEFAULT_STORAGE.uiState,
        ...(existing.uiState || {}),
        geometry: {
          ...DEFAULT_STORAGE.uiState.geometry,
          ...(existing.uiState?.geometry || {}),
        },
      },
    };
  },

  async setState(
    updater:
      | SideNoteBookStorage
      | ((prev: SideNoteBookStorage) => SideNoteBookStorage)
  ): Promise<SideNoteBookStorage> {
    const current = await this.getState();
    const next = typeof updater === 'function' ? updater(current) : updater;

    if (!isChromeStorageAvailable()) {
      fallbackMemoryStore = next;
      return next;
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  },

  async updateUIState(partial: Partial<StickyUIState>): Promise<SideNoteBookStorage> {
    return this.setState((prev) => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        ...partial,
        geometry: partial.geometry
          ? { ...prev.uiState.geometry, ...partial.geometry }
          : prev.uiState.geometry,
      },
    }));
  },

  async toggleVisibility(): Promise<SideNoteBookStorage> {
    return this.setState((prev) => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        isVisible: !prev.uiState.isVisible,
      },
    }));
  },

  async createNote(params?: {
    title?: string;
    content?: string;
    theme?: StickyTheme;
    linkedFolderId?: string;
  }): Promise<Note> {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: params?.title || 'Untitled Note',
      content: params?.content || '',
      theme: params?.theme || 'yellow',
      linkedFolderId: params?.linkedFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.setState((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      uiState: {
        ...prev.uiState,
        activeNoteId: newNote.id,
        isVisible: true,
        isCollapsed: false,
      },
    }));

    return newNote;
  },

  async updateNote(
    noteId: string,
    patch: Partial<Omit<Note, 'id' | 'createdAt'>>
  ): Promise<void> {
    await this.setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === noteId
          ? {
              ...n,
              ...patch,
              updatedAt: Date.now(),
            }
          : n
      ),
    }));
  },

  async appendToActiveNote(
    snippet: string,
    opts?: { sourceUrl?: string; sourceTitle?: string }
  ): Promise<void> {
    const state = await this.getState();
    const targetNote =
      state.notes.find((n) => n.id === state.uiState.activeNoteId) ||
      state.notes[0];

    if (!targetNote) {
      await this.createNote({
        title: opts?.sourceTitle || 'Research Quote',
        content: snippet,
      });
      return;
    }

    const separator =
      targetNote.content.trim().length > 0
        ? targetNote.content.endsWith('\n')
          ? '\n'
          : '\n\n'
        : '';

    await this.setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === targetNote.id
          ? {
              ...n,
              content: `${n.content}${separator}${snippet}`,
              sourceUrl: opts?.sourceUrl ?? n.sourceUrl,
              sourceTitle: opts?.sourceTitle ?? n.sourceTitle,
              updatedAt: Date.now(),
            }
          : n
      ),
      uiState: {
        ...prev.uiState,
        activeNoteId: targetNote.id,
        isVisible: true,
        isCollapsed: false,
      },
    }));
  },

  async deleteNote(noteId: string): Promise<void> {
    await this.setState((prev) => {
      const remaining = prev.notes.filter((n) => n.id !== noteId);
      const nextActiveId =
        prev.uiState.activeNoteId === noteId
          ? remaining[0]?.id ?? null
          : prev.uiState.activeNoteId;

      return {
        ...prev,
        notes: remaining,
        uiState: {
          ...prev.uiState,
          activeNoteId: nextActiveId,
        },
      };
    });
  },

  async saveTabFolder(folder: TabFolder): Promise<void> {
    await this.setState((prev) => {
      const updatedNotes = folder.linkedNoteId
        ? prev.notes.map((n) =>
            n.id === folder.linkedNoteId
              ? { ...n, linkedFolderId: folder.id, updatedAt: Date.now() }
              : n
          )
        : prev.notes;

      return {
        ...prev,
        notes: updatedNotes,
        tabFolders: [folder, ...prev.tabFolders],
      };
    });
  },

  async updateTabFolder(
    folderId: string,
    patch: Partial<Omit<TabFolder, 'id' | 'createdAt'>>
  ): Promise<void> {
    await this.setState((prev) => ({
      ...prev,
      tabFolders: prev.tabFolders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              ...patch,
              updatedAt: Date.now(),
            }
          : f
      ),
    }));
  },

  async deleteTabFolder(folderId: string): Promise<void> {
    await this.setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.linkedFolderId === folderId ? { ...n, linkedFolderId: undefined } : n
      ),
      tabFolders: prev.tabFolders.filter((f) => f.id !== folderId),
    }));
  },
};
