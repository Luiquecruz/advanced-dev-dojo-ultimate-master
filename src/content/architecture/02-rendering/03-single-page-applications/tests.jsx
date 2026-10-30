function renderAt(path) {
  window.history.replaceState(null, '', path);
  const App = mod.default;
  return render(<App />);
}

function clickLink(link, init = {}) {
  let prevented = false;
  const blockDocumentNavigation = (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  window.addEventListener('click', blockDocumentNavigation);
  try {
    fireEvent.click(link, { button: 0, ...init });
  } finally {
    window.removeEventListener('click', blockDocumentNavigation);
  }
  return prevented;
}

function navLink(name) {
  return within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name });
}

test('renders the page for the current URL, and "Page not found" for unknown paths', () => {
  const home = renderAt('/');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
  home.unmount();
  renderAt('/nope');
  expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
});

test('a plain click on a Link navigates without a full page load and updates window.location', async () => {
  mockApi('/api/products', []);
  renderAt('/');
  const nav = screen.getByRole('navigation', { name: 'Main' });
  let prevented;
  await act(async () => {
    prevented = clickLink(navLink('Products'));
  });
  expect(prevented).toBe(true);
  expect(window.location.pathname).toBe('/products');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Products');
  expect(screen.getByRole('navigation', { name: 'Main' })).toBe(nav);
});

test('ctrl, meta, shift and middle clicks are left to the browser', async () => {
  renderAt('/');
  for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
    let prevented;
    await act(async () => {
      prevented = clickLink(navLink('Products'), init);
    });
    expect(prevented).toBe(false);
    expect(window.location.pathname).toBe('/');
  }
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
});

test('the back button (popstate) restores the previous page', async () => {
  mockApi('/api/products', []);
  renderAt('/');
  await act(async () => {
    clickLink(navLink('Products'));
  });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Products');
  await act(async () => {
    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
});

test('Products shows "Loading…" and then fetches the list in the browser', async () => {
  const requests = [];
  mockApi('/api/products', ({ url }) => {
    requests.push(url.pathname);
    return [{ id: 1, name: 'Keyboard', price: 120 }, { id: 4, name: 'Monitor', price: 340 }];
  });
  renderAt('/');
  expect(requests).toEqual([]);
  await act(async () => {
    clickLink(navLink('Products'));
  });
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  const list = await screen.findByRole('list', { name: 'Products' });
  expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Keyboard', 'Monitor']);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((pathname) => pathname === '/api/products')).toBe(true);
});

test('the router is built on the History API', () => {
  const router = sources['router.jsx'];
  expect(router).toMatch(/history\.pushState\s*\(/);
  expect(router).toMatch(/['"]popstate['"]/);
  expect(router).toMatch(/preventDefault\s*\(/);
});
