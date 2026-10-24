## Signals: Angular's reactive primitive

A **signal** is a value wrapper that knows who reads it. When it changes, Angular updates exactly the computations, effects and templates that depend on it. That precision is what makes zoneless change detection possible.

```ts
import { signal } from '@angular/core';

const count = signal(0);   // WritableSignal<number>
count();                    // read: 0
count.set(5);               // replace
count.update((n) => n + 1); // derive from the previous value -> 6
const readonlyCount = count.asReadonly(); // Signal<number>, no set/update
```

Signals compare values with `Object.is` by default: setting the same primitive (or the **same object reference**) notifies nobody. That's why you update arrays and objects **immutably**:

```ts
const todos = signal<Todo[]>([]);
todos.update((list) => [...list, newTodo]);    // ✅ new reference
todos().push(newTodo);                          // ❌ mutation, nobody is notified
```

A custom comparison can be passed: `signal(user, { equal: (a, b) => a.id === b.id })`.

## `computed()`: derived state

```ts
const price = signal(100);
const quantity = signal(3);
const total = computed(() => price() * quantity());   // Signal<number>
```

- **Read-only**: there is no `total.set()`.
- **Lazy**: the function runs the first time `total()` is read, not when it's created.
- **Memoized**: it re-runs only when a dependency changed; reading it 1000 times costs one computation.
- **Dynamic dependencies**: only signals read during the *last* run are tracked.

```ts
const showDetails = signal(false);
const label = computed(() => (showDetails() ? `${name()} (${email()})` : name()));
// while showDetails() is false, changing email() does not re-run label
```

Prefer `computed()` for anything that can be expressed as "a value derived from other values". It's synchronous, glitch-free and testable.

## `effect()`: side effects

An effect runs a function now and again whenever the signals it read change:

```ts
@Component({ /* ... */ })
export class Cart {
  readonly items = signal<CartItem[]>([]);

  constructor() {
    effect(() => {
      localStorage.setItem('cart', JSON.stringify(this.items()));
    });
  }
}
```

- Effects must be created in an **injection context** (constructor or field initializer), or receive `{ injector }`.
- They are destroyed automatically with the component (or service) that created them.
- **Timing**: component effects run during change detection, before the component's template is checked; root effects (created in root services) run as microtasks. In both cases they run **asynchronously**, after the current code finishes, and multiple synchronous writes trigger a single run.
- Use effects to sync signals with the **outside world**: `localStorage`, `document.title`, logging, analytics, imperative third-party widgets, canvas drawing.

### When *not* to use `effect()`

```ts
// ❌ copying state with an effect
effect(() => this.total.set(this.price() * this.quantity()));

// ✅ derive it
readonly total = computed(() => this.price() * this.quantity());
```

Using effects to propagate state between signals creates extra change detection cycles, ordering bugs and, in the worst case, infinite loops. If the value can be computed, use `computed()`; if it must be writable but reset from a source, use `linkedSignal()` (next lesson).

## Legacy vs modern

Before signals, component state was **plain fields** and Angular relied on **zone.js** to notice *that something might have changed* (any click, timer or HTTP response) and re-check the whole component tree. Shared state used RxJS `BehaviorSubject`:

```ts
// legacy
export class CartService {
  private readonly items$ = new BehaviorSubject<CartItem[]>([]);
  readonly total$ = this.items$.pipe(map((items) => items.reduce((sum, i) => sum + i.price, 0)));
}
```

Signals give synchronous reads (no `subscribe`/`async` pipe needed), automatic dependency tracking and fine-grained updates. RxJS remains the right tool for **events over time** (debounce, websockets, retries); the RxJS interop lesson connects the two.

## Pitfalls

- **Mutating** objects/arrays inside a signal instead of replacing them.
- **Reading signals without calling them**: `if (this.isOpen)` is always truthy because it's a function.
- **Writing to signals inside `computed()`**: not allowed, computed must be pure.
- **Creating effects outside an injection context** (e.g. in a click handler) throws `NG0203`.
