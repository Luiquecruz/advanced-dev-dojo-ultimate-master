## Services and `inject()`

A **service** is a class that holds logic or state that does not belong to a single component: talking to an API, caching data, sharing a cart between the header and the product page. Angular's **dependency injection (DI)** system creates those objects for you and hands the same instance to everyone who asks for it.

```ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Favorites {
  private readonly ids = signal<number[]>([]);
  readonly total = computed(() => this.ids().length);

  add(id: number) {
    this.ids.update((ids) => [...ids, id]);
  }
}
```

- `@Injectable()` marks the class as something the injector can create.
- `providedIn: 'root'` registers it in the **root injector**: one instance for the whole application, created lazily the first time somebody injects it, and **tree-shakable** (removed from the bundle if nobody uses it).

### Asking for a dependency

Use the `inject()` function in a field initializer (or the constructor) of a component, directive, pipe or another service:

```ts
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-header',
  template: `<span>Favorites: {{ favorites.total() }}</span>`,
})
export class Header {
  protected readonly favorites = inject(Favorites);
}
```

`inject()` only works inside an **injection context**: while Angular is constructing the class (field initializers, constructor), inside a provider factory, or inside `runInInjectionContext()`. Calling it later, for example in a click handler or `setTimeout`, throws `NG0203`.

### Legacy: constructor injection

Before Angular 14 the only way was to declare constructor parameters. Angular read their types through decorator metadata:

```ts
@Component({ selector: 'app-header', template: `...` })
export class Header {
  constructor(private favorites: Favorites) {}
}
```

It still works with `@Injectable` and `@Component`, but the modern style guide prefers `inject()`:

| Constructor injection | `inject()` |
| --- | --- |
| Depends on TypeScript emitting parameter metadata | Plain function call, works with any compiler setting |
| Verbose with inheritance (`super(a, b, c)`) | Subclasses inject their own dependencies |
| Tokens need `@Inject(TOKEN)` | `inject(TOKEN)` is fully typed |
| Hard to reuse | Can be wrapped in helper functions (`injectUser()`) |

### New in Angular 22: `@Service()`

Angular 22 adds a shorthand for the most common case, a root singleton:

```ts
import { Service, inject } from '@angular/core';

@Service()
export class Favorites {
  private readonly http = inject(HttpClient);
}
```

`@Service()` is provided in root automatically, supports **only** `inject()` (no constructor injection) and accepts `{ autoProvided: false }` when you want to register it yourself, or `{ factory: () => ... }` to customize creation. `@Injectable({ providedIn: 'root' })` remains fully supported and is what you will see in most existing code, so learn to read both.

### Why services hold state with signals

A service is a plain class, so it can hold signals. Every component that injects the same instance reads the same signals, and zoneless change detection re-renders exactly the templates that read them. This is the simplest form of shared state in modern Angular.

### Pitfalls

- **Forgetting `providedIn`**: `@Injectable()` alone does not provide anything. Injecting it throws `NG0201: No provider found`.
- **Listing a root service in a component's `providers`**: that creates a *second* instance for that component subtree, which silently breaks sharing.
- **Calling `inject()` outside an injection context**: store the dependency in a field first, then use the field in methods.
- **Exposing writable state**: keep the `signal` private and expose `asReadonly()` or `computed()` values plus methods that update it.
