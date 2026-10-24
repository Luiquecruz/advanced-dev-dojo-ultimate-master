Turn the shop's preferences store in **`store.js`** into a production setup. The three slices exist (`createPreferencesSlice`, `createRecentSlice`, `createUiSlice`); `App.jsx` is done.

1. **`viewProduct(id)`** (recent slice): using **`produce` from `immer`** inside `set`, move `id` to the front of `recentIds`, remove duplicates and keep at most **5** ids. Name the action `'recent/viewProduct'` (third argument of `set`).
2. **`createAppStore()`** (named export) returns a **new vanilla store** each call, built with `createStore` and wrapped with:
   - `devtools(..., { name: 'shop' })` as the outermost middleware;
   - `persist(..., options)` with:
     - `name: 'shop-preferences'`, `version: 2`;
     - `partialize`: persist only `theme`, `density` and `recentIds` (never `isSettingsOpen` or functions);
     - `migrate(persisted, version)`: version 1 stored `darkMode: boolean` instead of `theme`. Convert it to `theme: 'dark' | 'light'` and drop `darkMode`.
3. **`AppStoreProvider({ children })`**: creates one store per provider instance (`useState(createAppStore)`) and shares it through context.
4. **`useAppStore(selector)`**: reads the store from context, throws an `Error` containing `AppStoreProvider` without a provider, and returns `useStore(store, selector)`.

The tests clear `localStorage`, read the `shop-preferences` key, seed a version 1 value and plug a fake Redux DevTools extension into `window.__REDUX_DEVTOOLS_EXTENSION__`.
