/**
 * Python lessons not yet rewritten to the no-bridge template (02-content-standards.md), with the rules each one still breaks.
 * The rewrite of a lesson removes its entry in the same change; an entry whose lesson no longer breaks a listed rule fails
 * pythonConventions.test.ts, so the list only shrinks and must be empty when the last rewrite lands.
 */
export const PYTHON_PENDING_REWRITE: Record<string, readonly string[]> = {};

/**
 * Track and module texts (`track.json` and `module.json` titles and descriptions) that still compare with another language, keyed
 * `track:<track id>` or `module:<track id>/<module id>`. The same rules as above: fix the text, remove the entry, and a stale entry fails.
 */
export const PYTHON_PENDING_HEADERS: Record<string, readonly string[]> = {};
