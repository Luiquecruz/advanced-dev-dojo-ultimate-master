1. Write the guard as a pipeline over `GET /api/me`: a successful response maps to `true`, which lets the navigation continue.
2. Resolve `Router` once at the top with `inject`, then use `createUrlTree` inside `catchError`. Returning a `UrlTree` makes the router redirect instead of cancelling the navigation.
3. Branch on `error.status`: 401 to the login page with the attempted URL as `returnUrl`, 403 to a page that explains the missing permission, and every other failure to a page that reports the outage. Sending a 5xx to the login page would make users retype passwords for a server problem.
4. Attach the guard to the `courses` route with `canActivate`.
5. Implement `isCrossOrigin` with the `URL` class: resolve the request URL against the page origin and compare the two `origin` strings. That is exactly the comparison the browser makes before it applies CORS rules.
6. Fill `devProxyConfig` with the `/api/**` key, the Spring server as `target` and `secure: false`. The dev server then forwards the call server to server, so the browser never sees a cross-origin request and no CORS header is needed in development.
