## Subjects and observable state

A **Subject** is both an observable (you can subscribe to it) and an observer (you can call `next()` on it). It is **hot**: all subscribers share the same stream, and values pushed before you subscribed are gone.

```ts
import { Subject } from 'rxjs';

const clicks = new Subject<string>();
clicks.next('lost');               // nobody is listening
clicks.subscribe((v) => console.log('A', v));
clicks.subscribe((v) => console.log('B', v));
clicks.next('hello');              // A hello, B hello
```

### The Subject family

| Type | New subscriber receives | Use for |
| --- | --- | --- |
| `Subject` | Only future values | Events: clicks, "refresh" triggers |
| `BehaviorSubject(initial)` | The **current** value immediately, then future ones | State; has `.value` |
| `ReplaySubject(n)` | The last `n` values, then future ones | Late subscribers needing history |
| `AsyncSubject` | Only the last value, on complete | Rare; Promise-like |

### The pre-signals state service

Before signals, Angular apps kept shared state in a `BehaviorSubject` inside a service. You will find this pattern in countless codebases:

```ts
@Injectable({ providedIn: 'root' })
export class CounterStore {
  private readonly state = new BehaviorSubject<number>(0);
  readonly count$ = this.state.asObservable();          // read-only for consumers
  readonly double$ = this.count$.pipe(map((n) => n * 2)); // derived state

  increment() {
    this.state.next(this.state.value + 1);
  }
}
```

The rules that make it work:

1. Keep the subject **private**. Expose `asObservable()` so consumers cannot call `next()`.
2. Treat state as **immutable**: always `next()` a new array/object. Subscribers and `distinctUntilChanged` compare references.
3. Derive values with operators (`map`, `combineLatest`) instead of storing duplicates.

### The same store with signals

```ts
@Injectable({ providedIn: 'root' })
export class CounterStore {
  private readonly state = signal(0);
  readonly count = this.state.asReadonly();
  readonly double = computed(() => this.state() * 2);
  increment() { this.state.update((n) => n + 1); }
}
```

Signals are now the recommended choice for **synchronous state** in Angular: no subscriptions, glitch-free derivations, and automatic change detection. Subjects stay the right tool for **events** and for feeding async pipelines (`refresh$.pipe(switchMap(...))`). Bridge both worlds with `toSignal(store.count$)` or `toObservable(signal)`.

### Multicasting cold observables

`share()` and `shareReplay({ bufferSize: 1, refCount: true })` put a Subject in front of a cold observable so several subscribers reuse one execution, for example one HTTP request for many consumers:

```ts
readonly users$ = this.http.get<User[]>('/api/users').pipe(shareReplay({ bufferSize: 1, refCount: true }));
```

### Pitfalls

- Exposing the Subject itself: any component can `next()` garbage into your state.
- Mutating `state.value.push(item)` then calling `next(state.value)`: same reference, consumers may not update.
- Using a plain `Subject` for state: late subscribers see nothing until the next change. Use `BehaviorSubject`.
- `shareReplay(1)` without `refCount: true` keeps the source subscribed forever.
