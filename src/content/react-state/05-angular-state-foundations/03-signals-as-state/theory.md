Before starting, complete [signal, computed & effect](/angular/signal-computed-effect) and [linkedSignal](/angular/linked-signal) in the Angular track.

Signals are Angular's built-in state primitive. Used well, three of the four APIs cover almost every state shape, and the fourth is a last resort.

## The four tools

| API | Role | Writable |
| --- | --- | --- |
| `signal(initial)` | state you set | yes |
| `computed(fn)` | state derived from other signals; lazy and memoized | no |
| `linkedSignal(fn)` | state you can set that **resets** when a source changes | yes |
| `effect(fn)` | a side effect that runs when its signals change | n/a |

`signal` is the source. `computed` is the default way to turn sources into what the template needs. `linkedSignal` handles the awkward middle case. `effect` leaves the signal graph to talk to the outside world.

## computed: derive, don't copy

```ts
readonly products = signal<Product[]>([]);
readonly category = signal('all');

readonly visible = computed(() =>
  this.products().filter((product) => this.category() === 'all' || product.category === this.category()),
);
```

`visible` tracks whatever signals the function reads. It recalculates only when one changes and only when someone reads it, and it returns the cached value otherwise. It is read-only, which is the point: nobody can put a value in it that disagrees with its sources.

## linkedSignal: writable, but tied to a source

A page number is writable (the user clicks "next") but it must go back to 1 when the category changes. A plain signal needs an `effect` for that; `linkedSignal` expresses it directly:

```ts
readonly page = linkedSignal(() => {
  this.category();   // dependency: reset when the category changes
  return 1;
});

goTo(page: number) {
  this.page.set(page); // still writable
}
```

It also has a longer form with `source` and `computation` when the reset needs the previous value, for example to keep a selection if the chosen item still exists in the new list.

## effect: side effects, not state

An effect runs code **after** the signals it reads change. It is the right tool for logging, writing to `localStorage`, syncing to a non-Angular library or calling a service that is not reactive. It is the wrong tool for computing state:

```ts
// Wrong: a second write hidden in an effect, one render behind.
effect(() => this.total.set(this.items().reduce((sum, item) => sum + item.price, 0)));

// Right: derived state.
readonly total = computed(() => this.items().reduce((sum, item) => sum + item.price, 0));
```

The effect version runs later than the read, can show an intermediate state, and hides a second write inside a side effect. If you notice an effect whose only job is to call `set` on another signal, replace it with `computed` or `linkedSignal`.

## Immutable updates

Signals notify when the value changes by reference (`Object.is`). Mutating an array in place and calling `set` with the same array notifies nobody:

```ts
this.items.update((items) => [...items, item]);          // new array: notifies
this.items().push(item);                                  // mutation: silent bug
```

Always return new arrays and new objects, or provide a custom `equal` function when that is deliberate.

## Common mistakes

- Using `effect` to copy one signal into another.
- Reading a signal inside `untracked` and expecting the `computed` to update.
- Mutating arrays and objects inside signals.
- Exposing the writable signal publicly instead of a read-only view.
- Putting expensive or side-effecting work inside `computed`; it must stay pure.

## When to choose it

Start with `signal` and `computed`. Reach for `linkedSignal` when a writable value depends on a source that can change it out from under the user. Use `effect` only to push state out of the signal graph.
