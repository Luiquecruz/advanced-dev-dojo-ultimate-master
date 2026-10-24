const { router } = modules['router.ts'];
const UserView = modules['UserView.vue'].default;

async function renderAt(path: string) {
  await router.push(path);
  await router.isReady();
  render(mod.default, { global: { plugins: [router] } });
}

test('declares a route named "user" for /users/:id', () => {
  const resolved = router.resolve('/users/42');
  expect(resolved.name).toBe('user');
  expect(resolved.params.id).toBe('42');
});

test('only digits match the id param (/users/abc is not found)', () => {
  expect(router.resolve('/users/abc').name).toBe('not-found');
});

test('renders the user of /users/1 in an <h2>', async () => {
  await renderAt('/users/1');
  expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
});

test('UserView receives the id as a prop, so it works without the router', async () => {
  render(UserView, { props: { id: '3' } });
  expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
});

test('navigating from user 1 to user 2 updates the reused component', async () => {
  await renderAt('/users/1');
  await screen.findByRole('heading', { name: 'Ada Lovelace' });
  await user.click(screen.getByRole('link', { name: 'Alan' }));
  expect(await screen.findByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument();
});
