1. Split the problem into three questions asked in order: who is calling (authentication, 401), may this kind of user call this route (role, 403), may this user touch this specific object (ownership, 403).
2. Authentication is a middleware mounted on the whole `/api/*` prefix, so new routes are protected by default instead of by remembering to add a check.
3. Parse the header strictly and fail closed: anything that is not exactly a bearer token is treated as anonymous, and anonymous means 401 with the `WWW-Authenticate` challenge.
4. Pass the user to handlers through the context (`c.set` / `c.get`), typed by `AppEnv`, instead of re-reading the token in each handler.
5. Roles are route-level and reusable, so `requireRole` is a factory that returns a middleware for the given roles.
6. Ownership depends on data, so it lives in the handler (or the service): load the object, return 404 when it does not exist, then compare its owner with the caller before changing anything.
