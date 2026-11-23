export type StickyTheme =
  | 'yellow'
  | 'blue'
  | 'green'
  | 'pink'
  | 'purple'
  | 'dark';

export interface StickyWindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  theme: StickyTheme;
  linkedFolderId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavedTab {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
}

export type TabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange';

export interface TabFolder {
  id: string;
  name: string;
  color: TabGroupColor;
  tabs: SavedTab[];
  linkedNoteId?: string;
  chromeBookmarkFolderId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StickyUIState {
  isVisible: boolean;
  isCollapsed: boolean;
  isPinned: boolean;
  opacity: number;
  activeNoteId: string | null;
  geometry: StickyWindowGeometry;
}

export interface CloudSyncMetadata {
  email?: string;
  userId?: string;
  lastSyncedAt?: number;
  driveFileId?: string;
  customClientId?: string;
  autoSync?: boolean;
  encryptionEnabled: boolean;
  encryptionMode?: 'email' | 'passphrase';
}

export interface EncryptedVault {
  version: number;
  mode: 'email' | 'passphrase';
  emailHash: string;
  iv: string;
  salt: string;
  ciphertext: string;
  updatedAt: number;
}

export interface SideNoteBookStorage {
  notes: Note[];
  tabFolders: TabFolder[];
  uiState: StickyUIState;
  cloudSync: CloudSyncMetadata;
}
