export function createIsrServer({ render, revalidateSeconds, now = () => Date.now() }) {
  const pages = new Map();
  const firstRenders = new Map();
  const regenerations = new Map();
  const revalidateMilliseconds = revalidateSeconds * 1000;

  function storePage(path, html) {
    pages.set(path, { html, generatedAt: now(), stale: false });
  }

  function isFresh(page) {
    return !page.stale && now() - page.generatedAt < revalidateMilliseconds;
  }

  function regenerate(path) {
    if (regenerations.has(path)) {
      return;
    }
    const regeneration = Promise.resolve()
      .then(() => render(path))
      .then((html) => storePage(path, html))
      .catch(() => {})
      .finally(() => regenerations.delete(path));
    regenerations.set(path, regeneration);
  }

  async function renderFirstTime(path) {
    if (!firstRenders.has(path)) {
      const firstRender = Promise.resolve()
        .then(() => render(path))
        .then((html) => {
          storePage(path, html);
          return html;
        })
        .finally(() => firstRenders.delete(path));
      firstRenders.set(path, firstRender);
    }
    return firstRenders.get(path);
  }

  async function get(path) {
    const page = pages.get(path);
    if (!page) {
      const html = await renderFirstTime(path);
      return { html, cache: 'MISS' };
    }
    if (isFresh(page)) {
      return { html: page.html, cache: 'HIT' };
    }
    regenerate(path);
    return { html: page.html, cache: 'STALE' };
  }

  function revalidatePath(path) {
    const page = pages.get(path);
    if (page) {
      page.stale = true;
    }
  }

  return { get, revalidatePath };
}
