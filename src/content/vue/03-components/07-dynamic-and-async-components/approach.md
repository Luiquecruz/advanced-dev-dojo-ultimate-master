1. Wrap the dynamic import of `SettingsTab.vue` in `defineAsyncComponent`.
2. Build a plain object from tab names to components and a ref holding the active name.
3. Loop over the object keys to render the tab buttons, binding `aria-selected` and a click handler.
4. Render `<component :is="tabs[current]" />` in the tab panel.
