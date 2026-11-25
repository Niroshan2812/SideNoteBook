import { Note, SideNoteBookStorage, TabFolder } from '@/types';
import { storageService } from '@/services/storageService';
import {
  sanitizeImportedFolders,
  sanitizeImportedNotes,
} from '@/services/security';

function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sidenotebook-note'
  );
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const exportService = {
  formatNoteMarkdown(note: Note, linkedFolder?: TabFolder): string {
    const lines: string[] = [];
    lines.push(`# ${note.title || 'Untitled Note'}`);
    lines.push(
      `> Created: ${new Date(note.createdAt).toLocaleString()} | Updated: ${new Date(note.updatedAt).toLocaleString()}`
    );
    lines.push('');
    lines.push(note.content || '');

    if (linkedFolder && linkedFolder.tabs.length > 0) {
      lines.push('');
      lines.push(`---`);
      lines.push(`## Linked Research Tabs — ${linkedFolder.name}`);
      for (const tab of linkedFolder.tabs) {
        lines.push(`- [${tab.title}](${tab.url})`);
      }
    }

    return lines.join('\n');
  },

  downloadNoteMarkdown(note: Note, linkedFolder?: TabFolder): void {
    const md = this.formatNoteMarkdown(note, linkedFolder);
    const filename = `${sanitizeFilename(note.title)}.md`;
    triggerFileDownload(filename, md, 'text/markdown;charset=utf-8');
  },

  downloadAllNotesMarkdown(state: SideNoteBookStorage): void {
    const sections = state.notes.map((note) => {
      const linked = note.linkedFolderId
        ? state.tabFolders.find((f) => f.id === note.linkedFolderId)
        : undefined;
      return this.formatNoteMarkdown(note, linked);
    });

    const combined = sections.join('\n\n========================================\n\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `sidenotebook-notes-${dateStamp}.md`,
      combined,
      'text/markdown;charset=utf-8'
    );
  },

  downloadWorkspaceJson(state: SideNoteBookStorage): void {
    const payload = {
      app: 'SideNoteBook',
      exportedAt: new Date().toISOString(),
      version: 1,
      notes: state.notes,
      tabFolders: state.tabFolders,
    };
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `sidenotebook-backup-${dateStamp}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  },

  async importWorkspaceJson(
    rawJson: string
  ): Promise<{ addedNotes: number; addedFolders: number }> {
    const parsed = JSON.parse(rawJson) as {
      notes?: Note[];
      tabFolders?: TabFolder[];
    };

    if (!Array.isArray(parsed.notes) && !Array.isArray(parsed.tabFolders)) {
      throw new Error('Invalid SideNoteBook backup JSON format.');
    }

    const current = await storageService.getState();
    const existingNoteIds = new Set(current.notes.map((n) => n.id));
    const existingFolderIds = new Set(current.tabFolders.map((f) => f.id));

    const newNotes = sanitizeImportedNotes(parsed.notes).filter(
        (n) => !existingNoteIds.has(n.id)
      );
    const newFolders = sanitizeImportedFolders(parsed.tabFolders).filter(
        (f) => !existingFolderIds.has(f.id)
      );

    await storageService.setState((prev) => ({
      ...prev,
      notes: [...newNotes, ...prev.notes],
      tabFolders: [...newFolders, ...prev.tabFolders],
    }));

    return {
      addedNotes: newNotes.length,
      addedFolders: newFolders.length,
    };
  },
};
