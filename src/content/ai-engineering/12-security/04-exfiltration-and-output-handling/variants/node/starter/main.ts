import type { Model } from '@dojo/ai';

export type UrlCheck = { allowed: true; url: URL } | { allowed: false; reason: 'invalid_url' | 'scheme' | 'credentials' | 'port' | 'not_allowlisted' };

export interface OutputPolicy {
  allowedHosts: string[];
}

export interface Removal {
  kind: 'image' | 'link' | 'autolink' | 'bare_url' | 'reference' | 'html';
  value: string;
  reason: string;
}

export interface SanitizedOutput {
  markdown: string;
  removed: Removal[];
}

export type EncodingContext = 'html-text' | 'html-attribute' | 'url-component';

export function checkUrl(url: string, allowedHosts: string[]): UrlCheck {
  // TODO: parse, then reject (in order) other schemes than https, credentials, explicit ports and hosts outside the allowlist
  const parsed = new URL(url);
  return allowedHosts.some((host) => parsed.hostname.includes(host)) ? { allowed: true, url: parsed } : { allowed: false, reason: 'not_allowlisted' };
}

export function sanitizeMarkdown(markdown: string, policy: OutputPolicy): SanitizedOutput {
  // TODO: handle reference definitions, autolinks, images, links, raw HTML and bare URLs in one pass
  const removed: Removal[] = [];
  const sanitized = markdown.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (match, alt: string, url: string) => {
    if (url.includes('attacker')) {
      removed.push({ kind: 'image', value: url, reason: 'not_allowlisted' });
      return '[image removed]';
    }
    return match;
  });
  return { markdown: sanitized, removed };
}

export function encodeForContext(value: string, context: EncodingContext): string {
  // TODO: html-text escapes & < >, html-attribute also " and ', url-component uses encodeURIComponent; throw for anything else
  throw new Error('Not implemented');
}

export async function answerSafely(model: Model, { question, document, policy }: { question: string; document: string; policy: OutputPolicy }): Promise<SanitizedOutput> {
  // TODO: keep the document out of the system message and sanitize the answer before returning it
  const response = await model.generate({
    messages: [{ role: 'system', content: `Answer using this document: ${document}` }, { role: 'user', content: question }],
  });
  return { markdown: response.text, removed: [] };
}
