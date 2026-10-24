const { MemoryRouter } = require('react-router');

function renderAt(path) {
  const { AppRoutes } = mod;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

test('renders the Home heading at "/"', () => {
  renderAt('/');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
});

test('clicking the About link navigates without a reload', async () => {
  renderAt('/');
  await user.click(screen.getByRole('link', { name: 'About' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About');
});

test('marks only the active NavLink with aria-current="page"', () => {
  renderAt('/about');
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
});

test('shows "Page not found" for unknown paths and "Go home" navigates to "/"', async () => {
  renderAt('/missing/page');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  await user.click(screen.getByRole('button', { name: 'Go home' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
});

test('uses NavLink and no plain <a> tags', () => {
  expect(source).toMatch(/<NavLink/);
  expect(source).not.toMatch(/<a[\s>]/);
});
