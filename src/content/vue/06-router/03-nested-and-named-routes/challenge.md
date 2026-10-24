Build a settings area with a shared layout, child pages and a sidebar rendered through a named view. Every page component already exists.

**`router.ts`** — add a `/settings` record that:

1. Renders **two views**: `SettingsLayout` as the `default` view and `SettingsSidebar` as the `sidebar` view (use `components`, plural).
2. Has three `children`:
   - `''` (empty path) redirecting to the route named `settings-profile`,
   - `profile`, named `settings-profile`, rendering `ProfileSettings`,
   - `account`, named `settings-account`, rendering `AccountSettings`.

**`SettingsLayout.vue`** — render the matched child route below the sub navigation.

**`App.vue`** — render the `sidebar` named view inside `<aside>`.
