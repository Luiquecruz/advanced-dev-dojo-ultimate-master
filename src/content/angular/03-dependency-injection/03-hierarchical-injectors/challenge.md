Give every counter panel its own state with a component-scoped service.

**`counter-store.ts`**

1. Export `CounterStore`, decorated with plain `@Injectable()` (**not** provided in root).
2. A `count` signal starting at `0` and an `increment()` method.

**`app.ts`**

1. `CounterPanel` (selector `app-counter-panel`) provides `CounterStore` in its `providers` and renders `<section>` containing `<app-counter-display />` and `<app-counter-button />`.
2. `CounterButton` (selector `app-counter-button`) injects the nearest `CounterStore` and renders a `+1` button that calls `increment()`.
3. `CounterDisplay` (selector `app-counter-display`) injects `CounterStore` **optionally** and renders `<p>Count: N</p>`, or `<p>No store</p>` when no store is available.
4. `App` (selector `app-root`) renders two `<app-counter-panel />` and then one `<app-counter-display />` outside any panel.
