const expectedProducts = [
  { id: 1, name: 'Keyboard', priceLabel: '$120.00' },
  { id: 2, name: 'Mouse', priceLabel: '$45.00' },
  { id: 3, name: 'IDE License', priceLabel: '$199.00' },
  { id: 4, name: 'Monitor', priceLabel: '$340.00' },
  { id: 5, name: 'Cloud Credits', priceLabel: '$50.00' },
];

function handleRequest(url) {
  return modules['server/render.jsx'].handleRequest(url);
}

function mountServerHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

function embeddedCatalog(html) {
  const element = new DOMParser().parseFromString(html, 'text/html').getElementById('catalog-data');
  expect(element).not.toBeNull();
  expect(element.getAttribute('type')).toBe('application/json');
  return JSON.parse(element.textContent);
}

test('the BFF returns a view model with only id, name and priceLabel per product, plus the count', async () => {
  const viewModel = await modules['server/bff.js'].getCatalogViewModel();
  expect(viewModel).toEqual({ products: expectedProducts, count: 5 });
});

test('handleRequest("/") answers 200 with a document whose #root holds the rendered catalog', async () => {
  const response = await handleRequest('/');
  expect(response.status).toBe(200);
  expect(response.html).toMatch(/^<!DOCTYPE html>/i);
  const root = mountServerHtml(response.html).querySelector('#root');
  expect(root).not.toBeNull();
  expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent('Dev Dojo Store');
  expect(root).toHaveTextContent('5 products');
  const items = within(root).getAllByRole('listitem');
  expect(items).toHaveLength(5);
  expect(items[0]).toHaveTextContent('Keyboard');
  expect(items[0]).toHaveTextContent('$120.00');
  expect(embeddedCatalog(response.html)).toEqual({ products: expectedProducts, count: 5 });
});

test('the embedded JSON escapes "<" so data cannot close the script tag', async () => {
  const hostileName = '</script><script>window.hacked = true</script>';
  mockApi('/api/products', [{ id: 9, name: hostileName, price: 10, category: 'hardware' }]);
  const { html } = await handleRequest('/');
  expect(html).not.toContain('</script><script>window.hacked');
  expect(html).toContain('\\u003c/script>');
  expect(embeddedCatalog(html)).toEqual({ products: [{ id: 9, name: hostileName, priceLabel: '$10.00' }], count: 1 });
});

test('hydrate reuses the server DOM without mismatches and makes the catalog interactive', async () => {
  const { html } = await handleRequest('/');
  const container = mountServerHtml(html);
  const serverButton = within(container).getByRole('button', { name: 'Add Keyboard to cart' });
  const original = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let root;
  try {
    await act(async () => {
      root = modules['client.jsx'].hydrate(container);
    });
  } finally {
    console.error = original;
  }
  expect(errors.filter((message) => /hydrat|did(n't| not) match/i.test(message))).toEqual([]);
  expect(within(container).getByRole('button', { name: 'Add Keyboard to cart' })).toBe(serverButton);
  await user.click(serverButton);
  expect(within(container).getByRole('status')).toHaveTextContent('Cart items: 1');
  await user.type(within(container).getByLabelText('Filter products'), 'mo');
  expect(within(container).getAllByRole('listitem')).toHaveLength(2);
  act(() => root.unmount());
});

test('unknown paths answer 404 without calling the API, and a failing products API answers 502', async () => {
  let productRequests = 0;
  mockApi('/api/products', () => {
    productRequests += 1;
    return jsonResponse({ error: 'Service down' }, 500);
  });
  const missing = await handleRequest('/admin/reports');
  expect(missing.status).toBe(404);
  expect(within(mountServerHtml(missing.html)).getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  expect(productRequests).toBe(0);
  const failing = await handleRequest('/');
  expect(failing.status).toBe(502);
  expect(within(mountServerHtml(failing.html)).getByRole('heading', { level: 1 })).toHaveTextContent('Catalog unavailable');
  expect(productRequests).toBe(1);
});

test('code outside features/catalog reaches the feature only through its public index', () => {
  expect(typeof modules['features/catalog/index.js'].ProductList).toBe('function');
  expect(sources['App.jsx']).toMatch(/from\s+['"]\.\/features\/catalog(\/index(\.js)?)?['"]/);
  const deepImport = /['"](\.{1,2}\/|\/)*features\/catalog\/(?!index(\.js)?['"])[^'"]+['"]/;
  Object.entries(sources)
    .filter(([path]) => !path.startsWith('features/catalog/'))
    .forEach(([path, code]) => {
      expect(`${path}: ${deepImport.test(code)}`).toBe(`${path}: false`);
    });
});
