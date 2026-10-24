async function setup(url: string) {
  const { provideRouter, withComponentInputBinding } = require('@angular/router');
  const { RouterTestingHarness } = require('@angular/router/testing');
  TestBed.configureTestingModule({ providers: [provideRouter(mod.routes, withComponentInputBinding())] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

test('lists every user as a link and opens the detail page on click', async () => {
  const harness = await setup('/users');
  expect(screen.getAllByRole('link')).toHaveLength(5);
  await user.click(screen.getByRole('link', { name: 'Grace Hopper' }));
  await harness.fixture.whenStable();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument());
  expect(screen.getByText('Role: viewer')).toBeInTheDocument();
});

test('renders the user from the ":id" param when opened directly', async () => {
  await setup('/users/2');
  expect(screen.getByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument();
  expect(screen.getByText('Role: editor')).toBeInTheDocument();
});

test('reads the "tab" query param and defaults to "profile"', async () => {
  const harness = await setup('/users/1');
  expect(screen.getByText('Active tab: profile')).toBeInTheDocument();
  await harness.navigateByUrl('/users/1?tab=activity');
  expect(screen.getByText('Active tab: activity')).toBeInTheDocument();
});

test('updates when only the param changes (same component instance)', async () => {
  const harness = await setup('/users/1');
  expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Next user' }));
  await harness.fixture.whenStable();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument());
});

test('shows "User not found" for an unknown id and redirects "" to /users', async () => {
  const harness = await setup('/users/99');
  expect(screen.getByText('User not found')).toBeInTheDocument();
  await harness.navigateByUrl('/');
  expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
});

test('appConfig enables withComponentInputBinding() and UserDetail declares signal inputs', () => {
  expect(source).toMatch(/provideRouter\(\s*routes\s*,[^)]*withComponentInputBinding\(\)/);
  expect(source).toMatch(/id\s*=\s*input\.required\b/);
  expect(source).toMatch(/tab\s*=\s*input\b/);
});
