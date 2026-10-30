import { createRoot } from 'react-dom/client';
import App from './App';

export function readEmbeddedCatalog(container) {
  // TODO: parse the JSON inside #catalog-data
  return { products: [], count: 0 };
}

export function hydrate(container) {
  // TODO: attach to the server HTML in #root with hydrateRoot instead of rebuilding it
  const root = createRoot(container.querySelector('#root'));
  root.render(<App catalog={readEmbeddedCatalog(container)} />);
  return root;
}
