import { useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_STORAGE,
  STORAGE_KEY,
  storageService,
} from '@/services/storageService';
import { SideNoteBookStorage } from '@/types';

export function useSyncedStorage() {
  const [state, setState] = useState<SideNoteBookStorage>(DEFAULT_STORAGE);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    const data = await storageService.getState();
    setState(data);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refresh();

    if (
      typeof chrome === 'undefined' ||
      typeof chrome.storage === 'undefined' ||
      typeof chrome.storage.onChanged === 'undefined'
    ) {
      return;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEY]?.newValue) {
        setState(changes[STORAGE_KEY].newValue as SideNoteBookStorage);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [refresh]);

  return {
    state,
    isLoaded,
    storageService,
    refresh,
  };
}
