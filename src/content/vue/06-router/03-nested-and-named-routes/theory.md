## Nested routes

Real UIs are trees: a settings page has a header and a sub-menu that stay put while the inner panel changes. Nested routes mirror that tree in the URL:

```
/settings/profile                 /settings/account
+--------------------+            +--------------------+
| SettingsLayout     |            | SettingsLayout     |
| +----------------+ |            | +----------------+ |
| | ProfileSettings| |            | | AccountSettings| |
| +----------------+ |            | +----------------+ |
+--------------------+            +--------------------+
```

```ts
{
  path: '/settings',
  component: SettingsLayout,
  children: [
    { path: '', redirect: { name: 'settings-profile' } },
    { path: 'profile', name: 'settings-profile', component: ProfileSettings },
    { path: 'account', name: 'settings-account', component: AccountSettings },
  ],
}
```

```vue
<!-- SettingsLayout.vue -->
<template>
  <h1>Settings</h1>
  <RouterView /> <!-- the matched child renders here -->
</template>
```

Key rules:

- Child paths **without** a leading `/` are appended to the parent path. A child path starting with `/` is absolute, which is rarely what you want.
- Each level of nesting needs its own `<RouterView />`. The top-level one in `App.vue` renders `SettingsLayout`, the one inside `SettingsLayout` renders the child.
- `route.matched` lists every record from the root to the leaf (`[settingsRecord, profileRecord]`). Guards and `meta` checks often iterate it.
- An empty child path `''` matches the parent URL exactly. Use it for a default tab or, as here, to redirect.

### Naming nested routes

If the parent has a `name` *and* an empty-path child, `router.push({ name: 'settings' })` renders the layout **without** the child (a common bug). Put the name on the child or redirect from the empty child, as in the example. Vue Router warns in development about this case.

## Named views

Sometimes one route fills several sibling outlets: a main area plus a sidebar. Give the outlets names and map components to them with `components` (plural):

```vue
<!-- App.vue -->
<main><RouterView /></main>
<aside><RouterView name="sidebar" /></aside>
```

```ts
{
  path: '/settings',
  components: { default: SettingsLayout, sidebar: SettingsSidebar },
  children: [/* ... */],
}
```

A `<RouterView>` whose name is not provided by the current route renders nothing, so `/` shows an empty `<aside>`.

## Redirects and aliases

```ts
{ path: '/home', redirect: '/' }                         // string
{ path: '/me', redirect: { name: 'settings-profile' } }   // location
{ path: '/legacy/:id', redirect: (to) => ({ name: 'user', params: { id: to.params.id } }) }
{ path: '/', component: HomeView, alias: '/start' }       // same page, two URLs, no redirect
```

A redirect replaces the URL; an alias keeps the visited URL and renders the same record.

## With file-based routing

In Vue Router 5 file-based routing, a `settings.vue` file next to a `settings/` folder becomes the parent layout of `settings/profile.vue` and `settings/account.vue`. A `settings/_parent.vue` file is an alternative location for the layout, and named views use the `@name` suffix (`index@sidebar.vue`).

## Pitfalls

- Forgetting the nested `<RouterView />` renders the layout with no content.
- Using `component` (singular) when you meant `components` for named views.
- Absolute child paths silently break the nesting relationship in the URL.
