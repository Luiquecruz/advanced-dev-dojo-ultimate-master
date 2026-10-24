`const SettingsTab = defineAsyncComponent(() => import('./SettingsTab.vue'))` gives you a component you can use like any other.
---
Keep the map plain: `const tabs = { Home: HomeTab, Profile: ProfileTab, Settings: SettingsTab }` and only make the name reactive: `const current = ref('Home')`.
---
`v-for="(_, name) in tabs"` iterates object keys. Render the panel with `<component :is="tabs[current]" />`.
