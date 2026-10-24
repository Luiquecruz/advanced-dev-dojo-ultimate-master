async function setup(url: string) {
  const { provideRouter, Router } = require('@angular/router');
  const { RouterTestingHarness } = require('@angular/router/testing');
  TestBed.configureTestingModule({ providers: [provideRouter(mod.routes)] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return { harness, router: TestBed.inject(Router) };
}

test('redirects a logged-out visitor of /dashboard to /login?returnUrl=%2Fdashboard', async () => {
  const { router } = await setup('/dashboard');
  expect(router.url).toBe('/login?returnUrl=%2Fdashboard');
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(screen.queryByText('Dashboard')).toBeNull();
});

test('after logging in the user is sent back to the dashboard', async () => {
  const { harness, router } = await setup('/dashboard');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  await harness.fixture.whenStable();
  await waitFor(() => expect(router.url).toBe('/dashboard'));
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
});

test('authGuard returns true or a UrlTree when called in an injection context', () => {
  const { provideRouter, UrlTree } = require('@angular/router');
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const state = { url: '/secret' };
  const denied = TestBed.runInInjectionContext(() => mod.authGuard({}, state));
  expect(denied).toBeInstanceOf(UrlTree);
  expect(denied.toString()).toBe('/login?returnUrl=%2Fsecret');
  TestBed.inject(mod.AuthService).login();
  expect(TestBed.runInInjectionContext(() => mod.authGuard({}, state))).toBe(true);
});

test('blocks leaving a dirty editor when the user cancels the confirm dialog', async () => {
  const confirm = fn(() => false);
  window.confirm = confirm;
  const { harness, router } = await setup('/editor');
  await user.type(screen.getByLabelText('Draft'), 'hi');
  await harness.navigateByUrl('/login');
  expect(confirm).toHaveBeenCalled();
  expect(router.url).toBe('/editor');
});

test('lets the user leave a clean editor, or a dirty one after confirming', async () => {
  const confirm = fn(() => true);
  window.confirm = confirm;
  const { harness, router } = await setup('/editor');
  await harness.navigateByUrl('/login');
  expect(router.url).toBe('/login');
  expect(confirm).not.toHaveBeenCalled();
  await harness.navigateByUrl('/editor');
  await user.type(screen.getByLabelText('Draft'), 'hi');
  await harness.navigateByUrl('/login');
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(router.url).toBe('/login');
});

test('uses functional guards instead of guard classes', () => {
  expect(source).not.toMatch(/implements\s+(CanActivate|CanDeactivate)\b/);
  expect(source).toMatch(/canActivate\s*:\s*\[\s*authGuard\s*\]/);
});
