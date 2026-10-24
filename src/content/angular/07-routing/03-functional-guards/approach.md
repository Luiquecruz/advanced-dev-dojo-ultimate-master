1. In `authGuard`, inject `AuthService` and return `true` when `isLoggedIn()` is true.
2. For the denied case, inject `Router` and return `createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`.
3. In `unsavedChangesGuard`, read `component.dirty()`; return `true` when clean, or the boolean from `window.confirm(...)`.
4. Add `canActivate: [authGuard]` to the `dashboard` route and `canDeactivate: [unsavedChangesGuard]` to the `editor` route.
5. Notice the `Login` component already reads `returnUrl`, closing the redirect loop.
