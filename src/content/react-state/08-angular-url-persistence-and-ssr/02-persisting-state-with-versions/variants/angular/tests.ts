const memory = (initial) => {
  const data = new Map(initial ? [['prefs', initial]] : []);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
};
const setup = (initial) => {
  const storage = memory(initial);
  TestBed.configureTestingModule({ providers: [{ provide: mod.STORAGE, useValue: storage }] });
  return { storage, store: TestBed.inject(mod.PreferencesStore) };
};

test('starts with the defaults when nothing is stored', () => {
  const { store } = setup();
  expect(store.preferences()).toEqual({ theme: 'light', fontSize: 16 });
  expect(store.preferences.set).toBeUndefined();
});

test('reads a version-2 envelope', () => {
  const { store } = setup(JSON.stringify({ version: 2, data: { theme: 'dark', fontSize: 20 } }));
  expect(store.preferences()).toEqual({ theme: 'dark', fontSize: 20 });
});

test('migrates a version-1 envelope', () => {
  const dark = setup(JSON.stringify({ version: 1, data: { dark: true } }));
  expect(dark.store.preferences()).toEqual({ theme: 'dark', fontSize: 16 });
});

test('corrupt, unknown or invalid data falls back to the defaults', () => {
  const defaults = { theme: 'light', fontSize: 16 };
  for (const stored of ['{not json', JSON.stringify({ version: 9, data: {} }), JSON.stringify({ version: 2, data: { theme: 'blue', fontSize: 'big' } }), 'null']) {
    TestBed.resetTestingModule();
    expect(setup(stored).store.preferences()).toEqual(defaults);
  }
});

test('setters update the signal and write a version-2 envelope', () => {
  const { store, storage } = setup();
  store.setTheme('dark');
  store.setFontSize(18);
  expect(store.preferences()).toEqual({ theme: 'dark', fontSize: 18 });
  expect(JSON.parse(storage.data.get('prefs'))).toEqual({ version: 2, data: { theme: 'dark', fontSize: 18 } });
});

test('setFontSize clamps between 12 and 24', () => {
  const { store } = setup();
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
  TestBed.configureTestingModule({ providers: [{ provide: mod.STORAGE, useValue: storage }] });
  const store = TestBed.inject(mod.PreferencesStore);
  expect(() => store.setTheme('dark')).not.toThrow();
  expect(store.preferences().theme).toBe('dark');
});
