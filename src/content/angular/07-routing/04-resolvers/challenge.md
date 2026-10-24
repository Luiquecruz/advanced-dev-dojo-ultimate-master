Load a user **before** the profile page activates, using a functional resolver in `app.ts`. The fake API serves `GET /api/users/:id` (users 1–5) and answers `404` for unknown ids.

1. `userResolver: ResolveFn<User>`
   - reads the `id` param from `route.paramMap`;
   - returns `inject(HttpClient).get<User>('/api/users/<id>')`;
   - when the request fails, emits `new RedirectCommand(router.parseUrl('/not-found'))` instead of erroring.
2. In `routes`, attach the resolver to `users/:id` as `resolve: { user: userResolver }`.
3. `UserProfile` declares `user = input.required<User>()` (filled by `withComponentInputBinding()`) and renders:
   - the name in an `<h2>`;
   - the email in a `<p>`.
