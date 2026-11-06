const { createMemoryRouter, RouterProvider } = require('react-router');

function renderAt(url) {
  const router = createMemoryRouter([{ path: '/products', element: <mod.ProductCatalog /> }], { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

const names = () => screen.getAllByRole('listitem').map((item) => item.textContent);
const param = (router, key) => new URLSearchParams(router.state.location.search).get(key);

test('reads the filters from the URL on first render (deep link)', async () => {
  renderAt('/products?category=software&sort=price-desc');
  expect(await screen.findByTestId('result-count')).toHaveTextContent('2 products');
  expect(names()).toEqual(['IDE License', 'Cloud Credits']);
  expect(screen.getByLabelText('Category')).toHaveValue('software');
  expect(screen.getByLabelText('Sort by')).toHaveValue('price-desc');
});

test('parseFilters falls back to defaults for missing or invalid values', () => {
  expect(mod.parseFilters(new URLSearchParams('category=toys&sort=random&q=key'))).toEqual({ q: 'key', category: 'all', sort: 'name' });
  expect(mod.parseFilters(new URLSearchParams(''))).toEqual({ q: '', category: 'all', sort: 'name' });
  expect(mod.parseFilters(new URLSearchParams('category=hardware&sort=price-asc'))).toEqual({ q: '', category: 'hardware', sort: 'price-asc' });
});

test('changing the category pushes a history entry and removes default values from the URL', async () => {
  const router = renderAt('/products');
  await user.selectOptions(await screen.findByLabelText('Category'), 'hardware');
  await waitFor(() => expect(router.state.location.search).toBe('?category=hardware'));
  expect(router.state.historyAction).toBe('PUSH');
  expect(names()).toEqual(['Keyboard', 'Monitor', 'Mouse']);
  await user.selectOptions(screen.getByLabelText('Category'), 'all');
  await waitFor(() => expect(router.state.location.search).toBe(''));
});

test('typing in Search replaces the history entry and keeps the other params', async () => {
  const router = renderAt('/products?category=hardware');
  await user.type(await screen.findByLabelText('Search'), 'mo');
  await waitFor(() => expect(param(router, 'q')).toBe('mo'));
  expect(param(router, 'category')).toBe('hardware');
  expect(router.state.historyAction).toBe('REPLACE');
  expect(names()).toEqual(['Monitor', 'Mouse']);
});

test('the back button restores the previous filters', async () => {
  const router = renderAt('/products');
  await user.selectOptions(await screen.findByLabelText('Category'), 'software');
  await user.selectOptions(screen.getByLabelText('Sort by'), 'price-asc');
  await waitFor(() => expect(names()).toEqual(['Cloud Credits', 'IDE License']));
  await act(() => router.navigate(-1));
  await waitFor(() => expect(screen.getByLabelText('Sort by')).toHaveValue('name'));
  expect(screen.getByLabelText('Category')).toHaveValue('software');
  expect(names()).toEqual(['Cloud Credits', 'IDE License']);
});

test('"Clear filters" empties the query string and resets every control', async () => {
  const router = renderAt('/products?q=o&category=hardware&sort=price-desc');
  await user.click(await screen.findByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(router.state.location.search).toBe(''));
  expect(screen.getByLabelText('Search')).toHaveValue('');
  expect(screen.getByLabelText('Category')).toHaveValue('all');
  expect(screen.getByTestId('result-count')).toHaveTextContent('5 products');
});
