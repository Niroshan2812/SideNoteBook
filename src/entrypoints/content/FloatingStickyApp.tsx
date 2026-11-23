import React from 'react';
import { useSyncedStorage } from '@/hooks/useSyncedStorage';
import { StickyWindow } from '@/components/sticky/StickyWindow';

export function FloatingStickyApp() {
  const { state, isLoaded, storageService } = useSyncedStorage();

  if (!isLoaded || !state.uiState.isVisible) {
    return null;
  }

  const activeNote =
    state.notes.find((n) => n.id === state.uiState.activeNoteId) ||
    state.notes[0];

  if (!activeNote) {
    return null;
  }

  return (
    <StickyWindow
      notes={state.notes}
      activeNote={activeNote}
      uiState={state.uiState}
      onUpdateGeometry={(geometry) =>
        storageService.updateUIState({ geometry })
      }
      onUpdateUIState={(patch) => storageService.updateUIState(patch)}
      onCreateNote={() =>
        storageService.createNote({
          title: `Research Note #${state.notes.length + 1}`,
          theme: activeNote.theme,
        })
      }
      onSelectNote={(noteId) =>
        storageService.updateUIState({
          activeNoteId: noteId,
          isCollapsed: false,
        })
      }
      onUpdateNote={(noteId, patch) => storageService.updateNote(noteId, patch)}
      onDeleteNote={(noteId) => storageService.deleteNote(noteId)}
    />
  );
}
