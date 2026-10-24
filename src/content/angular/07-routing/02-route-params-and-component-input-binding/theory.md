## Reading values from the URL

Real apps put state in the URL: `/users/42?tab=activity`. That makes pages shareable and bookmarkable. The router splits it into:

- **Route params**: dynamic segments declared with a colon, `{ path: 'users/:id', component: UserDetail }`.
- **Query params**: optional `?key=value` pairs. They do not affect matching.

Links build URLs with a **commands array**, which encodes values safely:

```html
<a [routerLink]="['/users', user.id]" [queryParams]="{ tab: 'activity' }">{{ user.name }}</a>
```

### Modern: component input binding

Enable the feature once:

```ts
provideRouter(routes, withComponentInputBinding());
```

Now the router writes path params, query params, static route `data` and resolver results into **inputs with the same name**:

```ts
@Component({ template: `<h2>User {{ id() }} – {{ tab() ?? 'profile' }}</h2>` })
export class UserDetail {
  readonly id = input.required({ transform: numberAttribute });
  readonly tab = input<string>();
}
```

The component no longer knows it is routed. You can reuse it elsewhere with `<app-user-detail [id]="3" />` and test it by setting inputs. Every value is a **string**, so transforms like `numberAttribute` and `booleanAttribute` are handy. Absent query params arrive as `undefined`.

Decorator inputs (legacy style) receive the same values. A setter was the classic way to react to each new value:

```ts
@Input({ transform: numberAttribute })
set id(value: number) {
  this.userId.set(value);
}
```

### Classic: ActivatedRoute

Before input binding (Angular 16), components injected `ActivatedRoute`:

```ts
private readonly route = inject(ActivatedRoute);

readonly id = toSignal(
  this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
);
readonly tab = toSignal(this.route.queryParamMap.pipe(map((query) => query.get('tab') ?? 'profile')));
```

`ActivatedRoute` is still useful for parent params, `fragment`, `url` segments and `data` streams.

### The snapshot pitfall

```ts
const id = this.route.snapshot.paramMap.get('id'); // read once!
```

When the user goes from `/users/1` to `/users/2`, the router **reuses the same component instance** because the route config is identical. Constructor code does not run again, so a snapshot read stays stale. Observables (`paramMap`) and input binding both deliver every new value. Use `snapshot` only when the param can never change while the component is alive.

### Other details

- Matrix params (`/users;sort=name`) exist but are rarely used.
- `paramsInheritanceStrategy: 'always'` (in `withRouterConfig`) lets child routes see parent params through input binding.
- Inputs bound by the router are reset to `undefined` when the param disappears, so always handle the missing case.
