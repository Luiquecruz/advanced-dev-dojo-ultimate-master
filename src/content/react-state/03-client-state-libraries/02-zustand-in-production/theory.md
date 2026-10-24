## From a demo store to a production store

A real store needs more than `create`: it must survive reloads, evolve its persisted shape without breaking returning users, stay debuggable, be split by feature, and be isolated per test (and per request in SSR). Zustand covers each with a small, composable piece.

## Slices: one store, many features

Split a large store into **slice creators** that receive the same `set`/`get` and return part of the state:

```js
export const createPreferencesSlice = (set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }, false, 'preferences/setTheme'),
});

export const createRecentSlice = (set) => ({
  recentIds: [],
  clearRecent: () => set({ recentIds: [] }, false, 'recent/clear'),
});

const initializer = (...args) => ({ ...createPreferencesSlice(...args), ...createRecentSlice(...args) });
```

Slices share one subscription and can read each other through `get()`. Keep key names unique across slices. Apply middleware **once**, around the combined initializer, not inside slices.

## Middleware order

Middleware wraps the initializer from the inside out. The recommended order puts `devtools` **outermost** so it sees every update, including those coming from `persist` rehydration:

```js
createStore(devtools(persist(initializer, persistOptions), { name: 'shop' }));
```

## persist: what, how, which version

```js
persist(initializer, {
  name: 'shop-preferences',
  version: 2,
  partialize: (state) => ({ theme: state.theme, density: state.density, recentIds: state.recentIds }),
  migrate: (persisted, version) => {
    if (version < 2) {
      const { darkMode, ...rest } = persisted;
      return { ...rest, theme: darkMode ? 'dark' : 'light' };
    }
    return persisted;
  },
});
```

- **`partialize`** chooses what is saved. Persist preferences and user choices; never persist transient UI (`isSettingsOpen`), loading flags, server data or secrets.
- **`version` + `migrate`**: the stored value is `{ state, version }`. When the stored version is older, `migrate` transforms it. Without a migration, a renamed field silently resets (or worse, keeps an obsolete key forever).
- Storage defaults to `localStorage` via `createJSONStorage`. Synchronous storages hydrate during store creation; async ones (IndexedDB, React Native) hydrate later, so check `store.persist.hasHydrated()` before trusting the values. `skipHydration: true` plus `store.persist.rehydrate()` controls timing in SSR apps.

## devtools: named actions

`devtools` connects to the Redux DevTools extension. The third argument of `set` names the action, so the timeline reads `recent/viewProduct` instead of `anonymous`. Disable it in production with `enabled: process.env.NODE_ENV !== 'production'` (it is already off by default in production builds).

## Immer for nested updates

Zustand ships an `immer` middleware (`zustand/middleware/immer`) that lets `set` receive a draft recipe. You can get the same benefit without middleware: a curried `produce` is a function `(state) => nextState`, which `set` accepts.

```js
viewProduct: (id) =>
  set(
    produce((draft) => {
      const index = draft.recentIds.indexOf(id);
      if (index !== -1) draft.recentIds.splice(index, 1);
      draft.recentIds.unshift(id);
      draft.recentIds.splice(5);
    }),
    false,
    'recent/viewProduct',
  ),
```

## Vanilla store + context: one store per provider

A module-level `create(...)` store is a **singleton**: shared by every test in the same module evaluation, by every request on a server, and by every widget instance. For those cases, create a **vanilla** store with `createStore` inside a provider and read it with `useStore`:

```jsx
const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [store] = useState(createAppStore);
  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}

export function useAppStore(selector) {
  const store = use(AppStoreContext);
  if (store === null) throw new Error('useAppStore must be used within an AppStoreProvider');
  return useStore(store, selector);
}
```

`useState(createAppStore)` creates the store once per provider. Context only transports the **store reference**, which never changes, so there are no context re-renders; selectors still decide what renders. This is also how you seed a store from props (`createAppStore(initialProps)`).

## Testing

- Export a factory (`createAppStore`) and create a fresh store per test, or reset a singleton with `setState(getInitialState(), true)`.
- Clear `localStorage` before persisted tests, or inject a custom `storage`.
- Test actions through `store.getState()` without rendering; test components inside a provider.

## When to use it / when not to

Use slices when a store spans several features; `persist` for user preferences, drafts worth keeping and recently used items; `devtools` everywhere in development; Immer when updates are nested; and the provider pattern for SSR, tests, embeddable widgets or props-initialized stores. Do not persist everything by default, do not ship persisted data without a `version`, do not apply middleware per slice, and do not use the provider pattern for a simple client-only app where a singleton store is clearer.
