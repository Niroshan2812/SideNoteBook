import { storageService } from '@/services/storageService';
import { SavedTab, TabFolder, TabGroupColor } from '@/types';

export interface OpenTabCandidate {
  tabId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
}

export interface SaveTabsOptions {
  folderName: string;
  color: TabGroupColor;
  selectedTabs: OpenTabCandidate[];
  alsoSaveToBookmarks: boolean;
  closeAfterSave: boolean;
  linkMode: 'active' | 'new' | 'none';
  activeNoteId?: string | null;
}

export type RestoreMode = 'tabGroup' | 'currentWindow' | 'newWindow';

function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.tabs !== 'undefined' &&
    typeof chrome.tabs.query === 'function'
  );
}

async function findBookmarksBarId(): Promise<string | null> {
  if (!chrome.bookmarks) return null;
  const tree = await chrome.bookmarks.getTree();
  const root = tree[0];
  if (!root?.children) return null;

  // Standard Chromium Bookmarks Bar has id '1' or matching title
  const bar =
    root.children.find((node) => node.id === '1') ||
    root.children.find((node) =>
      node.title.toLowerCase().includes('bookmarks bar')
    ) ||
    root.children[0];

  return bar?.id ?? null;
}

export const tabFolderService = {
  async getOpenTabs(windowId?: number): Promise<OpenTabCandidate[]> {
    if (!isExtensionContext()) {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_OPEN_TABS',
      });
      return response?.tabs ?? [];
    }

    const queryInfo: chrome.tabs.QueryInfo =
      typeof windowId === 'number' ? { windowId } : { currentWindow: true };

    const tabs = await chrome.tabs.query(queryInfo);

    return tabs
      .filter(
        (t): t is chrome.tabs.Tab & { id: number; url: string } =>
          typeof t.id === 'number' &&
          typeof t.url === 'string' &&
          t.url.length > 0 &&
          !t.url.startsWith('chrome-extension://')
      )
      .map((t) => ({
        tabId: t.id,
        title: t.title || t.url,
        url: t.url,
        favIconUrl: t.favIconUrl,
        active: Boolean(t.active),
      }));
  },

  async saveTabsToFolder(options: SaveTabsOptions): Promise<TabFolder> {
    if (!isExtensionContext()) {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_TAB_FOLDER',
        options,
      });
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to save tab folder');
      }
      return response.folder as TabFolder;
    }

    const cleanName = options.folderName.trim() || 'Research Session';
    const folderId = `folder-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const savedTabs: SavedTab[] = options.selectedTabs.map((t, index) => ({
      id: `tab-${Date.now()}-${index}`,
      title: t.title || t.url,
      url: t.url,
      favIconUrl: t.favIconUrl,
    }));

    // Optional Chrome Bookmarks Bar mirror
    let chromeBookmarkFolderId: string | undefined;
    if (options.alsoSaveToBookmarks && chrome.bookmarks) {
      try {
        const barId = await findBookmarksBarId();
        if (barId) {
          const createdFolder = await chrome.bookmarks.create({
            parentId: barId,
            title: cleanName,
          });
          chromeBookmarkFolderId = createdFolder.id;

          for (const tab of savedTabs) {
            await chrome.bookmarks.create({
              parentId: createdFolder.id,
              title: tab.title,
              url: tab.url,
            });
          }
        }
      } catch (err) {
        console.warn('[SideNoteBook] Bookmarks Bar sync skipped:', err);
      }
    }

    // Optional linked sticky note
    let linkedNoteId: string | undefined;
    if (options.linkMode === 'active' && options.activeNoteId) {
      linkedNoteId = options.activeNoteId;
    } else if (options.linkMode === 'new') {
      const createdNote = await storageService.createNote({
        title: `${cleanName} — Notes`,
        content: `# ${cleanName}\nSaved ${savedTabs.length} research tab(s) on ${new Date().toLocaleDateString()}.\n\n- `,
        theme: 'yellow',
        linkedFolderId: folderId,
      });
      linkedNoteId = createdNote.id;
    }

    const folder: TabFolder = {
      id: folderId,
      name: cleanName,
      color: options.color,
      tabs: savedTabs,
      linkedNoteId,
      chromeBookmarkFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storageService.saveTabFolder(folder);

    // Optionally close saved tabs after securing them in storage
    if (options.closeAfterSave && options.selectedTabs.length > 0) {
      const tabIdsToClose = options.selectedTabs.map((t) => t.tabId);
      const firstTab = await chrome.tabs.get(tabIdsToClose[0]).catch(() => null);
      const windowTabs = firstTab?.windowId
        ? await chrome.tabs.query({ windowId: firstTab.windowId })
        : await chrome.tabs.query({ currentWindow: true });

      const remainingTabs = windowTabs.filter(
        (wt) => typeof wt.id === 'number' && !tabIdsToClose.includes(wt.id)
      );

      // Keep browser window open by creating a fresh tab if all tabs are being closed
      if (remainingTabs.length === 0) {
        await chrome.tabs.create({ active: true });
      }

      await chrome.tabs.remove(tabIdsToClose);
    }

    return folder;
  },

  async restoreTabFolder(
    folderId: string,
    mode: RestoreMode = 'tabGroup'
  ): Promise<void> {
    if (!isExtensionContext()) {
      await chrome.runtime.sendMessage({
        type: 'RESTORE_TAB_FOLDER',
        folderId,
        mode,
      });
      return;
    }

    const state = await storageService.getState();
    const folder = state.tabFolders.find((f) => f.id === folderId);
    if (!folder || folder.tabs.length === 0) return;

    const urls = folder.tabs.map((t) => t.url);

    if (mode === 'newWindow') {
      await chrome.windows.create({ url: urls, focused: true });
    } else {
      const createdTabIds: number[] = [];
      for (let i = 0; i < urls.length; i++) {
        const created = await chrome.tabs.create({
          url: urls[i],
          active: i === 0,
        });
        if (typeof created.id === 'number') {
          createdTabIds.push(created.id);
        }
      }

      if (
        mode === 'tabGroup' &&
        createdTabIds.length > 0 &&
        chrome.tabs.group &&
        chrome.tabGroups
      ) {
        try {
          const groupId = await chrome.tabs.group({
            tabIds: createdTabIds as [number, ...number[]],
          });
          await chrome.tabGroups.update(groupId, {
            title: folder.name,
            color: folder.color,
            collapsed: false,
          });
        } catch (err) {
          console.warn('[SideNoteBook] Tab group creation warning:', err);
        }
      }
    }

    // Automatically load linked sticky note when reopening research folder
    if (folder.linkedNoteId) {
      const linkedNoteExists = state.notes.some(
        (n) => n.id === folder.linkedNoteId
      );
      if (linkedNoteExists) {
        await storageService.updateUIState({
          activeNoteId: folder.linkedNoteId,
          isVisible: true,
          isCollapsed: false,
        });
      }
    }
  },

  async openSingleTab(url: string): Promise<void> {
    if (!isExtensionContext()) {
      await chrome.runtime.sendMessage({ type: 'OPEN_SINGLE_TAB', url });
      return;
    }
    await chrome.tabs.create({ url, active: true });
  },

  async addActiveTabToFolder(
    folderId: string,
    windowId?: number
  ): Promise<boolean> {
    if (!isExtensionContext()) {
      const res = await chrome.runtime.sendMessage({
        type: 'ADD_CURRENT_TAB_TO_FOLDER',
        folderId,
      });
      return Boolean(res?.added);
    }

    const queryInfo: chrome.tabs.QueryInfo =
      typeof windowId === 'number'
        ? { windowId, active: true }
        : { currentWindow: true, active: true };

    const [activeTab] = await chrome.tabs.query(queryInfo);
    if (!activeTab?.url || activeTab.url.startsWith('chrome-extension://')) {
      return false;
    }

    const state = await storageService.getState();
    const folder = state.tabFolders.find((f) => f.id === folderId);
    if (!folder) return false;

    const alreadyExists = folder.tabs.some((t) => t.url === activeTab.url);
    if (alreadyExists) return false;

    const newTab: SavedTab = {
      id: `tab-${Date.now()}`,
      title: activeTab.title || activeTab.url,
      url: activeTab.url,
      favIconUrl: activeTab.favIconUrl,
    };

    await storageService.updateTabFolder(folder.id, {
      tabs: [...folder.tabs, newTab],
    });

    if (folder.chromeBookmarkFolderId && chrome.bookmarks) {
      try {
        await chrome.bookmarks.create({
          parentId: folder.chromeBookmarkFolderId,
          title: newTab.title,
          url: newTab.url,
        });
      } catch {
        // Bookmark folder may have been manually deleted by user
      }
    }

    return true;
  },

  async removeTabFromFolder(folderId: string, tabId: string): Promise<void> {
    const state = await storageService.getState();
    const folder = state.tabFolders.find((f) => f.id === folderId);
    if (!folder) return;

    await storageService.updateTabFolder(folderId, {
      tabs: folder.tabs.filter((t) => t.id !== tabId),
    });
  },
};
