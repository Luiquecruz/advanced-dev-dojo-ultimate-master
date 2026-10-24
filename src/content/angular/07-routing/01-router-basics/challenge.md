Build a small routed application in `app.ts`. The three page components `Home`, `About` and `NotFound` are already written.

1. Export `routes: Routes` with:
   - `''` → `Home`, with `title: 'Home'`
   - `'about'` → `About`, with `title: 'About'`
   - `'home'` → redirect to `''` (`pathMatch: 'full'`)
   - `'**'` → `NotFound` (must be the **last** route)
2. In the `App` component (selector `app-root`):
   - Inside `<nav>`, a link with the text `Home` pointing to `/` and a link with the text `About` pointing to `/about`. Use `routerLink`, never `href`.
   - Both links get `routerLinkActive="active"`. The Home link must only be active on exactly `/` (`[routerLinkActiveOptions]="{ exact: true }"`).
   - Inside `<main>`, a `<router-outlet />`.
3. Export `appConfig: ApplicationConfig` that registers the router with `provideRouter(routes)`.
