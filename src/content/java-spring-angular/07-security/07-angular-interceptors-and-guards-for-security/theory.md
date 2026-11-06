# Angular Interceptors and Guards for Security

An Angular client has two jobs in a secured system: attach the right credential to API calls, and send users somewhere sensible when the API says no. Functional interceptors and route guards do those jobs in one place instead of in every component. Module 06 introduces the `HttpClient` and routing mechanics; this lesson adds the security view, and above all the rule that nothing in the browser is a security boundary. It is theory only, with a quiz.

You need: Sessions Versus Tokens (where a browser keeps a token), JWT and OAuth 2 Resource Servers (bearer tokens, 401 and 403), CSRF and CORS (the `XSRF-TOKEN` cookie).

## Client checks are user experience, not security

A route guard decides whether the router navigates; it does not stop anyone from calling the API. Anyone can open the developer tools, change a role flag in memory, edit the bundle or send requests with a command-line tool. So a guard that hides the admin page is a convenience for honest users, and the Spring rules from the earlier lessons are the real protection. Design the client to follow the server: when the API answers 401 or 403, the client reacts; it never decides on its own that a caller is allowed.

## A small authentication store

The interceptors and guards below share one source of truth. This service keeps the access token in memory, which survives navigation but not a page reload, and exposes signals:

```ts
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly token = signal<string | null>(null);
  private readonly roleNames = signal<readonly string[]>([]);

  readonly accessToken = this.token.asReadonly();
  readonly isAuthenticated = computed(() => this.token() !== null);

  signIn(accessToken: string, roles: readonly string[]): void {
    this.token.set(accessToken);
    this.roleNames.set(roles);
  }

  signOut(): void {
    this.token.set(null);
    this.roleNames.set([]);
  }

  hasRole(role: string): boolean {
    return this.roleNames().includes(role);
  }
}
```

The roles here only drive the user interface. The server reads the roles from the token itself.

## An interceptor that adds the bearer token

A functional interceptor (`HttpInterceptorFn`) receives the request and a `next` function. Requests are immutable, so you clone to change them. Attach the token only to your own API, so a third-party URL never receives it:

```ts
export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).accessToken();
  if (token === null || !request.url.startsWith('/api/')) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

Relative `/api/` URLs also keep requests same-origin, which is what Angular's built-in XSRF header support needs.

## An interceptor that reacts to 401

A 401 means the credential is missing, expired or rejected. Clear the local state and send the user to sign in, remembering where they were. Always rethrow the error so the caller still sees the failure:

```ts
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (request.url.startsWith('/api/') && request.url !== '/api/auth/login' &&
          error instanceof HttpErrorResponse && error.status === 401) {
        authStore.signOut();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
```

Do not sign the user out on 403: they are authenticated but lack a permission, so show a message instead. A real application may try one token refresh on 401 and replay the request, but it must send only one refresh at a time, and the login request itself must be excluded so a wrong password does not loop. Interceptors run in the order of the `withInterceptors` array.

## Route guards

A `CanActivateFn` returns `true`, or a `UrlTree` that redirects, which is better than returning `false` and navigating by hand:

```ts
export const authenticatedGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthStore).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export function roleGuard(role: string): CanActivateFn {
  return () => (inject(AuthStore).hasRole(role) ? true : inject(Router).parseUrl('/forbidden'));
}
```

Guards listed in one array start together and the router does not wait for one before starting the next, so each guard must check what it needs by itself. Register everything in the application configuration:

```ts
export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authenticatedGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./admin-page').then((module) => module.AdminPage),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([bearerTokenInterceptor, unauthorizedInterceptor])),
  ],
};
```

## Common mistakes

- Treating a guard as authorization. The API must enforce every rule, because a guard only controls navigation in the user's own browser.
- Adding the bearer token to every outgoing request, which leaks it to third-party hosts. Match your own API prefix.
- Swallowing the error in the interceptor instead of rethrowing it, so components never learn the request failed.
- Signing the user out on 403, which hides a missing permission behind a confusing login screen.

## In practice

Keep the client thin: one store, one or two interceptors, a handful of guards, and tests for the redirect on 401. Treat the stored token as valuable, fix cross-site scripting first, and prefer a backend for frontend when the data is sensitive. Then the Angular code holds no token at all.

## Check yourself

1. A user edits the role flag in memory and opens the admin route. What stops them from deleting data?
2. Why does the bearer interceptor check the request URL before adding the header?
3. Why does the 401 interceptor call `throwError` after clearing the session?
