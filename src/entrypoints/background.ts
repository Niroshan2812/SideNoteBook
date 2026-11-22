import { storageService } from '@/services/storageService';

chrome.runtime.onInstalled.addListener(async () => {
  await storageService.getState();
  console.log('[SideNoteBook] Phase 1 Storage initialized.');
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
