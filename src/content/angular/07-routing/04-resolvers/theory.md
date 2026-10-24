## Resolvers: data before the page

A **resolver** fetches data during navigation. The router waits until it produces a value, then activates the route and hands the data to the component. The page never renders in a half-loaded state.

```
click → guards → resolvers (HTTP...) → component created with data
```

### Modern: functional resolvers

```ts
export const userResolver: ResolveFn<User> = (route) => {
  const router = inject(Router);
  return inject(HttpClient)
    .get<User>(`/api/users/${route.paramMap.get('id')}`)
    .pipe(catchError(() => of(new RedirectCommand(router.parseUrl('/not-found')))));
};

export const routes: Routes = [
  { path: 'users/:id', component: UserProfile, resolve: { user: userResolver } },
];
```

- The function runs in an **injection context**: `inject()` works.
- It may return a plain value, a `Promise` or an `Observable`. The router takes the **first** emitted value.
- Since Angular 18 it may return a `RedirectCommand` to send the user elsewhere.

### Receiving the data

With `withComponentInputBinding()`, each key of `resolve` is written into the input with the same name:

```ts
export class UserProfile {
  readonly user = input.required<User>();
}
```

Without input binding, read it from the activated route:

```ts
private readonly route = inject(ActivatedRoute);
readonly user = toSignal(this.route.data.pipe(map((data) => data['user'] as User)));
```

### Errors cancel navigation

If the observable errors, the navigation fails and the user stays on the previous page with no feedback. Always decide what should happen: redirect, return a fallback value, or let a global `withNavigationErrorHandler()` deal with it.

### When do resolvers re-run?

By default, when path params change (`runGuardsAndResolvers: 'paramsChange'`). Going from `/users/1` to `/users/5` re-runs `userResolver` and updates the input on the **same** component instance. Use `'paramsOrQueryParamsChange'` or `'always'` when query params affect the data.

### Legacy: class resolvers

```ts
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private http: HttpClient) {}
  resolve(route: ActivatedRouteSnapshot) {
    return this.http.get<User>(`/api/users/${route.paramMap.get('id')}`);
  }
}
```

The `Resolve` interface is deprecated like class guards. Use functions, or `mapToResolve(UserResolver)` while migrating.

### Resolver or loading state?

Resolvers make navigation feel **slower**: nothing changes on screen until the request finishes. Many modern apps prefer loading inside the component with `httpResource()` or `resource()` and showing a skeleton. Use a resolver when the page is meaningless without the data, or when you want redirects (404, permissions) to happen before anything renders. If you use resolvers, show a global progress bar by listening to `Router.events`.
