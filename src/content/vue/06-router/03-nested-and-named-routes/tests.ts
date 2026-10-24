const { router } = modules['router.ts'];

async function renderAt(path: string) {
  await router.push(path);
  await router.isReady();
  return render(mod.default, { global: { plugins: [router] } });
}

test('/settings redirects to the "settings-profile" child', async () => {
  await router.push('/settings');
  expect(router.currentRoute.value.name).toBe('settings-profile');
  expect(router.currentRoute.value.path).toBe('/settings/profile');
});

test('child routes are nested inside the settings record', () => {
  const resolved = router.resolve('/settings/account');
  expect(resolved.name).toBe('settings-account');
  expect(resolved.matched).toHaveLength(2);
});

test('renders the layout heading and the Profile child together', async () => {
  await renderAt('/settings/profile');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Profile');
});

test('clicking "Account" swaps only the child view', async () => {
  await renderAt('/settings/profile');
  await user.click(screen.getByRole('link', { name: 'Account' }));
  await flushPromises();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Account');
});

test('the "sidebar" named view renders SettingsSidebar in <aside> only on settings pages', async () => {
  const { container } = await renderAt('/settings/account');
  expect(container.querySelector('aside')).toHaveTextContent('Settings help');
  await router.push('/');
  await flushPromises();
  expect(container.querySelector('aside')).not.toHaveTextContent('Settings help');
});
