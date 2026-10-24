test('without provideSession() nothing is fetched and user() is null', async () => {
  const handler = fn(() => ({ id: 1, name: 'Ada Lovelace' }));
  mockApi('/api/users', handler);
  const { CurrentUser } = modules['session.ts'];
  expect(TestBed.inject(CurrentUser).user()).toBeNull();
  await sleep(30);
  expect(handler).not.toHaveBeenCalled();
});

test('provideSession(2) loads Alan Turing before initialization completes', async () => {
  const { ApplicationInitStatus } = require('@angular/core');
  const { CurrentUser, SESSION_USER_ID, provideSession } = modules['session.ts'];
  TestBed.configureTestingModule({ providers: [provideSession(2)] });
  expect(TestBed.inject(SESSION_USER_ID)).toBe(2);
  await TestBed.inject(ApplicationInitStatus).donePromise;
  expect(TestBed.inject(CurrentUser).user()?.name).toBe('Alan Turing');
});

test('the initializer fetches the user exactly once', async () => {
  const { ApplicationInitStatus } = require('@angular/core');
  const handler = fn(({ url }) => ({ id: 5, name: 'Margaret Hamilton', path: url.pathname }));
  mockApi('/api/users', handler);
  TestBed.configureTestingModule({ providers: [modules['session.ts'].provideSession(5)] });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler.mock.calls[0][0].url.pathname).toBe('/api/users/5');
});

test('Welcome renders the user loaded through appConfig', async () => {
  await render(mod.Welcome, { providers: mod.appConfig.providers });
  await waitFor(() => expect(screen.getByText('Welcome, Grace Hopper')).toBeInTheDocument(), { timeout: 2000 });
});

test('uses makeEnvironmentProviders and provideAppInitializer, not APP_INITIALIZER', () => {
  const session = sources['session.ts'];
  expect(session).toMatch(/makeEnvironmentProviders\(/);
  expect(session).toMatch(/provideAppInitializer\(/);
  expect(session).not.toMatch(/APP_INITIALIZER/);
});
