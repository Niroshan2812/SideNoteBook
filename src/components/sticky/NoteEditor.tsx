import React, { useEffect, useRef, useState } from 'react';
import { Note } from '@/types';
import { ThemePalette } from './themeConfig';
import { MarkdownPreview } from './MarkdownPreview';
import {
  capturePageContext,
  formatCitationSnippet,
  formatQuoteSnippet,
  formatSeconds,
  getYouTubeVideoElement,
} from '@/services/contextCapture';

interface NoteEditorProps {
  note: Note;
  palette: ThemePalette;
  onSaveContent: (noteId: string, content: string) => void;
}

export function NoteEditor({ note, palette, onSaveContent }: NoteEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [draft, setDraft] = useState(note.content);
  const [ytTimestampLabel, setYtTimestampLabel] = useState<string | null>(null);
  const [captureFlash, setCaptureFlash] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastLocalEditAtRef = useRef<number>(0);
  const activeNoteIdRef = useRef<string>(note.id);

  // Sync draft when switching notes or receiving external updates (e.g. context menu quote)
  useEffect(() => {
    if (activeNoteIdRef.current !== note.id) {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      activeNoteIdRef.current = note.id;
      setDraft(note.content);
      return;
    }

    const timeSinceLocalEdit = Date.now() - lastLocalEditAtRef.current;
    if (timeSinceLocalEdit > 400 && note.content !== draft) {
      setDraft(note.content);
    }
  }, [note.id, note.content, draft]);

  // Poll live YouTube video timestamp so the "Cite" button shows live playback time
  useEffect(() => {
    const checkYouTube = () => {
      if (
        typeof window === 'undefined' ||
        (!window.location.hostname.includes('youtube.com') &&
          window.location.hostname !== 'youtu.be')
      ) {
        setYtTimestampLabel(null);
        return;
      }
      const video = getYouTubeVideoElement();
      if (video && Number.isFinite(video.currentTime)) {
        setYtTimestampLabel(formatSeconds(video.currentTime));
      } else {
        setYtTimestampLabel(null);
      }
    };

    checkYouTube();
    const interval = window.setInterval(checkYouTube, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const commitDraft = (nextValue: string, immediate = false) => {
    setDraft(nextValue);
    lastLocalEditAtRef.current = Date.now();

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    if (immediate) {
      onSaveContent(note.id, nextValue);
      saveTimeoutRef.current = null;
    } else {
      const targetId = note.id;
      saveTimeoutRef.current = window.setTimeout(() => {
        onSaveContent(targetId, nextValue);
        saveTimeoutRef.current = null;
      }, 180);
    }
  };

  const showFlash = (label: string) => {
    setCaptureFlash(label);
    window.setTimeout(() => setCaptureFlash(null), 1600);
  };

  const insertAtCursor = (
    snippet: string,
    opts?: { ensureNewline?: boolean; selectOffset?: [number, number] }
  ) => {
    const el = textareaRef.current;
    if (!el || mode === 'preview') {
      const separator = draft && !draft.endsWith('\n') ? '\n' : '';
      commitDraft(`${draft}${separator}${snippet}`, true);
      return;
    }

    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);

    const needsLeadingNewline =
      opts?.ensureNewline && before.length > 0 && !before.endsWith('\n');
    const prefix = needsLeadingNewline ? '\n' : '';
    const nextValue = `${before}${prefix}${snippet}${after}`;
    commitDraft(nextValue, true);

    requestAnimationFrame(() => {
      el.focus();
      const basePos = start + prefix.length;
      if (opts?.selectOffset) {
        el.setSelectionRange(
          basePos + opts.selectOffset[0],
          basePos + opts.selectOffset[1]
        );
      } else {
        const cursor = basePos + snippet.length;
        el.setSelectionRange(cursor, cursor);
      }
    });
  };

  const wrapSelection = (left: string, right: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    if (mode === 'preview') setMode('edit');

    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const selected = draft.slice(start, end) || placeholder;
    const nextValue = `${draft.slice(0, start)}${left}${selected}${right}${draft.slice(end)}`;
    commitDraft(nextValue, true);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + left.length,
        start + left.length + selected.length
      );
    });
  };

  const prefixCurrentLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    if (mode === 'preview') setMode('edit');

    const start = el.selectionStart ?? draft.length;
    const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
    const nextValue = `${draft.slice(0, lineStart)}${prefix}${draft.slice(lineStart)}`;
    commitDraft(nextValue, true);

    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleInsertCitation = () => {
    const ctx = capturePageContext();
    const snippet = formatCitationSnippet(ctx);
    insertAtCursor(`${snippet}\n`, { ensureNewline: true });
    showFlash(
      ctx.youtubeFormattedTime
        ? `Cited @ ${ctx.youtubeFormattedTime}`
        : 'Source Cited'
    );
  };

  const handleInsertSelectionQuote = () => {
    const ctx = capturePageContext();
    if (!ctx.selection) {
      prefixCurrentLine('> ');
      return;
    }
    const snippet = formatQuoteSnippet(ctx.selection, ctx.title, ctx.url);
    insertAtCursor(`${snippet}\n`, { ensureNewline: true });
    showFlash('Quote Added');
  };

  const handleToggleCheckboxInPreview = (lineIndex: number) => {
    const lines = draft.split(/\r?\n/);
    const target = lines[lineIndex];
    if (!target) return;

    if (/^(\s*[-*]\s+)\[ \]/.test(target)) {
      lines[lineIndex] = target.replace(/^(\s*[-*]\s+)\[ \]/, '$1[x]');
    } else if (/^(\s*[-*]\s+)\[[xX]\]/.test(target)) {
      lines[lineIndex] = target.replace(/^(\s*[-*]\s+)\[[xX]\]/, '$1[ ]');
    }
    commitDraft(lines.join('\n'), true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;

    // Ctrl+B / Cmd+B -> Bold, Ctrl+I / Cmd+I -> Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrapSelection('**', '**', 'bold text');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrapSelection('*', '*', 'italic text');
      return;
    }

    // Tab indentation inside editor
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextValue = `${draft.slice(0, start)}  ${draft.slice(end)}`;
      commitDraft(nextValue);
      requestAnimationFrame(() => {
        el.setSelectionRange(start + 2, start + 2);
      });
      return;
    }

    // Smart Markdown list / task continuation on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) return;

      const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
      const currentLine = draft.slice(lineStart, start);

      const taskMatch = currentLine.match(/^(\s*[-*]\s+\[[ xX]\]\s+)(.*)$/);
      const bulletMatch = currentLine.match(/^(\s*[-*]\s+)(.*)$/);
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

      if (taskMatch) {
        e.preventDefault();
        if (!taskMatch[2].trim()) {
          // Empty checkbox item -> exit list
          const nextValue = `${draft.slice(0, lineStart)}${draft.slice(start)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
        } else {
          const indentMatch = taskMatch[1].match(/^(\s*[-*]\s+)/);
          const nextPrefix = `\n${indentMatch ? indentMatch[1] : '- '}[ ] `;
          const nextValue = `${draft.slice(0, start)}${nextPrefix}${draft.slice(end)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() =>
            el.setSelectionRange(
              start + nextPrefix.length,
              start + nextPrefix.length
            )
          );
        }
        return;
      }

      if (bulletMatch) {
        e.preventDefault();
        if (!bulletMatch[2].trim()) {
          const nextValue = `${draft.slice(0, lineStart)}${draft.slice(start)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
        } else {
          const nextPrefix = `\n${bulletMatch[1]}`;
          const nextValue = `${draft.slice(0, start)}${nextPrefix}${draft.slice(end)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() =>
            el.setSelectionRange(
              start + nextPrefix.length,
              start + nextPrefix.length
            )
          );
        }
        return;
      }

      if (numMatch) {
        e.preventDefault();
        if (!numMatch[3].trim()) {
          const nextValue = `${draft.slice(0, lineStart)}${draft.slice(start)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
        } else {
          const nextNum = parseInt(numMatch[2], 10) + 1;
          const nextPrefix = `\n${numMatch[1]}${nextNum}. `;
          const nextValue = `${draft.slice(0, start)}${nextPrefix}${draft.slice(end)}`;
          commitDraft(nextValue);
          requestAnimationFrame(() =>
            el.setSelectionRange(
              start + nextPrefix.length,
              start + nextPrefix.length
            )
          );
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Compact Formatting & Research Context Toolbar */}
      <div
        style={{
          borderBottom: `1px solid ${palette.divider}`,
          backgroundColor: palette.inputBg,
          color: palette.textSecondary,
        }}
        className="px-2 py-1 flex items-center justify-between gap-1 flex-wrap text-[11px] select-none"
      >
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => prefixCurrentLine('# ')}
            className="px-1.5 py-0.5 rounded font-bold hover:bg-black/10"
            title="Heading (# )"
          >
            H
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('**', '**', 'bold')}
            className="px-1.5 py-0.5 rounded font-bold hover:bg-black/10"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => prefixCurrentLine('- ')}
            className="px-1.5 py-0.5 rounded font-bold hover:bg-black/10"
            title="Bullet List (- )"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => prefixCurrentLine('- [ ] ')}
            className="px-1.5 py-0.5 rounded font-semibold hover:bg-black/10"
            title="Task Checkbox (- [ ])"
          >
            ☑
          </button>
          <button
            type="button"
            onClick={() => wrapSelection('`', '`', 'code')}
            className="px-1.5 py-0.5 rounded font-mono text-[10px] hover:bg-black/10"
            title="Inline Code (`code`)"
          >
            {'</>'}
          </button>
        </div>

        {/* 1-Click Research Context Capture + Edit/Preview Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertCitation}
            style={{
              backgroundColor: palette.buttonHover,
              color: palette.textPrimary,
            }}
            className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold hover:opacity-85 transition flex items-center gap-1"
            title={
              ytTimestampLabel
                ? `Insert YouTube timestamp link (${ytTimestampLabel})`
                : 'Insert current page URL citation'
            }
          >
            {ytTimestampLabel ? `⏱ ${ytTimestampLabel}` : '📎 Cite'}
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertSelectionQuote}
            style={{
              backgroundColor: palette.buttonHover,
              color: palette.textPrimary,
            }}
            className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold hover:opacity-85 transition"
            title="Capture highlighted webpage text as quote (or start blockquote)"
          >
            ❝ Quote
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              navigator.clipboard?.writeText(
                `# ${note.title || 'Untitled Note'}\n\n${draft}`
              );
              showFlash('Copied Markdown');
            }}
            style={{
              backgroundColor: palette.buttonHover,
              color: palette.textPrimary,
            }}
            className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold hover:opacity-85 transition"
            title="Copy note as Markdown"
          >
            📋
          </button>

          <button
            type="button"
            onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
            style={{
              backgroundColor:
                mode === 'preview' ? palette.textPrimary : 'transparent',
              color: mode === 'preview' ? palette.bodyBg : palette.textPrimary,
              borderColor: palette.divider,
            }}
            className="px-1.5 py-0.5 rounded border text-[10.5px] font-semibold transition"
            title="Toggle Markdown Preview (clickable links & checkboxes)"
          >
            {mode === 'preview' ? '✎ Edit' : '👁 View'}
          </button>
        </div>
      </div>

      {/* Transient Capture Feedback Banner */}
      {captureFlash && (
        <div
          style={{
            backgroundColor: palette.headerBg,
            color: palette.textPrimary,
            borderBottom: `1px solid ${palette.divider}`,
          }}
          className="px-3 py-0.5 text-[10.5px] font-semibold"
        >
          ✓ {captureFlash}
        </div>
      )}

      {/* Editor Body or Interactive Markdown Preview */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => commitDraft(e.target.value)}
          onBlur={() => commitDraft(draft, true)}
          onKeyDown={handleKeyDown}
          placeholder="Write structured research notes (# headings, - bullets, - [ ] tasks)..."
          style={{
            color: palette.textPrimary,
            backgroundColor: 'transparent',
          }}
          className="flex-1 w-full p-3 text-[13px] leading-relaxed resize-none focus:outline-none placeholder:opacity-50 font-sans"
        />
      ) : (
        <MarkdownPreview
          content={draft}
          palette={palette}
          onToggleCheckbox={handleToggleCheckboxInPreview}
        />
      )}
    </div>
  );
}
