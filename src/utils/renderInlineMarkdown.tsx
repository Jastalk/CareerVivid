/**
 * renderInlineMarkdown.tsx
 *
 * A lightweight inline markdown renderer for resume content.
 * Converts inline markdown syntax to React elements without any
 * block-level transformations that would break the resume layout.
 *
 * Supported syntax:
 *   **text**   → <strong>text</strong>
 *   *text*     → <em>text</em>
 *   `text`     → <code>text</code>
 */

import React from 'react';

export interface InlineMarkdownOptions {
  strongClassName?: string;
  strongTitle?: string;
  highlightClassName?: string;
  highlightTitle?: string;
}

export const TECHNICAL_TERM_OPEN = '\uE000';
export const TECHNICAL_TERM_CLOSE = '\uE001';

/**
 * Parses inline markdown tokens from a string and returns an array of
 * React elements/strings that can be rendered inside any tag.
 */
export function renderInlineMarkdown(text: string, options: InlineMarkdownOptions = {}): React.ReactNode[] {
  if (!text) return [];

  // Regex: match a Career Agent key term, bold, italic, or inline code.
  // Order matters: bold must come before italic to avoid partial matches.
  const TOKEN_RE = /(\uE000(.+?)\uE001|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/gs;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(text)) !== null) {
    // Push plain text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [full, , highlightContent, boldContent, italicContent, codeContent] = match;

    if (highlightContent !== undefined) {
      nodes.push(
        <mark
          key={match.index}
          className={options.highlightClassName}
          title={options.highlightTitle}
        >
          {highlightContent}
        </mark>
      );
    } else if (boldContent !== undefined) {
      nodes.push(
        <strong
          key={match.index}
          className={options.strongClassName}
          title={options.strongTitle}
          style={{ fontWeight: 'bold' }}
        >
          {boldContent}
        </strong>
      );
    } else if (italicContent !== undefined) {
      nodes.push(
        <em key={match.index} style={{ fontStyle: 'italic' }}>
          {italicContent}
        </em>
      );
    } else if (codeContent !== undefined) {
      nodes.push(
        <code
          key={match.index}
          style={{
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.06)',
            padding: '0 2px',
            borderRadius: '2px',
          }}
        >
          {codeContent}
        </code>
      );
    } else {
      // Unknown match — push as plain text
      nodes.push(full);
    }

    lastIndex = TOKEN_RE.lastIndex;
  }

  // Push any remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
