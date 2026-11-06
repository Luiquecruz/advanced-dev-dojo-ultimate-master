# Route Guards and CORS

Two things stand between an Angular screen and a Spring API: who may open a page, and whether the browser lets the page talk to another origin at all. A route guard answers the first question for the user's benefit, and CORS is the browser's answer to the second. This lesson shows a guard that asks the server who the user is, explains why CORS errors are fixed on the server, and sets up the development proxy that avoids them while you build.

You need: Calling the API with HttpClient and httpResource, Problem Details and Form Errors.

## A guard improves navigation, it does not protect data

A **functional guard** is a plain function that the router calls before it activates a route. It can read services with `inject()` and returns a boolean, a `UrlTree` that redirects, or a `Promise` or `Observable` of either. The router uses the first value an observable emits.

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(HttpClient)
    .get<Session>('/api/me')
    .pipe(
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
        }
        if (error.status === 403) {
          return of(router.createUrlTree(['/forbidden']));
        }
        return of(router.createUrlTree(['/unavailable']));
      }),
    );
};

export const routes: Routes = [{ path: 'courses', component: Courses, canActivate: [authGuard] }];
```

Everything the browser runs belongs to the user, who can read the code, change it or skip the router and call the API directly. The guard therefore only saves a logged-out visitor from a blank page. The real check is on the server, where Spring answers **401 Unauthorized** when it does not know who is calling and **403 Forbidden** when it knows and the answer is no. Module 07 covers the Spring Security side.

The guard above asks the server instead of reading a flag in the browser, because the server owns the session. It treats the statuses differently: 401 means log in, 403 means a missing permission, and anything else, such as a 503 or a network failure with status `0`, is not an authentication problem and must not send people to a login page.

## CORS is a browser rule

An **origin** is the combination of scheme, host and port. A page served from `http://localhost:4200` and an API at `http://localhost:8080` are different origins because the ports differ. By default a browser lets a script read a response from another origin only if that server opts in with CORS response headers such as `Access-Control-Allow-Origin`. For requests that are not simple, such as a `PATCH` or a request with an `Authorization` header, the browser first sends an `OPTIONS` **preflight** request and sends the real request only when the answer allows it.

```ts
export function isCrossOrigin(requestUrl: string, pageOrigin: string): boolean {
  return new URL(requestUrl, pageOrigin).origin !== new URL(pageOrigin).origin;
}
```

A relative URL such as `/api/courses` resolves against the page, so it is same-origin and never triggers CORS.

The consequence is that **the fix lives on the server**. The Angular code cannot grant itself permission, and switching the request mode does not make the response readable. Spring MVC lets you declare which origins, methods and headers are allowed:

```java
@Configuration
class WebCorsConfiguration implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("Content-Type", "Authorization")
                .allowCredentials(true)
                .maxAge(1800);
    }
}
```

Spring answers preflight requests for the mappings you declare. Without a matching configuration it adds no CORS headers, and the browser blocks the call. With `allowCredentials(true)`, the wildcard `"*"` is not accepted in `allowedOrigins`; list the origins, or use `allowedOriginPatterns`. When Spring Security is on the classpath, its filter chain must also be told to apply CORS, which module 07 shows.

## The development proxy

During development the Angular dev server runs on one port and Spring, which listens on port 8080 by default, on another. A proxy removes the problem from the browser's point of view: the page calls its own origin, and the dev server forwards `/api` to Spring server to server. The Angular CLI reads the rules from a file passed to the `serve` target:

```json
{
  "/api/**": {
    "target": "http://localhost:8080",
    "secure": false
  }
}
```

Save it as `src/proxy.conf.json` and set `"proxyConfig": "src/proxy.conf.json"` in the `serve` options of `angular.json`. Restart `ng serve` after every change. The path matters: `/api/**` covers `/api` and everything below it, while `/api/*` covers one segment only. In production the same effect comes from serving the front end and the API behind one reverse proxy, or from a CORS configuration like the one above.

## Common mistakes

- Redirecting to the login page on every failed call in a guard. A 503 or a dropped network then looks like a logout, and users retype passwords for a server problem.
- Trusting a guard as security. The data stays reachable through the API, so every endpoint needs its own authorization on the server.
- Fixing a CORS error in Angular by changing request options. The headers that decide the outcome come from the response, so only the server can change it.
- Using `*` as the allowed origin together with credentials, then wondering why Spring rejects the setup.

## In practice

Teams keep one guard for "is there a session" and use the roles from `/api/me` for finer checks in the template, while the server enforces every rule again. A proxy file lives in the repository next to `angular.json`, so a new developer starts the front end and the API with no CORS setup at all.

## Check yourself

1. Why must a guard never be the only protection for an endpoint?
2. Are `http://localhost:4200` and `http://localhost:8080` the same origin, and does a request to the relative URL `/api/users` from the first one count as cross-origin?
3. Where is a CORS error fixed, and what does the development proxy change?
