1. Inside `userResolver`, inject `HttpClient` and `Router`.
2. Return `http.get<User>()` for `/api/users/` plus the `id` from `route.paramMap`.
3. Pipe `catchError` to map any failure to `of(new RedirectCommand(router.parseUrl('/not-found')))`.
4. Add `resolve: { user: userResolver }` to the `users/:id` route.
5. Declare `user = input.required<User>()` in `UserProfile` and render `user().name` and `user().email`.
