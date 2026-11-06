/** When the page last reloaded for a chunk that failed to load, kept in `sessionStorage`. */
const CHUNK_RELOAD_KEY = 'constela:chunk-reload';

/** A second chunk error within this window after a reload is reported instead of reloading again. */
const CHUNK_RELOAD_WINDOW_MS = 60000;

/**
 * Whether a chunk that failed to load should reload the page: true unless the page already reloaded for that reason within the
 * window, so a tab opened before a deploy (whose old chunks are gone) recovers and a chunk that is really missing reaches Sentry.
 */
export function shouldReloadForChunk(lastReloadAt: number | undefined, now: number): boolean {
  return lastReloadAt === undefined || now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS;
}

function readLastReload(): number | undefined {
  try {
    const value = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    return value === null ? undefined : Number(value);
  } catch {
    return undefined;
  }
}

function writeLastReload(now: number): boolean {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reloads the page once when Vite fails to load a lazy chunk (`vite:preloadError`), the usual result of a deploy while the tab was
 * open. Without `sessionStorage` it never reloads, so it cannot loop; the error then reaches Sentry.
 */
export function installChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    const now = Date.now();
    if (!shouldReloadForChunk(readLastReload(), now) || !writeLastReload(now)) {
      return;
    }
    event.preventDefault();
    location.reload();
  });
}
