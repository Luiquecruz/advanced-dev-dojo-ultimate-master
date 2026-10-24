Use `Partial`, `Required` and `Readonly` to type a settings module.

1. `DEFAULT_SETTINGS` must be typed `Readonly<Required<UserSettings>>` with
   `{ theme: 'light', language: 'en', notifications: true, fontSize: 16 }`.
2. `updateSettings(current: Readonly<UserSettings>, changes: Partial<UserSettings>): Readonly<UserSettings>`
   — returns a **new frozen object** (`Object.freeze`) with the changes applied. The input is never mutated.
3. `resolveSettings(settings: Partial<UserSettings>): Required<UserSettings>` — fills every missing value
   from `DEFAULT_SETTINGS`. A property explicitly set to `undefined` must also fall back to the default.

```ts
resolveSettings({ theme: 'dark', fontSize: undefined });
// { theme: 'dark', language: 'en', notifications: true, fontSize: 16 }
```
