function loadServerPage(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.body.append(parsed.getElementById('root'), parsed.getElementById('__DATA__'));
  return document.getElementById('root');
}

function productNames(container) {
  return within(container)
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace(/ \$\d+$/, ''));
}

test('handleRequest renders the products on the server inside #root of a full HTML document', async () => {
  const response = await mod.handleRequest('/products');
  expect(response.status).toBe(200);
  expect(response.html.startsWith('<!DOCTYPE html>')).toBe(true);
  const container = loadServerPage(response.html);
  expect(within(container).getByRole('heading', { level: 1 })).toHaveTextContent('Products');
  expect(productNames(container)).toEqual(['Keyboard', 'Mouse', 'IDE License', 'Monitor', 'Cloud Credits']);
});

test('the fetched data is serialized in <script id="__DATA__" type="application/json">', async () => {
  const response = await mod.handleRequest('/products');
  const script = new DOMParser().parseFromString(response.html, 'text/html').getElementById('__DATA__');
  expect(script).not.toBeNull();
  expect(script.getAttribute('type')).toBe('application/json');
  expect(JSON.parse(script.textContent).map((product) => product.name)).toEqual(['Keyboard', 'Mouse', 'IDE License', 'Monitor', 'Cloud Credits']);
});

test('the serialized data is escaped so a product name cannot close the script tag', async () => {
  const attack = '</script><script>alert(1)</script>';
  mockApi('/api/products', [{ id: 9, name: attack, price: 1, category: 'hardware' }]);
  const response = await mod.handleRequest('/products');
  expect(response.html).not.toContain('</script><script>alert(1)');
  expect(response.html).toContain('\\u003c/script>');
  expect(mod.serializeData({ name: '<b>' })).toBe('{"name":"\\u003cb>"}');
  const script = new DOMParser().parseFromString(response.html, 'text/html').getElementById('__DATA__');
  expect(JSON.parse(script.textContent)[0].name).toBe(attack);
});

test('hydrate reuses the server DOM, makes the button interactive and does not refetch', async () => {
  const response = await mod.handleRequest('/products');
  const container = loadServerPage(response.html);
  const serverButton = within(container).getByRole('button', { name: 'Sort by price' });
  const serverList = within(container).getByRole('list', { name: 'Products' });
  const clientRequests = [];
  mockApi('/api/', ({ url }) => {
    clientRequests.push(url.pathname);
    return [];
  });
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let root;
  try {
    await act(async () => {
      root = mod.hydrate(container);
    });
    await sleep(20);
  } finally {
    console.error = originalError;
  }
  expect(errors.filter((message) => /hydrat|did(n't| not) match/i.test(message))).toEqual([]);
  expect(within(container).getByRole('button', { name: 'Sort by price' })).toBe(serverButton);
  expect(within(container).getByRole('list', { name: 'Products' })).toBe(serverList);
  await user.click(serverButton);
  expect(serverButton).toHaveAttribute('aria-pressed', 'true');
  expect(productNames(container)).toEqual(['Mouse', 'Cloud Credits', 'Keyboard', 'IDE License', 'Monitor']);
  expect(clientRequests).toEqual([]);
  act(() => root.unmount());
});

test('uses renderToString on the server and hydrateRoot on the client', () => {
  expect(source).toMatch(/renderToString\s*\(/);
  expect(source).toMatch(/hydrateRoot\s*\(/);
  expect(source).not.toMatch(/createRoot\s*\(/);
});
