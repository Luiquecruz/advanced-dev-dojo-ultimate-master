async function serverRender() {
  const { html, dehydratedState } = await mod.renderOnServer();
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  return { container, html, serializedState: JSON.parse(JSON.stringify(dehydratedState)) };
}

function countProductRequests() {
  const requests = [];
  mockApi('/api/products', ({ url }) => {
    requests.push(url.pathname);
    return [{ id: 2, name: 'Mouse', price: 45, category: 'hardware' }];
  });
  return requests;
}

async function hydrate(container, serializedState) {
  let root;
  await act(async () => {
    root = mod.hydrateOnClient(container, serializedState);
  });
  await act(() => sleep(60));
  return root;
}

test('renderOnServer returns HTML that already lists the products, plus the dehydrated cache', async () => {
  const { html, serializedState } = await serverRender();
  expect(typeof html).toBe('string');
  expect(html).toContain('Keyboard');
  expect(html).toContain('Cloud Credits');
  expect(html).not.toContain('Loading products...');
  const productsQuery = serializedState.queries.find((query) => JSON.stringify(query.queryKey) === '["products"]');
  expect(productsQuery.state.data).toHaveLength(5);
});

test('hydrateOnClient reuses the dehydrated cache: no /api/products request and no hydration errors', async () => {
  const { container, serializedState } = await serverRender();
  const requests = countProductRequests();
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let root;
  try {
    root = await hydrate(container, serializedState);
  } finally {
    console.error = originalError;
  }
  expect(requests).toEqual([]);
  expect(errors.filter((message) => /hydrat|did(n't| not) match/i.test(message))).toEqual([]);
  expect(within(container).getAllByRole('listitem')).toHaveLength(5);
  act(() => root.unmount());
});

test('hydration adopts the server DOM nodes and makes them interactive', async () => {
  const { container, serializedState } = await serverRender();
  const serverButton = within(container).getByRole('button', { name: 'Add Keyboard' });
  const serverCount = within(container).getByTestId('cart-count');
  const root = await hydrate(container, serializedState);
  await user.click(serverButton);
  await user.click(serverButton);
  expect(serverCount).toHaveTextContent('Cart: 2');
  expect(within(container).getByRole('button', { name: 'Add Keyboard' })).toBe(serverButton);
  act(() => root.unmount());
});

test('the server HTML is inert until hydrateOnClient runs', async () => {
  const { container } = await serverRender();
  await user.click(within(container).getByRole('button', { name: 'Add Mouse' }));
  expect(within(container).getByTestId('cart-count')).toHaveTextContent('Cart: 0');
});

test('each server render gets its own QueryClient: one request does not leak into the next', async () => {
  const first = await mod.renderOnServer();
  expect(first.html).toContain('Keyboard');
  const requests = countProductRequests();
  const second = await mod.renderOnServer();
  expect(requests).toEqual(['/api/products']);
  expect(second.html).toContain('Mouse');
  expect(second.html).not.toContain('Keyboard');
  const secondData = second.dehydratedState.queries.find((query) => query.queryKey[0] === 'products').state.data;
  expect(secondData).toHaveLength(1);
  expect(second.dehydratedState).not.toBe(first.dehydratedState);
});

test('uses prefetchQuery and dehydrate on the server, HydrationBoundary and hydrateRoot on the client', () => {
  expect(source).toMatch(/prefetchQuery\s*\(/);
  expect(source).toMatch(/dehydrate\s*\(/);
  expect(source).toMatch(/<HydrationBoundary\b|\bhydrate\s*\(/);
  expect(source).toMatch(/hydrateRoot\s*\(/);
});
