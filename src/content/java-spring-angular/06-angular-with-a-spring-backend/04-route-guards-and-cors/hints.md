A functional guard may return an `Observable`. Build it from the request: `inject(HttpClient).get<Session>('/api/me').pipe(map(() => true), catchError(...))`. Call `inject(...)` at the top of the guard, not inside the operators.
---
`catchError` receives an `HttpErrorResponse`. Return `of(urlTree)` for each case and branch on `error.status`. Create trees with `inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`.
---
Only 401 means "not logged in" and only 403 means "logged in but not allowed". Everything else, including status `0` for a network failure, is a different problem and goes to `/unavailable`.
---
`new URL('/api/x', 'http://localhost:4200').origin` is `http://localhost:4200`: comparing two `.origin` values answers `isCrossOrigin`. For the route, add `canActivate: [authGuard]`.
