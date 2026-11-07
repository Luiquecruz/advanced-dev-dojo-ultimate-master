Persist preferences with a version. **`preferences.ts`** exports the token `STORAGE` (an object with `getItem(key)`, `setItem(key, value)`), the `Preferences` interface `{ theme: 'light' | 'dark'; fontSize: number }` and `PreferencesStore` (`@Injectable({ providedIn: 'root' })`).

1. The defaults are `{ theme: 'light', fontSize: 16 }`. `preferences` is a read-only signal of the current value.
2. On creation the store reads the key `'prefs'`. The stored text is `{"version":2,"data":{"theme":...,"fontSize":...}}`.
3. A stored version-1 envelope has `data: { dark: boolean }`. It migrates to `{ theme: dark ? 'dark' : 'light', fontSize: 16 }`.
4. Anything else (missing key, invalid JSON, an unknown version, a version-2 value with a wrong `theme` or a non-numeric `fontSize`) yields the defaults and never throws. A stored `fontSize` outside 12 to 24 is clamped into that range.
5. `setTheme(theme)` and `setFontSize(size)` update the signal and write a version-2 envelope with only `theme` and `fontSize` to `'prefs'`. `setFontSize` clamps the size between `12` and `24`.
6. A `setItem` that throws (full or blocked storage) must not break the setters: the signal still holds the new value.
