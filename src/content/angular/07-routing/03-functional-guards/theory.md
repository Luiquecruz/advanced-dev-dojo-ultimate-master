## Guards decide whether navigation may happen

A guard is a function the router calls during navigation. It can **allow** (`true`), **block** (`false`) or **redirect** (a `UrlTree` or `RedirectCommand`). It may also return a `Promise` or `Observable` of those values when the answer is asynchronous.

| Guard | Question it answers |
| --- | --- |
| `canMatch` | May this route config be used at all? (runs before lazy code loads) |
| `canActivate` | May the user enter this route? |
| `canActivateChild` | May the user enter any child of this route? |
| `canDeactivate` | May the user leave this component? |

### Modern: functional guards

Since Angular 14.2 a guard is just a function. It runs in an **injection context**, so `inject()` works directly:

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
];
```

`state.url` is the URL being requested, so the login page can send the user back afterwards.

Guards compose well as factories:

```ts
export const roleGuard = (role: string): CanMatchFn => () =>
  inject(AuthService).roles().includes(role);

{ path: 'admin', canMatch: [roleGuard('admin')], loadComponent: () => import('./admin') }
```

### Leaving a page

`CanDeactivateFn<T>` receives the component instance, perfect for unsaved changes:

```ts
export const unsavedChangesGuard: CanDeactivateFn<Editor> = (component) =>
  !component.dirty() || window.confirm('Discard unsaved changes?');
```

### Redirects: UrlTree vs navigate()

Avoid this pattern:

```ts
// ❌ starts a second navigation while the first is still running
inject(Router).navigate(['/login']);
return false;
```

Returning a `UrlTree` lets the router cancel and redirect in one step. Angular 18 added `RedirectCommand` for redirects with extra options:

```ts
return new RedirectCommand(router.parseUrl('/login'), { skipLocationChange: true });
```

### Legacy: class-based guards

Older code used injectable classes:

```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.auth.isLoggedIn() || this.router.createUrlTree(['/login']);
  }
}
```

Class guards and the `CanActivate` interfaces were deprecated in v15.2. During a migration, `mapToCanActivate([AuthGuard])` adapts a class to the functional API. New code should write functions: less boilerplate, easy composition, trivial to test with `TestBed.runInInjectionContext(() => authGuard(route, state))`.

### Pitfalls

- **Guards are not security.** They improve UX; your API must still check permissions on every request.
- `canActivate` on a lazy route still downloads its code. Use `canMatch` to skip both matching and loading.
- A guard returning an `Observable` that never completes blocks navigation forever. Use `take(1)` or a signal.
