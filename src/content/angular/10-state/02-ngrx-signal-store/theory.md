## What is the NgRx SignalStore?

`@ngrx/signals` gives you a small, functional way to build **stores out of signals**. Instead of writing a service class by hand (private signal, `asReadonly()`, methods), you compose a store from *features*:

```ts
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

type CounterState = { count: number; step: number };

export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState<CounterState>({ count: 0, step: 1 }),
  withMethods((store) => ({
    increment() {
      patchState(store, (state) => ({ count: state.count + state.step }));
    },
    setStep(step: number) {
      patchState(store, { step });
    },
  })),
);
```

`signalStore(...)` returns an **injectable class**. Components inject it like any service:

```ts
@Component({
  selector: 'app-counter',
  template: `
    <p>{{ store.count() }}</p>
    <button (click)="store.increment()">+{{ store.step() }}</button>
  `,
})
export class Counter {
  protected readonly store = inject(CounterStore);
}
```

## How the pieces fit

- **`withState(initial)`** turns every top-level key into a read-only signal on the store: `store.count()`, `store.step()`. Nested objects become *deep signals*: `store.user.name()`.
- **`withMethods(factory)`** receives the store built so far and returns the methods to add. Inside the factory you can also call `inject()` for services like `HttpClient`.
- **`patchState(store, ...updaters)`** is the only way to write state. Each updater is either a **partial object** (`{ step: 2 }`) or a **function** of the current state returning a partial object. Keys you do not mention are kept.
- **`getState(store)`** returns a plain snapshot object, handy for logging or tests.

Features run **in order**, and each one sees what the previous ones added. That is why `withMethods` comes after `withState`.

## Protected state

Since NgRx 18 the store state is **protected by default**: the class you get back is not a writable state source, so `patchState(store, ...)` from a component is a type error. State changes must go through methods declared in the store, which keeps every transition named and discoverable. If you really need external writes (rare, mostly in tests), create the store with `{ protectedState: false }`.

## Where does the instance live?

- `{ providedIn: 'root' }`: a single global instance, like a root service.
- Without it, add the store to a component's `providers: [CounterStore]`. Each component instance gets **its own** store, destroyed with the component. This is great for page-level or widget-level state.

## Pitfalls

- **Do not mutate**: `patchState(store, (s) => { s.items.push(x); return s; })` keeps the same references and nothing updates. Return new arrays/objects.
- **Return partial objects**, not the whole state rebuilt by hand. `patchState(store, { loading: true })` is clearer and cheaper.
- **Arrow functions vs `this`**: methods are plain object members. Use the `store` parameter, never `this`.
- **Literal unions widen inside updater functions**: `(state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })` returns `{ theme: string }` and fails type checking. Pass an object instead (`patchState(store, { theme: store.theme() === 'light' ? 'dark' : 'light' })`), where the expected type keeps the literals.
- State keys must be plain data. Functions and signals belong in `withMethods`, `withComputed` or `withProps`.

## Compared with a hand-written service

| Hand-written service | SignalStore |
| --- | --- |
| `private state = signal(...)` + `asReadonly()` | `withState(...)` |
| `computed(...)` fields | `withComputed(...)` |
| class methods calling `update` | `withMethods(...)` + `patchState` |
| constructor / `DestroyRef` logic | `withHooks({ onInit, onDestroy })` |

The SignalStore adds conventions, not magic: it is still signals underneath, so it works with zoneless change detection, `computed`, `effect` and templates exactly like your own services.
