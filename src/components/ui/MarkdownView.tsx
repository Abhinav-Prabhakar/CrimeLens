'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  /** Raw markdown source to render. */
  children: string;
  /** Extra classes on the wrapper element. */
  className?: string;
}

/**
 * Shared markdown renderer tuned for the `cb-paper-sheet` aged-paper surface.
 *
 * Unlike the dark-theme renderer in the assistant drawer, every element here
 * uses dark-ink tones (#29221d family) with deep crimson accents so the output
 * reads as a typed case file on light paper. Element-level styling lives in a
 * scoped <style> block under `.cb-md-paper` so Tailwind's preflight resets
 * (which strip list markers, heading sizes and margins) are re-established
 * without touching global styles.
 */
export const MarkdownView: React.FC<MarkdownViewProps> = ({ children, className }) => (
  <div className={`cb-md-paper ${className ?? ''}`}>
    <style>{`
      .cb-md-paper {
        color: #29221d;
        font-size: 12px;
        line-height: 1.65;
      }
      .cb-md-paper h1 {
        font-family: var(--mono, "Courier New", Courier, monospace);
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: #6e1a16;
        border-bottom: 2px solid var(--red-dim, #8c2620);
        padding-bottom: 6px;
        margin: 0 0 10px;
      }
      .cb-md-paper h2 {
        font-family: var(--mono, "Courier New", Courier, monospace);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #29221d;
        margin: 14px 0 6px;
      }
      .cb-md-paper h3 {
        font-family: var(--mono, "Courier New", Courier, monospace);
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--red-dim, #8c2620);
        border-bottom: 1px solid rgba(140, 38, 32, 0.35);
        padding-bottom: 3px;
        margin: 14px 0 6px;
      }
      .cb-md-paper h4 {
        font-family: var(--mono, "Courier New", Courier, monospace);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #29221d;
        border-left: 3px solid var(--red-dim, #8c2620);
        padding-left: 7px;
        margin: 12px 0 4px;
      }
      .cb-md-paper p {
        margin: 0 0 8px;
      }
      .cb-md-paper strong {
        font-weight: 800;
        color: #1c1712;
      }
      .cb-md-paper em {
        font-style: italic;
        color: #4a4036;
      }
      .cb-md-paper ul {
        list-style: disc;
        padding-left: 20px;
        margin: 4px 0 10px;
      }
      .cb-md-paper ol {
        list-style: decimal;
        padding-left: 20px;
        margin: 4px 0 10px;
      }
      .cb-md-paper li {
        margin: 2px 0;
      }
      .cb-md-paper li > ul,
      .cb-md-paper li > ol {
        margin: 2px 0;
      }
      .cb-md-paper hr {
        border: none;
        border-top: 1px dashed #9f927c;
        margin: 14px 0;
      }
      .cb-md-paper blockquote {
        border-left: 3px solid var(--red-dim, #8c2620);
        padding: 4px 10px;
        margin: 8px 0;
        background: rgba(140, 38, 32, 0.06);
        font-style: italic;
        color: #4a4036;
      }
      .cb-md-paper code {
        font-family: var(--mono, "Courier New", Courier, monospace);
        font-size: 0.92em;
        background: rgba(41, 34, 29, 0.08);
        border: 1px solid rgba(41, 34, 29, 0.18);
        border-radius: 3px;
        padding: 0 4px;
        color: #6e1a16;
      }
      .cb-md-paper pre {
        background: rgba(41, 34, 29, 0.07);
        border: 1px solid rgba(41, 34, 29, 0.2);
        border-radius: 4px;
        padding: 10px 12px;
        overflow-x: auto;
        margin: 8px 0;
      }
      .cb-md-paper pre code {
        background: none;
        border: none;
        padding: 0;
        color: #29221d;
      }
      .cb-md-paper table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 11px;
      }
      .cb-md-paper th,
      .cb-md-paper td {
        border: 1px solid #9f927c;
        padding: 5px 8px;
        text-align: left;
      }
      .cb-md-paper thead th {
        font-family: var(--mono, "Courier New", Courier, monospace);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 10px;
        color: #6e1a16;
        background: rgba(41, 34, 29, 0.06);
      }
      .cb-md-paper a {
        color: var(--red-dim, #8c2620);
        text-decoration: underline;
      }
      .cb-md-paper del {
        color: #5c5142;
      }
    `}</style>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);
