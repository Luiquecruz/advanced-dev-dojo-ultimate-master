Before starting, complete the Signal-Based Services and NgRx SignalStore lessons of this module.

A component should not need to know whether state lives in a signal service, a SignalStore, NgRx Store or a query cache. A **facade** is a service that gives a feature one small, stable API for reading and changing its state, and hides the implementation behind it. Components talk to the facade; the facade talks to stores and APIs.

## What a facade looks like

```ts
@Injectable()
export class TodosFacade {
  readonly #store = inject(TodosStore);
  readonly #api = inject(TodoApi);

  readonly vm = computed(() => ({
    status: this.#store.status(),
    items: this.#store.items(),
    remaining: this.#store.items().filter((todo) => !todo.completed).length,
  }));

  async load() { /* coordinate api + store */ }
  toggle(id: number) { this.#store.toggle(id); }
}
```

The component reads one **view model** and calls intent methods:

```html
@if (facade.vm().status === 'loading') { <p>Loading...</p> }
<p>{{ facade.vm().remaining }} remaining</p>
<button (click)="facade.toggle(todo.id)">...</button>
```

## Why bother

- **Boundary**: the template depends on `vm` and a few methods, not on the store's shape. Replacing a service with NgRx Store means changing the facade only.
- **Orchestration in one place**: "load, then update, then show an error" is a use case. It belongs in the facade, not duplicated in three components.
- **Testability**: a component test can fake the facade; a facade test can fake the API.

## What does not belong in a facade

- Rendering concerns (CSS classes, formatting for one template).
- Business rules that deserve their own domain code; the facade calls them.
- A pass-through of every store property. If the facade only forwards, it adds a layer without a boundary.

## Boundaries between layers

| Layer | Owns | Must not |
| --- | --- | --- |
| Component | rendering, user intent | call HTTP or mutate state |
| Facade | use cases, view model | know about templates |
| Store | state and transitions | call HTTP, unless it is a self-contained store |
| API service | HTTP and mapping | hold state |

Dependencies point downward. A component never reaches past the facade into the store.

## View models with computed

Group what a screen needs in one `computed`. It memoizes, so a screen that reads `vm()` in several places pays once per change. Keep the view model shaped for reading, not a copy of store internals.

## Facade or direct store

A facade pays off when a feature has more than one component, orchestration across services, or a chance the state tool will change. For a single component and a SignalStore with its own methods, the store already is the API; adding a facade is ceremony.

## Common mistakes

- A facade that only re-exports the store.
- Letting components inject both the facade and the store.
- Putting HTTP and state in the facade at once with no store, which turns it into a god service.
- One global facade for the whole app instead of one per feature.
- Leaking mutable state out of the facade.

## When to choose it

Add a facade at the feature boundary when use cases involve several collaborators. Provide it where the feature needs it: in a component's providers for per-instance state, or in the route providers for a feature-wide facade that lives for the session.
