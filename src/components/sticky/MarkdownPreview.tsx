import React from 'react';
import { ThemePalette } from './themeConfig';
import {
  parseTimestampSecondsFromUrl,
  parseYouTubeVideoId,
  seekCurrentYouTubeVideo,
} from '@/services/contextCapture';
import { isSafeHttpUrl } from '@/services/security';

interface MarkdownPreviewProps {
  content: string;
  palette: ThemePalette;
  onToggleCheckbox: (lineIndex: number) => void;
}

function renderInline(text: string, palette: ThemePalette): React.ReactNode[] {
  const tokenRegex =
    /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s)]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    const targetVideoId = parseYouTubeVideoId(href);
    const currentVideoId =
      typeof window !== 'undefined'
        ? parseYouTubeVideoId(window.location.href)
        : null;
    const timestampSec = parseTimestampSecondsFromUrl(href);

    if (
      targetVideoId &&
      currentVideoId &&
      targetVideoId === currentVideoId &&
      timestampSec !== null
    ) {
      const sought = seekCurrentYouTubeVideo(timestampSec);
      if (sought) {
        e.preventDefault();
      }
    }
  };

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `tok-${keyCounter++}`;

    if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const splitIdx = token.indexOf('](');
      const label = token.slice(1, splitIdx);
      const href = token.slice(splitIdx + 2, -1);
      if (isSafeHttpUrl(href)) {
        parts.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleLinkClick(e, href)}
            style={{ color: palette.id === 'dark' ? '#60A5FA' : '#1D4ED8' }}
            className="underline decoration-1 underline-offset-2 hover:opacity-80 font-medium break-words"
            title={href}
          >
            {label}
          </a>
        );
      } else {
        parts.push(
          <span
            key={key}
            className="opacity-70 underline decoration-dotted"
            title="Blocked unsafe URL scheme"
          >
            {label}
          </span>
        );
      }
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          style={{
            backgroundColor: palette.inputBg,
            borderColor: palette.divider,
          }}
          className="px-1 py-0.5 rounded text-[11.5px] font-mono border"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key} className="font-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (/^https?:\/\//.test(token)) {
      parts.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => handleLinkClick(e, token)}
          style={{ color: palette.id === 'dark' ? '#60A5FA' : '#1D4ED8' }}
          className="underline decoration-1 underline-offset-2 hover:opacity-80 break-all"
        >
          {token}
        </a>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function MarkdownPreview({
  content,
  palette,
  onToggleCheckbox,
}: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div
        style={{ color: palette.textMuted }}
        className="text-xs italic p-3 opacity-75"
      >
        Nothing to preview yet. Switch to Edit mode to start writing notes.
      </div>
    );
  }

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
        codeStartIndex = i;
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${codeStartIndex}`}
            style={{
              backgroundColor: palette.inputBg,
              borderColor: palette.divider,
              color: palette.textPrimary,
            }}
            className="p-2 rounded border text-[11.5px] font-mono overflow-x-auto my-1.5 whitespace-pre-wrap"
          >
            {codeLines.join('\n')}
          </pre>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-[13px] font-bold mt-2 mb-0.5">
          {renderInline(trimmed.slice(4), palette)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold mt-2 mb-0.5">
          {renderInline(trimmed.slice(3), palette)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          style={{ borderBottom: `1px solid ${palette.divider}` }}
          className="text-[15px] font-bold pb-0.5 mt-1.5 mb-1"
        >
          {renderInline(trimmed.slice(2), palette)}
        </h1>
      );
      continue;
    }

    // Horizontal Rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(
        <hr
          key={`hr-${i}`}
          style={{ borderColor: palette.divider }}
          className="my-2"
        />
      );
      continue;
    }

    // Interactive Task Checkbox: - [ ] or - [x]
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const indent = Math.min(taskMatch[1].length * 8, 24);
      const checked = taskMatch[2].toLowerCase() === 'x';
      const taskText = taskMatch[3];
      elements.push(
        <label
          key={`task-${i}`}
          style={{ paddingLeft: `${indent}px` }}
          className="flex items-start gap-1.5 py-0.5 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleCheckbox(i)}
            className="mt-1 accent-amber-600 cursor-pointer shrink-0"
          />
          <span className={checked ? 'line-through opacity-60' : ''}>
            {renderInline(taskText, palette)}
          </span>
        </label>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          style={{
            borderLeft: `3px solid ${palette.border}`,
            backgroundColor: palette.inputBg,
            color: palette.textSecondary,
          }}
          className="pl-2.5 pr-2 py-1 my-1 rounded-r italic text-[12.5px]"
        >
          {renderInline(trimmed.slice(2), palette)}
        </blockquote>
      );
      continue;
    }

    // Bullet List
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      const indent = Math.min(bulletMatch[1].length * 8, 24);
      elements.push(
        <div
          key={`li-${i}`}
          style={{ paddingLeft: `${indent}px` }}
          className="flex items-start gap-1.5 py-0.5"
        >
          <span className="font-bold leading-relaxed">•</span>
          <span className="flex-1 break-words">
            {renderInline(bulletMatch[2], palette)}
          </span>
        </div>
      );
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);
    if (numMatch) {
      const indent = Math.min(numMatch[1].length * 8, 24);
      elements.push(
        <div
          key={`ol-${i}`}
          style={{ paddingLeft: `${indent}px` }}
          className="flex items-start gap-1.5 py-0.5"
        >
          <span className="font-semibold shrink-0">{numMatch[2]}</span>
          <span className="flex-1 break-words">
            {renderInline(numMatch[3], palette)}
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={`p-${i}`} className="py-0.5 break-words">
        {renderInline(line, palette)}
      </p>
    );
  }

  // Unclosed code fence fallback
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre
        key={`code-${codeStartIndex}`}
        style={{
          backgroundColor: palette.inputBg,
          borderColor: palette.divider,
        }}
        className="p-2 rounded border text-[11.5px] font-mono overflow-x-auto my-1.5 whitespace-pre-wrap"
      >
        {codeLines.join('\n')}
      </pre>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 text-[13px] leading-relaxed select-text">
      {elements}
    </div>
  );
}
