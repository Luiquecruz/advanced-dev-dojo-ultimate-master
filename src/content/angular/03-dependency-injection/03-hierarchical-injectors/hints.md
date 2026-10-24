`@Injectable()` without `providedIn` only describes how to build the class. A component must list it in `providers` to create instances.
---
Put `providers: [CounterStore]` on `CounterPanel`: every panel instance creates its own store, and its children find it first when they call `inject(CounterStore)`.
---
`inject(CounterStore, { optional: true })` returns `null` outside a panel. In the template: `@if (store) { <p>Count: {{ store.count() }}</p> } @else { <p>No store</p> }`.
