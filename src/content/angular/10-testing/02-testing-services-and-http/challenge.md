`user.service.ts` contains a finished `UserService` with `getUsers()`, `getAdmins()` (users whose `role` is `'admin'`) and `updateName(id, name)` (`PATCH /api/users/:id` with body `{ name }`). Write its spec in `user.service.spec.ts`.

`userServiceSpec({ it, beforeEach, afterEach, expect }, serviceType)` is run against the real service and against broken copies. Your spec must:

1. In `beforeEach`, provide `provideHttpClient()` and `provideHttpClientTesting()`, then inject `serviceType` and `HttpTestingController`.
2. In `afterEach`, call `http.verify()`.
3. Keep the three cases:
   - `getAdmins() requests GET /api/users and keeps only admins` (flush `[ada, alan]`, expect `[ada]`)
   - `updateName() sends a PATCH with the new name` (check URL `/api/users/2`, method and body)
   - `propagates server errors` (flush status `500` for `getUsers()` and expect a rejection with `status` `500`)
4. Pass for the real service and catch each mutant: wrong URL, no admin filter, `PUT` instead of `PATCH`, and an extra unexpected request.

Always inject `serviceType`, not the imported `UserService`.
