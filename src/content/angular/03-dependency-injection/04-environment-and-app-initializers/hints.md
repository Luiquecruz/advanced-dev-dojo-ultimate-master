The token needs no default: `export const SESSION_USER_ID = new InjectionToken<number>('SESSION_USER_ID');`. In `CurrentUser`, read it with `inject(SESSION_USER_ID, { optional: true })` so the service can still be created without a session.
---
`load()` is an `async` method: await `fetch('/api/users/' + this.userId)`, then `this.user.set(await response.json())`.
---
`provideSession()` returns `makeEnvironmentProviders([{ provide: SESSION_USER_ID, useValue: userId }, provideAppInitializer(() => inject(CurrentUser).load())])`. Returning the Promise is what makes Angular wait.
