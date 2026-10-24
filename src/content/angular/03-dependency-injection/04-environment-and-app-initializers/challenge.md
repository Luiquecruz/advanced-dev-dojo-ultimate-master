Load the signed-in user **before** the app renders, packaged as a reusable `provideSession()` function.

**`session.ts`**

1. Export `SESSION_USER_ID`, an `InjectionToken<number>`.
2. Export `CurrentUser`, provided in root, with:
   - `user`: a signal of `{ id: number; name: string } | null`, starting at `null`.
   - `load(): Promise<void>`: fetches `/api/users/<id>` using the id injected from `SESSION_USER_ID` and stores the JSON in `user`.
3. Export `provideSession(userId: number): EnvironmentProviders` built with `makeEnvironmentProviders()`. It provides `SESSION_USER_ID` with `userId` and registers `provideAppInitializer()` that returns `inject(CurrentUser).load()`.

**`app.ts`**

1. Export `appConfig: ApplicationConfig` with `providers: [provideSession(3)]`.
2. Export a `Welcome` component (selector `app-welcome`) rendering `<p>Welcome, {name}</p>` from `CurrentUser.user()`.

Nothing is fetched unless `provideSession()` is used. Do not use the deprecated `APP_INITIALIZER` token.
