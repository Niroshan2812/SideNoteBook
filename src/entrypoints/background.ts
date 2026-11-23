import { storageService } from '@/services/storageService';
import { formatQuoteSnippet } from '@/services/contextCapture';
import {
  RestoreMode,
  SaveTabsOptions,
  tabFolderService,
} from '@/services/tabFolderService';

const MENU_QUOTE_ID = 'sidenotebook-add-quote';
const MENU_CITE_ID = 'sidenotebook-add-citation';

function registerContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_QUOTE_ID,
      title: 'Add quote to SideNoteBook',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: MENU_CITE_ID,
      title: 'Cite this page in SideNoteBook',
      contexts: ['page'],
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await storageService.getState();
  registerContextMenus();
  console.log('[SideNoteBook] Storage & context menus initialized.');
});

chrome.runtime.onStartup?.addListener(() => {
  registerContextMenus();
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  const pageTitle = tab?.title || 'Source Page';
  const pageUrl = info.pageUrl || tab?.url || '';

  if (info.menuItemId === MENU_QUOTE_ID && info.selectionText) {
    const snippet = formatQuoteSnippet(info.selectionText, pageTitle, pageUrl);
    await storageService.appendToActiveNote(snippet, {
      sourceTitle: pageTitle,
      sourceUrl: pageUrl,
    });
    return;
  }

  if (info.menuItemId === MENU_CITE_ID && pageUrl) {
    const safeTitle = pageTitle.replace(/\[|\]/g, '');
    await storageService.appendToActiveNote(`- [${safeTitle}](${pageUrl})`, {
      sourceTitle: pageTitle,
      sourceUrl: pageUrl,
    });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-sticky-note') {
    await storageService.toggleVisibility();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING_STORAGE') {
    storageService.getState().then((state) => {
      sendResponse({ ok: true, state });
    });
    return true;
  }

  if (message?.type === 'TOGGLE_STICKY') {
    storageService.toggleVisibility().then((state) => {
      sendResponse({ ok: true, isVisible: state.uiState.isVisible });
    });
    return true;
  }

  if (message?.type === 'GET_OPEN_TABS') {
    tabFolderService
      .getOpenTabs(sender.tab?.windowId)
      .then((tabs) => sendResponse({ ok: true, tabs }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'SAVE_TAB_FOLDER') {
    tabFolderService
      .saveTabsToFolder(message.options as SaveTabsOptions)
      .then((folder) => sendResponse({ ok: true, folder }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'RESTORE_TAB_FOLDER') {
    tabFolderService
      .restoreTabFolder(
        message.folderId as string,
        (message.mode as RestoreMode) || 'tabGroup'
      )
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'OPEN_SINGLE_TAB') {
    tabFolderService
      .openSingleTab(message.url as string)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'ADD_CURRENT_TAB_TO_FOLDER') {
    tabFolderService
      .addActiveTabToFolder(message.folderId as string, sender.tab?.windowId)
      .then((added) => sendResponse({ ok: true, added }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return false;
});
