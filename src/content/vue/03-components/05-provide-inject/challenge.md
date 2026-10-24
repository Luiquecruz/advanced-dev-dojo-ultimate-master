Share a theme across components without prop drilling.

**`keys.ts`** already exports the `ThemeContext` interface and `ThemeKey`.

**`App.vue`**

1. Hold `theme` in a ref that starts as `"light"`.
2. `provide(ThemeKey, ...)` an object with `theme: readonly(theme)` and a `toggle()` function that switches between `"light"` and `"dark"`.

**`ThemedPanel.vue`**

3. `inject(ThemeKey, ...)` with a default context whose theme is `"light"` (so it works without a provider).
4. Render `<section>` with the classes `panel` and the current theme (e.g. `class="panel dark"`), containing a default slot.

**`ThemeToggle.vue`**

5. Inject the context and render a `<button>` that calls `toggle()`. Its text is `Switch to dark` when the theme is light and `Switch to light` when it is dark.
