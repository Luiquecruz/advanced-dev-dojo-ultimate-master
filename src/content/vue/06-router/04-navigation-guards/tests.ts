const { router } = modules['router.ts'];
const { auth } = modules['auth.ts'];

async function renderAt(path: string) {
  await router.push(path);
  await router.isReady();
  render(mod.default, { global: { plugins: [router] } });
}

test('guests visiting /dashboard are redirected to /login?redirect=/dashboard', async () => {
  await router.push('/dashboard');
  expect(router.currentRoute.value.name).toBe('login');
  expect(router.currentRoute.value.query.redirect).toBe('/dashboard');
});

test('signed-in users reach /dashboard', async () => {
  auth.login('Grace');
  await router.push('/dashboard');
  expect(router.currentRoute.value.name).toBe('dashboard');
});

test('clicking "Log in" sends the user to the redirect target', async () => {
  await renderAt('/dashboard');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe('/dashboard');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
});

test('sets document.title from route meta after each navigation', async () => {
  await router.push('/editor');
  expect(document.title).toBe('Editor · Dojo');
  await router.push('/');
  expect(document.title).toBe('Home · Dojo');
});

test('leaving the editor with a draft asks for confirmation and stays when cancelled', async () => {
  const confirm = fn(() => false);
  window.confirm = confirm;
  await renderAt('/editor');
  await user.type(screen.getByLabelText('Draft'), 'Hello');
  await router.push('/');
  expect(confirm).toHaveBeenCalledWith('Discard unsaved changes?');
  expect(router.currentRoute.value.name).toBe('editor');
});

test('leaving the editor without a draft or after confirming is allowed', async () => {
  const confirm = fn(() => true);
  window.confirm = confirm;
  await renderAt('/editor');
  await router.push('/');
  expect(confirm).not.toHaveBeenCalled();
  expect(router.currentRoute.value.name).toBe('home');
  await router.push('/editor');
  await flushPromises();
  await user.type(screen.getByLabelText('Draft'), 'Bye');
  await router.push('/');
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(router.currentRoute.value.name).toBe('home');
});
