1. Fill the `routes` array: the two pages with their `title`, then the `home` redirect, then the `**` wildcard at the end.
2. Pass `routes` to `provideRouter()` inside `appConfig.providers`.
3. Add `RouterOutlet`, `RouterLink` and `RouterLinkActive` to the `imports` of `App`.
4. Write the two links in `<nav>` with `routerLink` and `routerLinkActive="active"`, adding `exact: true` options to the Home link.
5. Place `<router-outlet />` inside `<main>` so the active page renders there.
