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

async function listProducts(searchParams) {
  const query = searchParams.get('q') ?? '';
  const products = await findProducts(query);
  return renderPage(200, 'Products', <ProductListView products={products} query={query} />);
}

async function showProduct(id) {
  const product = await findProductById(id);
  if (!product) {
    return notFound();
  }
  return renderPage(200, product.name, <ProductDetailView product={product} />);
}

export async function handleRequest(url) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const path = pathname.replace(/\/+$/, '');

  if (path === '/products') {
    return listProducts(searchParams);
  }
  const detailMatch = path.match(/^\/products\/(\d+)$/);
  if (detailMatch) {
    return showProduct(detailMatch[1]);
  }
  return notFound();
}
