import React, { useEffect, useState } from 'react';
import {
  OpenTabCandidate,
  tabFolderService,
} from '@/services/tabFolderService';
import { TabGroupColor } from '@/types';
import { ThemePalette } from '@/components/sticky/themeConfig';

const GROUP_COLORS: { id: TabGroupColor; hex: string; label: string }[] = [
  { id: 'blue', hex: '#3B82F6', label: 'Blue' },
  { id: 'yellow', hex: '#EAB308', label: 'Yellow' },
  { id: 'green', hex: '#22C55E', label: 'Green' },
  { id: 'purple', hex: '#A855F7', label: 'Purple' },
  { id: 'pink', hex: '#EC4899', label: 'Pink' },
  { id: 'cyan', hex: '#06B6D4', label: 'Cyan' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'red', hex: '#EF4444', label: 'Red' },
  { id: 'grey', hex: '#6B7280', label: 'Grey' },
];

interface SaveTabsModalProps {
  activeNoteId?: string | null;
  activeNoteTitle?: string;
  palette?: ThemePalette;
  onSaved: (folderName: string) => void;
  onCancel: () => void;
}

export function SaveTabsModal({
  activeNoteId,
  activeNoteTitle,
  palette,
  onSaved,
  onCancel,
}: SaveTabsModalProps) {
  const [openTabs, setOpenTabs] = useState<OpenTabCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [folderName, setFolderName] = useState('');
  const [color, setColor] = useState<TabGroupColor>('blue');
  const [alsoBookmarks, setAlsoBookmarks] = useState(true);
  const [closeAfterSave, setCloseAfterSave] = useState(false);
  const [linkMode, setLinkMode] = useState<'active' | 'new' | 'none'>(
    activeNoteId ? 'active' : 'new'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    tabFolderService
      .getOpenTabs()
      .then((tabs) => {
        if (!mounted) return;
        setOpenTabs(tabs);
        setSelectedIds(new Set(tabs.map((t) => t.tabId)));
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTab = (tabId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(openTabs.map((t) => t.tabId)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = openTabs.filter((t) => selectedIds.has(t.tabId));
    if (chosen.length === 0) {
      setError('Select at least one tab to save.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const finalName = folderName.trim() || 'Research Session';
      await tabFolderService.saveTabsToFolder({
        folderName: finalName,
        color,
        selectedTabs: chosen,
        alsoSaveToBookmarks: alsoBookmarks,
        closeAfterSave,
        linkMode,
        activeNoteId,
      });
      onSaved(finalName);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  const isSticky = Boolean(palette);

  return (
    <form
      onSubmit={handleSave}
      style={
        isSticky && palette
          ? {
              backgroundColor: palette.bodyBg,
              color: palette.textPrimary,
            }
          : undefined
      }
      className={`flex flex-col gap-2.5 text-xs ${
        isSticky ? 'p-3 flex-1 min-h-0 overflow-y-auto' : 'p-0'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-[13px]">
          📁 Save Open Tabs to Folder
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="px-1.5 py-0.5 rounded text-[11px] opacity-75 hover:opacity-100 hover:bg-black/10"
        >
          Cancel
        </button>
      </div>

      {/* Folder Name Input */}
      <div>
        <label className="block text-[11px] font-semibold opacity-80 mb-1">
          Folder Name (e.g. Metacognitive LLMs)
        </label>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Name this research folder..."
          autoFocus
          style={
            isSticky && palette
              ? {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }
              : undefined
          }
          className={`w-full px-2.5 py-1.5 rounded border text-xs focus:outline-none ${
            isSticky
              ? 'placeholder:opacity-50'
              : 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-400'
          }`}
        />
      </div>

      {/* Tab Group Color Picker */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold opacity-80">
          Group Color:
        </span>
        <div className="flex items-center gap-1">
          {GROUP_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              style={{ backgroundColor: c.hex }}
              className={`w-4 h-4 rounded-full transition-transform ${
                color === c.id
                  ? 'ring-2 ring-offset-1 ring-amber-400 scale-110'
                  : 'opacity-75 hover:opacity-100'
              }`}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Open Tabs Checklist */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold opacity-80">
            Select Tabs ({selectedIds.size}/{openTabs.length})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="underline opacity-80 hover:opacity-100"
            >
              All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="underline opacity-80 hover:opacity-100"
            >
              None
            </button>
          </div>
        </div>

        <div
          style={
            isSticky && palette
              ? {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.divider,
                }
              : undefined
          }
          className={`max-h-32 overflow-y-auto rounded border p-1 space-y-0.5 ${
            isSticky ? '' : 'bg-slate-800/60 border-slate-700'
          }`}
        >
          {loading ? (
            <div className="p-2 text-[11px] opacity-70">
              Scanning open browser tabs...
            </div>
          ) : openTabs.length === 0 ? (
            <div className="p-2 text-[11px] opacity-70">
              No savable tabs found in this window.
            </div>
          ) : (
            openTabs.map((tab) => {
              const checked = selectedIds.has(tab.tabId);
              return (
                <label
                  key={tab.tabId}
                  className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer hover:bg-black/10"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTab(tab.tabId)}
                    className="accent-amber-500 shrink-0"
                  />
                  {tab.favIconUrl ? (
                    <img
                      src={tab.favIconUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                    />
                  ) : (
                    <span className="w-3.5 h-3.5 text-[10px] text-center shrink-0">
                      🌐
                    </span>
                  )}
                  <span className="truncate flex-1 text-[11.5px]">
                    {tab.title}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Options: Bookmarks Bar, Close Tabs, Linked Sticky Note */}
      <div className="space-y-1.5 text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={alsoBookmarks}
            onChange={(e) => setAlsoBookmarks(e.target.checked)}
            className="accent-amber-500"
          />
          <span>Also create folder on Chrome Bookmarks Bar</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={closeAfterSave}
            onChange={(e) => setCloseAfterSave(e.target.checked)}
            className="accent-amber-500"
          />
          <span>Close saved tabs after saving (declutter window)</span>
        </label>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="opacity-80 font-medium">Link Note:</span>
          <select
            value={linkMode}
            onChange={(e) =>
              setLinkMode(e.target.value as 'active' | 'new' | 'none')
            }
            style={
              isSticky && palette
                ? {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }
                : undefined
            }
            className={`px-2 py-1 rounded border text-[11px] max-w-[195px] ${
              isSticky
                ? ''
                : 'bg-slate-800 border-slate-700 text-slate-100'
            }`}
          >
            {activeNoteId && (
              <option value="active">
                Active: {(activeNoteTitle || 'Note').slice(0, 22)}
              </option>
            )}
            <option value="new">Create new linked note</option>
            <option value="none">Don't link a note</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-red-500 font-medium">{error}</div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || loading || selectedIds.size === 0}
          className="w-full py-1.5 px-3 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold text-xs transition"
        >
          {saving
            ? 'Saving Folder...'
            : `Save ${selectedIds.size} Tab${selectedIds.size === 1 ? '' : 's'} to Folder`}
        </button>
      </div>
    </form>
  );
}
