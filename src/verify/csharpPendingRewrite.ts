/**
 * C# lessons not yet rewritten to the no-bridge template (.claude/docs/csharp-track/06-content-standards.md), with the rules each one
 * still breaks. The rewrite of a lesson removes its entry in the same change; an entry whose lesson no longer breaks a listed rule
 * fails csharp.test.ts, so the list only shrinks and must be empty when the last rewrite lands.
 */
export const CSHARP_PENDING_REWRITE: Record<string, readonly string[]> = {
  'csharp/csharp-map': ['theory-you-need', 'theory-no-coming-from', 'common-mistakes', 'no-php-bridge'],
};

/**
 * Track and module texts (`track.json` and `module.json` titles and descriptions) that still name PHP or Magento, keyed
 * `track:<track id>` or `module:<track id>/<module id>`. The same rules as above: fix the text, remove the entry, and a stale entry fails.
 */
export const CSHARP_PENDING_HEADERS: Record<string, readonly string[]> = {
  'track:csharp': ['no-php-bridge'],
};
