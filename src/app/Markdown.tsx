import { useMemo } from 'react';
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  html: 'xml',
  vue: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'css',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  json: 'json',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = LANGUAGE_ALIASES[(lang ?? '').toLowerCase()];
      const html = language ? hljs.highlight(text, { language }).value : escapeHtml(text);
      const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
      return `<pre class="code-block">${label}<code class="hljs">${html}</code></pre>`;
    },
    link({ href, text }) {
      return `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>`;
    },
  },
});

/**
 * Renders trusted course Markdown with syntax highlighting.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => marked.parse(source) as string, [source]);
  return <div className={`markdown ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Renders inline Markdown (no paragraphs).
 */
export function InlineMarkdown({ source }: { source: string }) {
  const html = useMemo(() => marked.parseInline(source) as string, [source]);
  return <span className="markdown-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
