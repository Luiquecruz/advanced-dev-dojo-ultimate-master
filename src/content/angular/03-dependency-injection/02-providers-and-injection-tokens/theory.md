## Providers and injection tokens

`inject(X)` asks the injector for the value registered under the **token** `X`. A **provider** is the recipe that tells the injector what to return for that token. So far the class *was* the token and `providedIn: 'root'` was the recipe. Providers let you separate the two.

### The four provider recipes

```ts
providers: [
  Logger,                                                 // shorthand for { provide: Logger, useClass: Logger }
  { provide: Logger, useClass: MemoryLogger },            // another class for the same token
  { provide: API_URL, useValue: 'https://api.example.com' }, // a ready-made value
  { provide: Clock, useFactory: () => new Clock(inject(LOCALE_ID)) }, // computed lazily, can inject()
  { provide: OldLogger, useExisting: Logger },            // an alias: same instance as Logger
]
```

- `useClass` swaps the implementation without touching the consumers. Perfect for tests and for platform-specific code.
- `useValue` provides configuration objects, primitives or mocks.
- `useFactory` runs in an injection context, so it may call `inject()` (the old `deps: [...]` array is no longer needed).
- `useExisting` creates an alias. `useClass` would create a *second* instance.

### Tokens that are not classes: `InjectionToken`

Interfaces and primitives disappear at runtime, so they cannot be tokens. Create an `InjectionToken` instead:

```ts
import { InjectionToken, inject } from '@angular/core';

export interface AppSettings {
  theme: 'light' | 'dark';
  pageSize: number;
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS', {
  providedIn: 'root',
  factory: () => ({ theme: 'light', pageSize: 20 }),
});

const settings = inject(APP_SETTINGS); // typed as AppSettings
```

The string is only a debug description. With `providedIn` + `factory` the token has a **default value**, so nobody is forced to provide it, but anyone can override it with `{ provide: APP_SETTINGS, useValue: ... }`.

### Abstract classes as tokens

An abstract class exists at runtime *and* describes a type, which makes it an excellent token for "an implementation of this contract":

```ts
export abstract class Storage {
  abstract read(key: string): string | null;
}

providers: [{ provide: Storage, useClass: LocalStorageAdapter }]
```

Consumers write `inject(Storage)` and never know which implementation they got.

### Multi providers

`multi: true` collects every provider of a token into an array, which is how Angular builds plugin lists (validators, interceptors, initializers):

```ts
export const PLUGINS = new InjectionToken<string[]>('PLUGINS');
providers: [
  { provide: PLUGINS, useValue: 'analytics', multi: true },
  { provide: PLUGINS, useValue: 'chat', multi: true },
];
inject(PLUGINS); // ['analytics', 'chat']
```

### Optional dependencies

`inject(TOKEN, { optional: true })` returns `null` instead of throwing when nothing is provided.

### Legacy vs modern

```ts
// legacy
constructor(@Inject(APP_SETTINGS) private settings: AppSettings) {}
// modern
private readonly settings = inject(APP_SETTINGS);
```

The old `APP_INITIALIZER`-style factories with `deps: [HttpClient]` are now written as `useFactory: () => inject(HttpClient)`.

### Pitfalls

- Using a string (`provide: 'API_URL'`) as a token: it works but loses type safety and can collide. Use `InjectionToken`.
- Mixing `multi: true` and non-multi providers for the same token throws an error.
- `useClass` with a class that is also provided elsewhere creates two instances. Use `useExisting` to share.
