const { renderToStaticMarkup } = require('react-dom/server');

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function productLinks(document) {
  return [...document.querySelectorAll('main li a')].map((link) => [link.textContent, link.getAttribute('href')]);
}

test('/products renders a full HTML document listing every product with a link to its page', async () => {
  const response = await mod.handleRequest('/products');
  expect(response.status).toBe(200);
  expect(response.html.startsWith('<!DOCTYPE html>')).toBe(true);
  const document = parse(response.html);
  expect(document.title).toBe('Products');
  expect(document.querySelector('main h1').textContent).toBe('Products');
  expect(productLinks(document)).toEqual([
    ['Keyboard', '/products/1'],
    ['Mouse', '/products/2'],
    ['IDE License', '/products/3'],
    ['Monitor', '/products/4'],
    ['Cloud Credits', '/products/5'],
  ]);
  expect(document.querySelector('main li').textContent).toBe('Keyboard $120');
});

test('/products?q= asks the model for matching products and keeps the query in a GET search form', async () => {
  const queries = [];
  mockApi('/api/products', ({ url }) => {
    queries.push(url.searchParams.get('q'));
    return [{ id: 2, name: 'Mouse', price: 45, category: 'hardware' }, { id: 4, name: 'Monitor', price: 340, category: 'hardware' }];
  });
  const response = await mod.handleRequest('/products?q=mo');
  expect(queries).toEqual(['mo']);
  const document = parse(response.html);
  expect(productLinks(document).map(([name]) => name)).toEqual(['Mouse', 'Monitor']);
  const form = document.querySelector('main form');
  expect(form.getAttribute('method')).toBe('get');
  expect(form.getAttribute('action')).toBe('/products');
  const input = form.querySelector('input[name="q"]');
  expect(input.getAttribute('aria-label')).toBe('Search products');
  expect(input.getAttribute('value')).toBe('mo');
});

test('an empty search shows a message and escapes the query', async () => {
  const response = await mod.handleRequest('/products?q=%3Cscript%3Ezzz');
  expect(response.status).toBe(200);
  expect(response.html).not.toContain('<script>zzz');
  const document = parse(response.html);
  expect(document.querySelector('main ul')).toBeNull();
  expect(document.querySelector('main p').textContent).toBe('No products match "<script>zzz".');
});

test('/products/:id renders the product detail page', async () => {
  const response = await mod.handleRequest('/products/4');
  expect(response.status).toBe(200);
  const document = parse(response.html);
  expect(document.title).toBe('Monitor');
  expect(document.querySelector('main h1').textContent).toBe('Monitor');
  expect(document.querySelector('main').textContent).toContain('Price: $340');
  expect(document.querySelector('main').textContent).toContain('Category: hardware');
  expect(document.querySelector('main a[href="/products"]')).not.toBeNull();
});

test('unknown products and unknown routes answer 404 with the Not found view', async () => {
  for (const url of ['/products/99', '/checkout', '/products/abc']) {
    const response = await mod.handleRequest(url);
    expect(response.status).toBe(404);
    expect(parse(response.html).querySelector('main h1').textContent).toBe('Not found');
  }
});

test('views only receive data and only the model talks to the API', () => {
  mockApi(/.*/, () => {
    throw new Error('views must not fetch');
  });
  const ProductListView = modules['views/ProductListView.jsx'].ProductListView;
  const ProductDetailView = modules['views/ProductDetailView.jsx'].ProductDetailView;
  const listHtml = renderToStaticMarkup(<ProductListView products={[{ id: 7, name: 'Desk', price: 300, category: 'office' }]} query="" />);
  expect(listHtml).toContain('<a href="/products/7">Desk</a>');
  const detailHtml = renderToStaticMarkup(<ProductDetailView product={{ id: 7, name: 'Desk', price: 300, category: 'office' }} />);
  expect(detailHtml).toContain('<h1>Desk</h1>');
  for (const file of ['views/ProductListView.jsx', 'views/ProductDetailView.jsx', 'controller.jsx']) {
    expect(sources[file]).not.toMatch(/\bfetch\s*\(|\buse(Effect|State)\b/);
  }
  expect(sources['models/product.js']).toMatch(/fetch\s*\(/);
});
