const preferences = () => TestBed.inject(modules['preferences.store.ts'].PreferencesStore);
const { getState } = require('@ngrx/signals');

test('exposes theme and fontSize as signals with the initial state', () => {
  const store = preferences();
  expect(store.theme()).toBe('light');
  expect(store.fontSize()).toBe(16);
  expect(getState(store)).toEqual({ theme: 'light', fontSize: 16 });
});

test('toggleTheme() switches between light and dark', () => {
  const store = preferences();
  store.toggleTheme();
  expect(store.theme()).toBe('dark');
  store.toggleTheme();
  expect(store.theme()).toBe('light');
});

test('font size changes by 2 and stays between 12 and 24', () => {
  const store = preferences();
  for (let index = 0; index < 10; index++) store.increaseFont();
  expect(store.fontSize()).toBe(24);
  for (let index = 0; index < 10; index++) store.decreaseFont();
  expect(store.fontSize()).toBe(12);
  store.increaseFont();
  expect(store.fontSize()).toBe(14);
});

test('reset() restores the initial preferences', () => {
  const store = preferences();
  store.toggleTheme();
  store.increaseFont();
  store.reset();
  expect(getState(store)).toEqual({ theme: 'light', fontSize: 16 });
});

test('PreferencesPanel renders the state and reacts to the buttons', async () => {
  await render(mod.PreferencesPanel);
  expect(screen.getByText('Theme: light')).toBeInTheDocument();
  expect(screen.getByText('Font size: 16px')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
  await user.click(screen.getByRole('button', { name: 'A+' }));
  await stable();
  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
  expect(screen.getByText('Font size: 18px')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'A-' }));
  await user.click(screen.getByRole('button', { name: 'A-' }));
  await stable();
  expect(screen.getByText('Font size: 14px')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await stable();
  expect(screen.getByText('Theme: light')).toBeInTheDocument();
  expect(screen.getByText('Font size: 16px')).toBeInTheDocument();
});

test('uses signalStore, withState, withMethods and patchState', () => {
  const code = sources['preferences.store.ts'];
  expect(code).toMatch(/signalStore\(/);
  expect(code).toMatch(/withState\s*(<[^>]*>)?\(/);
  expect(code).toMatch(/withMethods\(/);
  expect(code).toMatch(/patchState\(/);
});
