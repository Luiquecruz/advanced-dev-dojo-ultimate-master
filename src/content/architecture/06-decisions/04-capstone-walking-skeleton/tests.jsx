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

function filesWithDeepCatalogImports() {
  const deepImport = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/|\/)*features\/catalog\/(?!index(\.js)?['"])[^'"]+['"]/;
  return Object.entries(sources)
    .filter(([path, code]) => !path.startsWith('features/catalog/') && deepImport.test(code))
    .map(([path]) => path);
}

function adrsByLayer() {
  return Object.fromEntries(modules['decisions/adrs.js'].adrs.map((adr) => [adr.layer, adr]));
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
  expect(filesWithDeepCatalogImports()).toEqual([]);
});

test('decisions/adrs.js holds four accepted ADRs, one per layer, whose consequences name a cost, and tradeoffs lists what was left out and the risks', () => {
  const { adrs } = modules['decisions/adrs.js'];
  expect(adrs).toHaveLength(4);
  expect(adrs.map((adr) => adr.layer).sort()).toEqual(['organization', 'rendering', 'scale', 'state']);
  expect(new Set(adrs.map((adr) => adr.id)).size).toBe(4);
  const costWords = /\b(costs?|slower|harder|risks?|must|cannot|trade-offs?|downsides?|requires?|lose|lost|higher)\b/i;
  adrs.forEach((adr) => {
    expect(adr).toEqual(expect.objectContaining({ status: 'accepted', supersedes: null, supersededBy: null }));
    expect(`${adr.layer} title: ${adr.title.trim().length > 0}`).toBe(`${adr.layer} title: true`);
    ['context', 'decision', 'consequences'].forEach((field) => {
      expect(`${adr.layer} ${field}: ${adr[field].trim().length >= 20}`).toBe(`${adr.layer} ${field}: true`);
    });
    expect(adr.consequences).toMatch(costWords);
  });
  const { tradeoffs } = modules['decisions/tradeoffs.js'];
  expect(tradeoffs.outOfScope.length).toBeGreaterThan(0);
  expect(tradeoffs.risks.length).toBeGreaterThan(0);
  [...tradeoffs.outOfScope, ...tradeoffs.risks].forEach((entry) => {
    expect(entry.trim().length).toBeGreaterThanOrEqual(10);
  });
});

test('the ADRs match the code: SSR with hydration, feature public APIs, BFF data embedded with local UI state, one deploy without micro-frontends', () => {
  const { rendering, organization, state, scale } = adrsByLayer();
  expect(rendering.decision).toMatch(/\bSSR\b|server[- ]side render|server[- ]render/i);
  expect(rendering.decision).toMatch(/hydrat/i);
  expect(sources['server/render.jsx']).toMatch(/renderToString\s*\(/);
  expect(sources['client.jsx']).toMatch(/hydrateRoot\s*\(/);
  expect(organization.decision).toMatch(/feature/i);
  expect(organization.decision).toMatch(/public API|index/i);
  expect(filesWithDeepCatalogImports()).toEqual([]);
  expect(state.decision).toMatch(/\bBFF\b|view model/i);
  expect(state.decision).toMatch(/embed/i);
  expect(state.decision).toMatch(/\blocal|useState/i);
  expect(sources['features/catalog/ProductList.jsx']).toMatch(/useState\s*\(/);
  const globalStoreImport = /from\s*['"](zustand|jotai|redux|@reduxjs\/toolkit|react-redux|mobx|valtio|@tanstack\/react-query)/;
  expect(Object.keys(sources).filter((path) => globalStoreImport.test(sources[path]))).toEqual([]);
  expect(scale.decision).toMatch(/\b(no|not|without|rejects?|rejected|instead of|rather than|avoids?)\b[^.]*micro-?frontends?/i);
  expect(scale.decision).toMatch(/\bBFF\b/);
  expect(scale.decision).toMatch(/\b(because|since)\b/i);
});
