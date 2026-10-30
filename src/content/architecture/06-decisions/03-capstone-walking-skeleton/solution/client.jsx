import { hydrateRoot } from 'react-dom/client';
import App from './App';

export function readEmbeddedCatalog(container) {
  return JSON.parse(container.querySelector('#catalog-data').textContent);
}

export function hydrate(container) {
  const catalog = readEmbeddedCatalog(container);
  return hydrateRoot(container.querySelector('#root'), <App catalog={catalog} />);
}
