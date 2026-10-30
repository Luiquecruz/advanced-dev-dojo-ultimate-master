const { createMemoryRouter, RouterProvider, MemoryRouter, useLocation } = require('react-router');

const catalogDefinition = {
  q: { type: 'string', default: '' },
  page: { type: 'number', default: 1, min: 1 },
  sort: { type: 'enum', values: ['price', 'name'], default: 'name' },
  tags: { type: 'list', default: [] },
};

function catalogSchema() {
  return modules['shared/url/createSearchSchema.js'].createSearchSchema(catalogDefinition);
}

function renderAt(url) {
  const { ProductSearchPage } = modules['features/products/ProductSearchPage.jsx'];
  const router = createMemoryRouter([{ path: '/products', element: <ProductSearchPage /> }], { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

function productNames() {
  return within(screen.getByRole('list', { name: 'Products' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent.replace(/ \(.*$/, ''));
}

test('parse coerces numbers, enums and lists and falls back to the default for missing or invalid values', () => {
  const schema = catalogSchema();
  expect(schema.parse(new URLSearchParams('q=key&page=3&sort=price&tags=b&tags=a&tags=b'))).toEqual({
    q: 'key',
    page: 3,
    sort: 'price',
    tags: ['a', 'b'],
  });
  expect(schema.parse(new URLSearchParams(''))).toEqual({ q: '', page: 1, sort: 'name', tags: [] });
  expect(schema.parse(new URLSearchParams('page=0&sort=random')).page).toBe(1);
  expect(schema.parse(new URLSearchParams('page=0&sort=random')).sort).toBe('name');
  expect(schema.parse(new URLSearchParams('page=abc')).page).toBe(1);
  expect(schema.parse(new URLSearchParams('page=2.5')).page).toBe(1);
  expect(schema.parse(new URLSearchParams('page=')).page).toBe(1);
});

test('serialize writes a canonical URL: defaults omitted, keys sorted, list items sorted, and it round-trips through parse', () => {
  const schema = catalogSchema();
  const state = { sort: 'price', q: 'mo', page: 1, tags: ['b', 'a'] };
  expect(schema.serialize(state).toString()).toBe('q=mo&sort=price&tags=a&tags=b');
  expect(schema.serialize({ tags: ['a'], page: 2, q: '' }).toString()).toBe('page=2&tags=a');
  expect(schema.serialize({ q: '', page: 1, sort: 'name', tags: [] }).toString()).toBe('');
  const canonical = schema.serialize(state);
  expect(schema.serialize(schema.parse(canonical)).toString()).toBe(canonical.toString());
  expect(schema.parse(canonical)).toEqual({ q: 'mo', page: 1, sort: 'price', tags: ['a', 'b'] });
});

test('ProductSearchPage reads its whole state from the URL on first render (deep link)', async () => {
  renderAt('/products?category=hardware&page=2&sort=price');
  expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
  expect(productNames()).toEqual(['Monitor']);
  expect(screen.getByRole('checkbox', { name: 'Hardware' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Software' })).not.toBeChecked();
  expect(screen.getByLabelText('Sort by')).toHaveValue('price');
});

test('sort and category changes push canonical URLs, typing in Search replaces the entry', async () => {
  const router = renderAt('/products');
  await user.selectOptions(await screen.findByLabelText('Sort by'), 'price');
  await waitFor(() => expect(router.state.location.search).toBe('?sort=price'));
  expect(router.state.historyAction).toBe('PUSH');
  await user.click(screen.getByRole('checkbox', { name: 'Software' }));
  await waitFor(() => expect(router.state.location.search).toBe('?category=software&sort=price'));
  expect(router.state.historyAction).toBe('PUSH');
  await user.type(screen.getByLabelText('Search'), 'o');
  await waitFor(() => expect(router.state.location.search).toBe('?category=software&q=o&sort=price'));
  expect(router.state.historyAction).toBe('REPLACE');
  expect(productNames()).toEqual(['Cloud Credits']);
});

test('changing a filter resets the page, paging keeps the filters, and back restores the previous page', async () => {
  const router = renderAt('/products?page=2');
  await waitFor(() => expect(productNames()).toEqual(['Keyboard', 'Monitor']));
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(router.state.location.search).toBe('?page=3'));
  expect(productNames()).toEqual(['Mouse']);
  await user.click(screen.getByRole('checkbox', { name: 'Hardware' }));
  await waitFor(() => expect(router.state.location.search).toBe('?category=hardware'));
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  await act(() => router.navigate(-1));
  await waitFor(() => expect(screen.getByText('Page 3 of 3')).toBeInTheDocument());
  expect(screen.getByRole('checkbox', { name: 'Hardware' })).not.toBeChecked();
});

test('useSearchState derives state from useSearchParams (no useState copy) and setState merges partial updates', async () => {
  const { useSearchState } = modules['shared/url/useSearchState.js'];
  const schema = catalogSchema();
  function wrapper({ children }) {
    return <MemoryRouter initialEntries={['/catalog?page=3&sort=price']}>{children}</MemoryRouter>;
  }
  const { result } = renderHook(() => ({ search: useSearchState(schema), location: useLocation() }), { wrapper });
  expect(result.current.search[0]).toEqual({ q: '', page: 3, sort: 'price', tags: [] });
  act(() => result.current.search[1]({ page: 4 }));
  expect(result.current.location.search).toBe('?page=4&sort=price');
  act(() => result.current.search[1]({ q: 'mo' }));
  expect(result.current.location.search).toBe('?q=mo&sort=price');
  expect(result.current.search[0]).toEqual({ q: 'mo', page: 1, sort: 'price', tags: [] });
  expect(sources['shared/url/useSearchState.js']).toMatch(/useSearchParams\s*\(/);
  expect(sources['shared/url/useSearchState.js']).not.toMatch(/useState\s*\(/);
});
