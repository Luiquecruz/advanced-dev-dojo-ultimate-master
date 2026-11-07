const memory = (initial) => {
  const data = new Map(initial ? [['prefs', initial]] : []);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
};
const setup = (initial, storage = memory(initial)) => {
  TestBed.configureTestingModule({ providers: [{ provide: mod.STORAGE, useValue: storage }] });
  return { storage, store: TestBed.inject(mod.PreferencesStore) };
};
const defaults = { theme: 'light', fontSize: 16 };

test('reads the defaults, a version-2 envelope and a migrated version-1 envelope', () => {
  const empty = setup();
  expect(empty.store.preferences()).toEqual(defaults);
  expect(empty.store.preferences.set).toBeUndefined();
  TestBed.resetTestingModule();
  expect(setup(JSON.stringify({ version: 2, data: { theme: 'dark', fontSize: 20 } })).store.preferences()).toEqual({ theme: 'dark', fontSize: 20 });
  TestBed.resetTestingModule();
  expect(setup(JSON.stringify({ version: 1, data: { dark: true } })).store.preferences()).toEqual({ theme: 'dark', fontSize: 16 });
});

test('corrupt, unknown or invalid data falls back to the defaults and a stored font size is clamped', () => {
  for (const stored of ['{not json', JSON.stringify({ version: 9, data: {} }), JSON.stringify({ version: 2, data: { theme: 'blue', fontSize: 'big' } }), 'null']) {
    TestBed.resetTestingModule();
    expect(setup(stored).store.preferences()).toEqual(defaults);
  }
  TestBed.resetTestingModule();
  expect(setup(JSON.stringify({ version: 2, data: { theme: 'dark', fontSize: 99 } })).store.preferences()).toEqual({ theme: 'dark', fontSize: 24 });
});

test('setters update the signal, clamp the font size and write a version-2 envelope', () => {
  const { store, storage } = setup();
  store.setTheme('dark');
  store.setFontSize(18);
  expect(store.preferences()).toEqual({ theme: 'dark', fontSize: 18 });
  expect(JSON.parse(storage.data.get('prefs'))).toEqual({ version: 2, data: { theme: 'dark', fontSize: 18 } });
  store.setFontSize(99);
  expect(store.preferences().fontSize).toBe(24);
  store.setFontSize(1);
  expect(store.preferences().fontSize).toBe(12);
});

test('a storage that throws on write does not break the setters', () => {
  const storage = memory();
  storage.setItem = () => {
    throw new Error('quota');
  };
  const { store } = setup(undefined, storage);
  expect(() => store.setTheme('dark')).not.toThrow();
  expect(store.preferences().theme).toBe('dark');
});
