const storeModule = () => modules['store.js'];
const STORAGE_KEY = 'shop-preferences';
const persisted = () => JSON.parse(localStorage.getItem(STORAGE_KEY));

test('createAppStore returns independent store instances', () => {
  localStorage.clear();
  const first = storeModule().createAppStore();
  const second = storeModule().createAppStore();
  first.getState().toggleSettings();
  expect(first.getState().isSettingsOpen).toBe(true);
  expect(second.getState().isSettingsOpen).toBe(false);
});

test('viewProduct keeps the 5 most recent unique ids, newest first', () => {
  localStorage.clear();
  const store = storeModule().createAppStore();
  const before = store.getState().recentIds;
  [1, 2, 3, 2, 4, 5, 6, 7].forEach((id) => store.getState().viewProduct(id));
  expect(store.getState().recentIds).toEqual([7, 6, 5, 4, 2]);
  expect(before).toEqual([]);
  expect(sources['store.js']).toMatch(/produce\s*\(/);
});

test('persists only theme, density and recentIds, with version 2', () => {
  localStorage.clear();
  const store = storeModule().createAppStore();
  store.getState().setTheme('dark');
  store.getState().viewProduct(3);
  store.getState().toggleSettings();
  expect(persisted()).toEqual({ state: { theme: 'dark', density: 'comfortable', recentIds: [3] }, version: 2 });
});

test('migrates version 1 data ({ darkMode }) to the new theme field', () => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { darkMode: true, density: 'compact', recentIds: [2] }, version: 1 }));
  const store = storeModule().createAppStore();
  expect(store.getState().theme).toBe('dark');
  expect(store.getState().density).toBe('compact');
  expect(store.getState().recentIds).toEqual([2]);
  expect(store.getState()).not.toHaveProperty('darkMode');
});

test('actions are reported to the Redux DevTools with their names', () => {
  localStorage.clear();
  const send = fn();
  window.__REDUX_DEVTOOLS_EXTENSION__ = { connect: () => ({ init: fn(), send, subscribe: fn(), unsubscribe: fn() }) };
  try {
    const store = storeModule().createAppStore();
    store.getState().setTheme('dark');
    store.getState().viewProduct(1);
    expect(send).toHaveBeenCalledWith({ type: 'preferences/setTheme' }, expect.anything());
    expect(send).toHaveBeenCalledWith({ type: 'recent/viewProduct' }, expect.anything());
  } finally {
    delete window.__REDUX_DEVTOOLS_EXTENSION__;
  }
});

test('useAppStore requires a provider, and the app updates theme and recent products', async () => {
  localStorage.clear();
  expect(() => renderHook(() => storeModule().useAppStore((state) => state.theme))).toThrow(/AppStoreProvider/);
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await user.selectOptions(screen.getByLabelText('Theme'), 'dark');
  expect(screen.getByTestId('shop')).toHaveAttribute('data-theme', 'dark');
  await user.click(screen.getByRole('button', { name: 'View Mouse' }));
  await user.click(screen.getByRole('button', { name: 'View Keyboard' }));
  expect(screen.getByTestId('recent')).toHaveTextContent('Recently viewed: Keyboard, Mouse');
});
