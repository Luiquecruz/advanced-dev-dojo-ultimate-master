const mountLikeABrowser = (element) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  const container = document.createElement('div');
  document.body.appendChild(container);
  require('react-dom/client').createRoot(container).render(element);
};

const typeLikeABrowser = (input, value) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setValue.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const delaySearch = () =>
  mockApi('/search', async ({ url }) => {
    await sleep(300);
    const query = url.searchParams.get('q').toLowerCase();
    return [{ id: 3, name: 'Grace Hopper' }].filter((user) => user.name.toLowerCase().includes(query));
  });

test('shows every user after the first load', async () => {
  const UserSearch = mod.default;
  mountLikeABrowser(<UserSearch />);
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
});

test('keeps the previous results visible instead of the "Searching..." fallback', async () => {
  const UserSearch = mod.default;
  mountLikeABrowser(<UserSearch />);
  await screen.findByText('Ada Lovelace');
  delaySearch();
  const input = screen.getByLabelText('Search users');
  typeLikeABrowser(input, 'grace');
  await sleep(100);
  expect(input).toHaveValue('grace');
  expect(screen.queryByText('Searching...')).toBeNull();
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
});

test('marks the stale results with aria-busy="true" while the new query loads', async () => {
  const UserSearch = mod.default;
  mountLikeABrowser(<UserSearch />);
  await screen.findByText('Ada Lovelace');
  delaySearch();
  typeLikeABrowser(screen.getByLabelText('Search users'), 'grace');
  await sleep(100);
  const busy = document.querySelector('[aria-busy="true"]');
  expect(busy).not.toBeNull();
  expect(busy).toHaveTextContent('Ada Lovelace');
  expect(busy).toHaveStyle({ opacity: '0.5' });
});

test('eventually shows only the matching users and clears aria-busy', async () => {
  const UserSearch = mod.default;
  mountLikeABrowser(<UserSearch />);
  await screen.findByText('Ada Lovelace');
  delaySearch();
  typeLikeABrowser(screen.getByLabelText('Search users'), 'grace');
  await waitFor(() => expect(screen.queryByText('Ada Lovelace')).toBeNull(), { timeout: 2000 });
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByRole('listitem')).toHaveTextContent('Grace Hopper');
  expect(document.querySelector('[aria-busy="true"]')).toBeNull();
});

test('uses useDeferredValue', () => {
  expect(source).toMatch(/useDeferredValue\s*\(/);
});
