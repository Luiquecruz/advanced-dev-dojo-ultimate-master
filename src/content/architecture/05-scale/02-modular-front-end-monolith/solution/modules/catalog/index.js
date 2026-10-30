import { CatalogPage } from './CatalogPage';

export function register(shell) {
  shell.addPage({ path: '/catalog', title: 'Catalog', Component: CatalogPage });
}
