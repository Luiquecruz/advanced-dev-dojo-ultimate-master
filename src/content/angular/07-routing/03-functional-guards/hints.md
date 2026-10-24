Guards run inside an injection context, so you can call `inject()` directly in the function body: `const auth = inject(AuthService);`
---
Prefer returning a `UrlTree` over calling `router.navigate()` inside a guard. The router cancels the current navigation and starts a redirect cleanly: `inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`.
---
`CanDeactivateFn<Editor>` receives the component instance as its first argument: `(component) => !component.dirty() || window.confirm('Discard unsaved changes?')`.
---
Guards are attached as arrays on the route: `{ path: 'dashboard', component: Dashboard, canActivate: [authGuard] }`.
