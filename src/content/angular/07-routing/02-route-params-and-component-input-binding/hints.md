Route params are declared with a colon: `{ path: 'users/:id', component: UserDetail }`. In the list, build links with `[routerLink]="['/users', user.id]"`.
---
`provideRouter(routes, withComponentInputBinding())` makes the router write path params, query params and resolved data into component inputs **with the same name**.
---
Inputs are signals: when the router writes a new value into the same instance, every `computed` and template that reads `id()` updates.
`readonly id = input.required({ transform: numberAttribute });`
---
Missing query params arrive as `undefined`, so the query input stays optional: `readonly tab = input<string>();`
