1. In `App.vue`, create `theme` with `ref<'light' | 'dark'>('light')`.
2. Provide `{ theme: readonly(theme), toggle }`, where `toggle` flips the ref.
3. In `ThemedPanel.vue`, inject with a default context and bind the classes from the injected ref.
4. In `ThemeToggle.vue`, inject the context, call `toggle` on click and derive the label from the theme.
