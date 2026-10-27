test('shows the fallback while loading', () => {
  mount(mod.default, { attachTo: document.body });
  expect(screen.getByText('Loading…')).toBeInTheDocument();
});

test('renders the user once the async setup resolves', async () => {
  mount(mod.default, { attachTo: document.body });
  expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  expect(screen.queryByText('Loading…')).toBeNull();
});

test('fetches the user given by the userId prop', async () => {
  const { h, Suspense } = require('vue');
  const UserProfile = modules['UserProfile.vue'].default;
  mount({ setup: () => () => h(Suspense, null, { default: () => h(UserProfile, { userId: 3 }) }) }, { attachTo: document.body });
  expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
});

test('shows an alert when the request fails', async () => {
  mockApi('/api/users/1', () => jsonResponse({ error: 'boom' }, 500));
  mount(mod.default, { attachTo: document.body });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load user');
});

test('uses top-level await and <Suspense>', () => {
  expect(sources['UserProfile.vue']).toMatch(/^\s*const\s+\w+[^=]*=\s*await\s+fetch/m);
  expect(sources['App.vue']).toMatch(/<Suspense[\s>]/);
  expect(sources['App.vue']).toMatch(/#fallback|v-slot:fallback/);
});
