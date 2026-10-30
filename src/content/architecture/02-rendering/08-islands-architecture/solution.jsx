import { useEffect, useRef, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

export function Counter({ label, start = 0 }) {
  const [count, setCount] = useState(start);
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      {label}: {count}
    </button>
  );
}

export function Disclosure({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {title}
      </button>
      {open && <p>{body}</p>}
    </section>
  );
}

export const islandComponents = { Counter, Disclosure };

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

export function renderIsland(name, props) {
  const Component = islandComponents[name];
  const html = renderToString(<Component {...props} />);
  return `<div data-island="${name}" data-props="${escapeAttribute(JSON.stringify(props))}">${html}</div>`;
}

export function renderPage() {
  return [
    '<article>',
    '<h1>Mechanical keyboard</h1>',
    '<p class="description">A 75% board with hot-swappable switches and a "quiet" mode.</p>',
    renderIsland('Counter', { label: 'Likes', start: 3 }),
    renderIsland('Counter', { label: 'Shares', start: 0 }),
    '<p class="specifications">Weight: 980 g. Cable: USB-C.</p>',
    renderIsland('Disclosure', { title: 'Shipping details', body: 'Ships in 2 days from Lisbon & Porto.' }),
    '<footer>Static footer, no JavaScript</footer>',
    '</article>',
  ].join('');
}

export function hydrateIslands(root, components) {
  const islands = [...root.querySelectorAll('[data-island]')];
  const unknownIsland = islands.find((island) => !components[island.dataset.island]);
  if (unknownIsland) {
    throw new Error(`Unknown island "${unknownIsland.dataset.island}"`);
  }
  return islands.map((island) => {
    const Component = components[island.dataset.island];
    const props = JSON.parse(island.dataset.props);
    return hydrateRoot(island, <Component {...props} />);
  });
}

export default function IslandsPreview() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    container.innerHTML = renderPage();
    const roots = hydrateIslands(container, islandComponents);
    return () => setTimeout(() => roots.forEach((root) => root.unmount()));
  }, []);

  return <div ref={containerRef} />;
}
