const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

const catalog = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

function products() {
  return modules['features/products/index.js'];
}

function renderCatalog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { ProductCatalog } = products();
  render(
    <QueryClientProvider client={client}>
      <ProductCatalog />
    </QueryClientProvider>,
  );
  return client;
}

function productNames() {
  return within(screen.getByRole('list', { name: 'Products' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent.replace(/ \(.*$/, ''));
}

test('productQueries keys are hierarchical (list and detail start with all().queryKey) and detail loads /api/products/{id}', async () => {
  const { productQueries } = products();
  const root = productQueries.all().queryKey;
  expect(root).toEqual(['products']);
  const listKey = productQueries.list('mo').queryKey;
  const detailKey = productQueries.detail(3).queryKey;
  expect(listKey.slice(0, root.length)).toEqual(root);
  expect(detailKey.slice(0, root.length)).toEqual(root);
  expect(listKey).not.toEqual(productQueries.list('key').queryKey);
  expect(detailKey).not.toEqual(productQueries.detail(4).queryKey);
  expect(detailKey).toContain(3);
  expect(productQueries.list('mo').queryFn).toBeTypeOf('function');
  const requestedPaths = [];
  mockApi('/api/products/3', ({ url }) => {
    requestedPaths.push(url.pathname);
    return catalog[2];
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await expect(client.fetchQuery(productQueries.detail(3))).resolves.toEqual(catalog[2]);
  expect(requestedPaths).toEqual(['/api/products/3']);
});

test('apiGet returns parsed JSON and throws an ApiError carrying the status for /api/error', async () => {
  const { apiGet, ApiError } = modules['shared/api/client.js'];
  await expect(apiGet('/products?q=mouse')).resolves.toEqual([catalog[1]]);
  const error = await apiGet('/error').then(
    () => null,
    (rejection) => rejection,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toBeInstanceOf(Error);
  expect(error.status).toBe(500);
  expect(error.name).toBe('ApiError');
});

test('ProductCatalog lists products, filters them with the search box and caches them under list(searchTerm)', async () => {
  const client = renderCatalog();
  await waitFor(() => expect(productNames()).toHaveLength(5));
  await user.type(screen.getByLabelText('Search products'), 'mo');
  await waitFor(() => expect(productNames()).toEqual(['Mouse', 'Monitor']));
  expect(client.getQueryData(products().productQueries.list('mo').queryKey)).toHaveLength(2);
});

test('invalidating productQueries.all().queryKey refetches the visible list', async () => {
  let requestCount = 0;
  mockApi('/api/products', () => {
    requestCount += 1;
    return catalog;
  });
  const client = renderCatalog();
  await waitFor(() => expect(productNames()).toHaveLength(5));
  expect(requestCount).toBe(1);
  await act(() => client.invalidateQueries({ queryKey: products().productQueries.all().queryKey }));
  expect(requestCount).toBe(2);
});

test('the Refresh button refetches and a failed request shows the ApiError status in an alert', async () => {
  let requestCount = 0;
  let failing = false;
  mockApi('/api/products', () => {
    requestCount += 1;
    return failing ? jsonResponse({ error: 'Service unavailable' }, 503) : catalog;
  });
  renderCatalog();
  await waitFor(() => expect(productNames()).toHaveLength(5));
  failing = true;
  await user.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load products (status 503)');
  expect(requestCount).toBe(2);
});

test('only shared/api/client.js calls fetch: App.jsx and the feature go through productQueries', () => {
  Object.entries(sources)
    .filter(([fileName]) => fileName !== 'shared/api/client.js')
    .forEach(([fileName, code]) => {
      expect([fileName, /\bfetch\s*\(/.test(code)]).toEqual([fileName, false]);
    });
  expect(sources['features/products/api.js']).toMatch(/queryOptions\s*\(/);
  expect(sources['features/products/api.js']).toMatch(/apiGet\s*\(/);
  expect(sources['features/products/ProductCatalog.jsx']).toMatch(/useQuery\s*\(\s*productQueries\.list\s*\(/);
});
