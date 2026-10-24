const { router } = modules['router.ts'];

async function renderAt(path: string) {
  await router.push(path);
  await router.isReady();
  render(mod.default, { global: { plugins: [router] } });
}

test('renders HomeView at "/"', async () => {
  await renderAt('/');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
});

test('declares named routes "home", "about" and "not-found"', () => {
  expect(router.hasRoute('home')).toBe(true);
  expect(router.hasRoute('about')).toBe(true);
  expect(router.hasRoute('not-found')).toBe(true);
});

test('clicking the "About" link renders AboutView', async () => {
  await renderAt('/');
  await user.click(screen.getByRole('link', { name: 'About' }));
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/about');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About');
});

test('the link of the current route gets the router-link-active class', async () => {
  await renderAt('/about');
  expect(screen.getByRole('link', { name: 'About' })).toHaveClass('router-link-active');
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('router-link-active');
});

test('unknown paths render NotFoundView', async () => {
  await renderAt('/does/not/exist');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  expect(screen.getByText('Nothing lives at /does/not/exist.')).toBeInTheDocument();
});
