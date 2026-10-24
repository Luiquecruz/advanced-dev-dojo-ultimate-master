## Environment injectors and app initializers

Element injectors hold component state. **Environment injectors** hold everything else: HTTP, the router, your root services and whatever you pass to `bootstrapApplication()`.

```ts
// main.ts
bootstrapApplication(App, appConfig);

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
```

`appConfig.providers` go into the **root environment injector**. Route `providers` create child environment injectors for a part of the app, and `createEnvironmentInjector(providers, parent)` creates one by hand (useful for plugin systems and dynamic components).

### `provideX()` functions

Notice the pattern: `provideRouter()`, `provideHttpClient()`. Each returns **`EnvironmentProviders`**, an opaque bundle that can only be used in environment injectors, never in a component's `providers`. You can build your own with `makeEnvironmentProviders()`:

```ts
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export const ANALYTICS_KEY = new InjectionToken<string>('ANALYTICS_KEY');

export function provideAnalytics(key: string): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ANALYTICS_KEY, useValue: key },
    Analytics,
  ]);
}
```

This is how libraries hide their configuration details: consumers write `provideAnalytics('abc')` and never touch tokens directly. Angular also exports `importProvidersFrom(SomeNgModule)` to pull providers out of legacy NgModules.

### Running code before the app starts: `provideAppInitializer`

Sometimes the app must not render until something is ready: the logged-in user, remote configuration, translations. Register an **app initializer**:

```ts
import { inject, provideAppInitializer } from '@angular/core';

provideAppInitializer(() => inject(ConfigService).load());
```

- The callback runs in an **injection context**, so `inject()` works directly.
- If it returns a `Promise` or an `Observable`, Angular **waits** for it before bootstrapping the root component.
- Several initializers run in parallel.
- If one rejects, bootstrap fails, so handle expected errors inside the initializer.

### Legacy: `APP_INITIALIZER`

Before Angular 19 the same thing required a multi provider and a factory returning a function:

```ts
{
  provide: APP_INITIALIZER,
  multi: true,
  deps: [ConfigService],
  useFactory: (config: ConfigService) => () => config.load(),
}
```

`APP_INITIALIZER` and `ENVIRONMENT_INITIALIZER` are **deprecated**. Use `provideAppInitializer()` and `provideEnvironmentInitializer()`.

### `provideEnvironmentInitializer`

Runs synchronously when an environment injector is created (the root one, or a lazy route's). It is not awaited. Use it for eager setup like registering icons or starting a service that must exist even if nobody injects it:

```ts
provideEnvironmentInitializer(() => inject(ThemeService).applySavedTheme());
```

### `runInInjectionContext`

Outside construction time you can still borrow an injector:

```ts
const injector = inject(EnvironmentInjector);
runInInjectionContext(injector, () => inject(Logger).log('later'));
```

### Pitfalls

- Slow initializers delay the first paint. Load only what is truly required; fetch the rest lazily.
- `EnvironmentProviders` in a component's `providers` throws an error: they belong in `appConfig`, route `providers` or `createEnvironmentInjector()`.
- Initializers that silently swallow errors leave the app in a half-configured state. Decide explicitly: fail bootstrap or fall back to defaults.
