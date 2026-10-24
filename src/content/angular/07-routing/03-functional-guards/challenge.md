Protect routes with **functional guards** in `app.ts`. `AuthService`, `Login`, `Dashboard`, `Editor` and the routes are already written.

1. `authGuard: CanActivateFn`
   - returns `true` when `inject(AuthService).isLoggedIn()` is `true`;
   - otherwise returns a `UrlTree` for `/login` with the query param `returnUrl` set to the attempted URL (`state.url`). Example: visiting `/dashboard` while logged out ends at `/login?returnUrl=%2Fdashboard`.
2. `unsavedChangesGuard: CanDeactivateFn<Editor>`
   - returns `true` when `component.dirty()` is `false`;
   - otherwise returns the result of `window.confirm('Discard unsaved changes?')`.
3. Attach the guards in `routes`: `canActivate: [authGuard]` on `dashboard` and `canDeactivate: [unsavedChangesGuard]` on `editor`.

Do not write guard classes: both guards are plain functions.
