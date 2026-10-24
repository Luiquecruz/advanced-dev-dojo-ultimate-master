const { MemoryRouter } = require('react-router');

function renderAt(path) {
  const { AppRoutes } = mod;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

test('"/users" shows the list of user links and the index route', () => {
  renderAt('/users');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users');
  const links = screen.getAllByRole('link');
  expect(links.map((link) => link.textContent)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper']);
  expect(links[2]).toHaveAttribute('href', '/users/3');
  expect(screen.getByText('Select a user')).toBeInTheDocument();
});

test('"/users/3" renders the detail inside the layout', () => {
  renderAt('/users/3');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Grace Hopper');
  expect(screen.getByText('Role: viewer')).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(3);
  expect(screen.queryByText('Select a user')).toBeNull();
});

test('clicking a user link shows that user', async () => {
  renderAt('/users');
  await user.click(screen.getByRole('link', { name: 'Alan Turing' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Alan Turing');
  await user.click(screen.getByRole('link', { name: 'Ada Lovelace' }));
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada Lovelace');
});

test('shows "User not found" for an unknown id', () => {
  renderAt('/users/99');
  expect(screen.getByText('User not found')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
});

test('uses useParams and <Outlet />', () => {
  expect(source).toMatch(/useParams\(\s*\)/);
  expect(source).toMatch(/<Outlet\s*\/>/);
});
