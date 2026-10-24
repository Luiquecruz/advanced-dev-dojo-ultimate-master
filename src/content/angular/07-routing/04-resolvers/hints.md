A resolver runs in an injection context, like a guard: `const http = inject(HttpClient);` and `const router = inject(Router);` at the top of the function.
---
Build the URL from the snapshot: `` http.get<User>(`/api/users/${route.paramMap.get('id')}`) ``. The router subscribes for you and waits for the first value.
---
An error inside a resolver cancels the navigation. Recover with `catchError(() => of(new RedirectCommand(router.parseUrl('/not-found'))))`.
---
The key in `resolve: { user: userResolver }` becomes the input name: `readonly user = input.required<User>();` and in the template `{{ user().name }}`.
