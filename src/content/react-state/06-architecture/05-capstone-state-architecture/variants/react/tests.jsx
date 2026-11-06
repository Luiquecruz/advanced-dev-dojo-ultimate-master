const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { MemoryRouter, useLocation } = require('react-router');

const catalog = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderShop(initialEntry = '/') {
  const requests = [];
  mockApi('/api/products', ({ url }) => {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    requests.push(q);
    return catalog.filter((product) => product.name.toLowerCase().includes(q));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Shop = mod.Shop;
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Shop />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, requests };
}

function productNames() {
  return within(screen.getByRole('list', { name: 'Products' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent.replace(/ \(.*$/, ''));
}

test('URL state: q and category are read from the initial URL', async () => {
  const { requests } = renderShop('/?q=o&category=software');
  expect(screen.getByLabelText('Search products')).toHaveValue('o');
  expect(screen.getByRole('button', { name: 'Software' })).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(productNames()).toEqual(['Cloud Credits']));
  expect(requests).toEqual(['o']);
});

test('local state: the search draft stays local until submitted, then moves to the URL and the query cache', async () => {
  const { client, requests } = renderShop();
  await waitFor(() => expect(productNames()).toHaveLength(5));
  await user.type(screen.getByLabelText('Search products'), 'mon');
  expect(screen.getByTestId('location').textContent).toBe('');
  expect(requests).toEqual(['']);
  await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByTestId('location').textContent).toBe('?q=mon');
  await waitFor(() => expect(productNames()).toEqual(['Monitor']));
  expect(client.getQueryData(['products', 'mon'])).toHaveLength(1);
});

test('the category filter is URL state applied to cached data, without a new request', async () => {
  const { requests } = renderShop('/?q=e');
  await waitFor(() => expect(productNames()).toHaveLength(4));
  await user.click(screen.getByRole('button', { name: 'Hardware' }));
  expect(screen.getByTestId('location').textContent).toBe('?q=e&category=hardware');
  expect(productNames()).toEqual(['Keyboard', 'Mouse']);
  await user.click(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByTestId('location').textContent).toBe('?q=e');
  expect(productNames()).toEqual(['Keyboard', 'Mouse', 'IDE License', 'Cloud Credits']);
  expect(requests).toEqual(['e']);
});

test('client store: the cart lives in useCartStore and the panel derives count and total', async () => {
  renderShop();
  await user.click(await screen.findByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  expect(screen.getByTestId('cart-count')).toHaveTextContent('Items: 3');
  expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: $285');
  const state = modules['cartStore.js'].useCartStore.getState();
  expect(state.items).toEqual([
    { id: 1, name: 'Keyboard', price: 120, quantity: 2 },
    { id: 2, name: 'Mouse', price: 45, quantity: 1 },
  ]);
  expect('products' in state).toBe(false);
});

test('the cart survives a new search because it does not depend on server state', async () => {
  renderShop();
  await user.click(await screen.findByRole('button', { name: 'Add Keyboard' }));
  await user.type(screen.getByLabelText('Search products'), 'mouse');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(productNames()).toEqual(['Mouse']));
  expect(screen.getByTestId('cart-total')).toHaveTextContent('Total: $120');
  await user.click(screen.getByRole('button', { name: 'Show items' }));
  await user.click(screen.getByRole('button', { name: 'Remove Keyboard' }));
  expect(screen.getByTestId('cart-count')).toHaveTextContent('Items: 0');
});
