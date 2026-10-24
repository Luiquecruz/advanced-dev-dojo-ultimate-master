Child paths are relative: write `'profile'`, not `'/settings/profile'`. A leading slash would make it an absolute path.
---
A record can render several views at once with `components: { default: A, sidebar: B }`. Each key matches a `<RouterView name="...">` (the unnamed one is `default`).
---
Nested routes need a nested `<RouterView />` inside the parent component (`SettingsLayout`). Without it, the child has nowhere to render.
---
The empty child path `''` matches `/settings` exactly: `{ path: '', redirect: { name: 'settings-profile' } }`.
