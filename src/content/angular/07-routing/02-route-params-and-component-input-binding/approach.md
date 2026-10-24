1. Write the three routes, with the empty-path redirect using `pathMatch: 'full'` and the param route `users/:id`.
2. Enable component input binding by passing `withComponentInputBinding()` to `provideRouter()` in `appConfig`.
3. In `UserList`, loop over `users` with `@for` and render `<a [routerLink]="['/users', user.id]">`.
4. In `UserDetail`, replace the `id` placeholder with `input.required({ transform: numberAttribute })`; `user` is a `computed` over it.
5. Replace the `tab` placeholder with an optional `input<string>()`.
6. Navigate to `/users/1`, click "Next user" and confirm the heading changes without the component being recreated.
