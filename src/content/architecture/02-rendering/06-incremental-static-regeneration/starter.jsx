export function createIsrServer({ render, revalidateSeconds, now = () => Date.now() }) {
  const pages = new Map();

  async function get(path) {
    // TODO: serve the cached page while it is fresh ('HIT')
    // TODO: after revalidateSeconds, serve the stale page ('STALE') and regenerate it in the background, only once at a time
    // TODO: keep the last good page when a regeneration fails
    const html = await render(path);
    pages.set(path, { html, generatedAt: now() });
    return { html, cache: 'MISS' };
  }

  function revalidatePath(path) {
    // TODO: mark the cached page as stale so the next request regenerates it
  }

  return { get, revalidatePath };
}
