Before starting, complete [Observables Basics](/angular/observables-basics) and [Subjects and State](/angular/subjects-and-state) in the Angular track.

Signals hold the **current value** of state. Observables describe **values over time**: events, requests, timers, streams. State code often needs both, and Angular ships a small bridge in `@angular/core/rxjs-interop`.

## Which one for what

| Need | Use |
| --- | --- |
| The current value, read in a template | signal |
| Derived values | `computed` |
| Events over time, debounce, cancellation, merging | Observable |
| HTTP requests with retry and switching | Observable (or `httpResource`) |

A good rule: **state is a signal, work is a stream.** Keep the stream inside the service and expose a signal.

## toSignal: stream in, signal out

```ts
readonly user = toSignal(this.auth.user$, { requireSync: true });
```

`toSignal` subscribes immediately, reads the latest value as a signal and unsubscribes when the injection context is destroyed. A `BehaviorSubject` emits synchronously, so `requireSync: true` removes the `undefined` from the type. For a stream that emits later, pass `initialValue` or accept `T | undefined`. If the observable errors, reading the signal throws that error, so handle errors in the stream before converting.

## toObservable: signal in, stream out

```ts
readonly query = signal('');
private readonly results$ = toObservable(this.query).pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((text) => this.http.get<Item[]>('/api/items', { params: { q: text } })),
);
```

`toObservable` emits the signal's value through an effect, so it emits after change detection settles, and intermediate values written in the same turn are collapsed. That suits search boxes and does not suit code that needs every single write.

## takeUntilDestroyed: cleanup without ngOnDestroy

```ts
constructor() {
  this.socket.messages$.pipe(takeUntilDestroyed()).subscribe((message) => this.append(message));
}
```

Called in an injection context (constructor or field initializer), it completes the stream when the component or service is destroyed. Outside that context, pass a `DestroyRef`.

## BehaviorSubject stores

Many existing apps hold state in a `BehaviorSubject` behind a service:

```ts
private readonly items$ = new BehaviorSubject<Item[]>([]);
readonly itemsStream = this.items$.asObservable();
add(item: Item) { this.items$.next([...this.items$.value, item]); }
```

It works, but each consumer needs `async` or a subscription and each derived value needs `combineLatest` or `map`. Migrating is incremental: keep the subject, add `toSignal(this.items$, { requireSync: true })`, and move components to the signal one by one. The reverse is also safe: expose `toObservable(signal)` to code that still expects a stream.

## Common mistakes

- Subscribing manually in a component and forgetting to unsubscribe. Prefer `toSignal`, the `async` pipe or `takeUntilDestroyed`.
- Calling `toSignal` in a method that runs later; it needs an injection context unless you pass `injector`.
- Expecting `toObservable` to emit every intermediate write.
- Converting in a loop: create the signal once as a field, not on every call.

## When to choose it

Use signals for state the template reads, observables for streams that need operators, and the interop functions at the boundary. Avoid bouncing a value across the bridge several times; convert once at the edge.
