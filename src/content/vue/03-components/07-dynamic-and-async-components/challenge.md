Build a tabbed panel in `App.vue` that swaps components and lazy-loads one of them.

1. Load `SettingsTab.vue` with `defineAsyncComponent(() => import('./SettingsTab.vue'))`. `HomeTab` and `ProfileTab` are imported normally.
2. Keep a plain (non-reactive) `tabs` object mapping `Home`, `Profile` and `Settings` to the three components, and a `current` ref with the active tab name (starts at `"Home"`).
3. Render one `<button role="tab">` per tab name with the name as text, `aria-selected="true"` on the active tab, and a click that activates it.
4. Render the active tab with `<component :is="...">` inside `<div role="tabpanel">`.

The tab components are already written: they render `<h2>Home</h2>`, `<h2>Profile</h2>` and `<h2>Settings</h2>`.
