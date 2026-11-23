import { storageService } from '@/services/storageService';
import { formatQuoteSnippet } from '@/services/contextCapture';

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  return false;
});
