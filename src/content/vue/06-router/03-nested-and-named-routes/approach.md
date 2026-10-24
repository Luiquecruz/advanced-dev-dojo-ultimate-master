1. In `router.ts`, add the `/settings` record with `components: { default: SettingsLayout, sidebar: SettingsSidebar }`.
2. Give it a `children` array with the redirecting `''` child and the two named children using relative paths.
3. In `SettingsLayout.vue`, place `<RouterView />` after the sub navigation so children render inside the layout.
4. In `App.vue`, add `<RouterView name="sidebar" />` inside `<aside>`; it stays empty on routes that do not define a `sidebar` view.
