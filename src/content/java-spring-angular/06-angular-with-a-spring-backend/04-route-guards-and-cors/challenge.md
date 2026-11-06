Prepare an Angular app for a Spring back end that owns the session. The project has one file, `app.ts`, with the pages and the `routes` already written.

**`authGuard: CanActivateFn`**

1. Ask the server who the user is: `GET /api/me`, typed as `Session`. Return an `Observable`:
   - answer `200` → `true`;
   - `401` → a `UrlTree` for `/login` with the query parameter `returnUrl` set to `state.url` (visiting `/courses` ends at `/login?returnUrl=%2Fcourses`);
   - `403` → a `UrlTree` for `/forbidden`;
   - any other failure (server error, network error) → a `UrlTree` for `/unavailable`.
2. Protect the `courses` route with `authGuard`.

**Browser rules**

3. `isCrossOrigin(requestUrl, pageOrigin)` returns `true` when the request URL, resolved against `pageOrigin`, has a different scheme, host or port. Relative URLs are same-origin.
4. `devProxyConfig` is the object you would save as `proxy.conf.json`: it forwards `/api/**` to `http://localhost:8080` with `secure: false`, so the browser only talks to the dev server's own origin.

Do not catch the error and return `true`: a guard only improves the navigation, and the server still decides who may call its API.
