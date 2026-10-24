Build a user-preferences store with `@ngrx/signals`. The project has two files.

**`preferences.store.ts`** exports `PreferencesStore`, created with `signalStore({ providedIn: 'root' }, ...)`:

1. State via `withState`: `{ theme: 'light', fontSize: 16 }` (`theme` is `'light' | 'dark'`).
2. Methods via `withMethods`, all writing with `patchState`:
   - `toggleTheme()` switches between `'light'` and `'dark'`.
   - `increaseFont()` adds 2, never above `24`.
   - `decreaseFont()` subtracts 2, never below `12`.
   - `reset()` restores `{ theme: 'light', fontSize: 16 }`.

**`app.ts`** exports the `PreferencesPanel` component (selector `app-preferences`) that injects the store and renders:

- `<p>Theme: light</p>` and `<p>Font size: 16px</p>`
- buttons with the exact texts `Toggle theme`, `A+`, `A-` and `Reset`, each calling the matching method.
