import { renderToStaticMarkup } from 'react-dom/server';
import { findProductById, findProducts } from './models/product';
import { Layout } from './views/Layout';
import { NotFoundView } from './views/NotFoundView';
import { ProductDetailView } from './views/ProductDetailView';
import { ProductListView } from './views/ProductListView';

function renderPage(status, title, view) {
  return { status, html: `<!DOCTYPE html>${renderToStaticMarkup(<Layout title={title}>{view}</Layout>)}` };
}

function notFound() {
  return renderPage(404, 'Not found', <NotFoundView />);
}

export async function handleRequest(url) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');

  if (pathname === '/products') {
    const products = await findProducts('');
    return renderPage(200, 'Products', <ProductListView products={products} query="" />);
  }
  // TODO: pass the "q" search param to the model and to the view
  // TODO: route /products/:id to ProductDetailView, 404 when the product does not exist
  return notFound();
}
