import React from 'react';
import { createRoot } from 'react-dom/client';
import { useSyncedStorage } from '@/hooks/useSyncedStorage';
import styles from '@/styles/global.css?inline';

const HOST_ID = 'sidenotebook-shadow-host';

function Phase1ContentMountCheck() {
  const { state, isLoaded, storageService } = useSyncedStorage();

  if (!isLoaded || !state.uiState.isVisible) {
    return null;
  }

  const activeNote =
    state.notes.find((n) => n.id === state.uiState.activeNoteId) ||
    state.notes[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: `${state.uiState.geometry.y}px`,
        left: `${state.uiState.geometry.x}px`,
        zIndex: 2147483647,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      className="w-72 rounded-md shadow-xl border border-yellow-400 bg-sticky-yellow text-slate-800 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-sticky-yellowHeader border-b border-yellow-300 text-xs font-semibold">
        <span>SideNoteBook • Phase 1 Ready</span>
        <button
          onClick={() => storageService.toggleVisibility()}
          title="Hide (Alt+N)"
          className="px-1.5 py-0.5 rounded hover:bg-black/10 text-slate-700 font-bold"
        >
          ✕
        </button>
      </div>
      <div className="p-3 text-xs space-y-1.5">
        <div className="font-semibold text-slate-900 truncate">
          Active: {activeNote?.title ?? 'No active note'}
        </div>
        <div className="text-slate-700 line-clamp-3 whitespace-pre-wrap">
          {activeNote?.content ?? 'Create a note from the extension popup.'}
        </div>
        <div className="pt-1 border-t border-yellow-300/80 flex items-center justify-between text-[11px] text-slate-600">
          <span>Notes in storage: {state.notes.length}</span>
          <span>Shadow DOM Isolated ✓</span>
        </div>
      </div>
    </div>
  );
}

function mountShadowRoot() {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  shadowRoot.appendChild(styleTag);

  const mountContainer = document.createElement('div');
  shadowRoot.appendChild(mountContainer);

  const root = createRoot(mountContainer);
  root.render(
    <React.StrictMode>
      <Phase1ContentMountCheck />
    </React.StrictMode>
  );
}

mountShadowRoot();
