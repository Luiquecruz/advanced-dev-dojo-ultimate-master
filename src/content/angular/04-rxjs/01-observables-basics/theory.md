## Observables

An **Observable** is a lazy stream of values over time. Angular uses RxJS observables for HTTP responses, router events, form value changes and `output()` interop, so even in the signals era you need to read and write them.

| | Value now | Many values over time |
| --- | --- | --- |
| Pull (you ask) | function | iterator |
| Push (it tells you) | Promise | **Observable** |

### Creating and subscribing

```ts
import { Observable } from 'rxjs';

const ticks$ = new Observable<number>((subscriber) => {
  let count = 0;
  const id = setInterval(() => subscriber.next(count++), 1000);
  return () => clearInterval(id); // teardown
});

const subscription = ticks$.subscribe({
  next: (value) => console.log('tick', value),
  error: (error) => console.error(error),
  complete: () => console.log('done'),
});

subscription.unsubscribe(); // runs the teardown
```

- The function passed to `new Observable` is the **producer**. It runs **once per subscriber** and only **when someone subscribes**. Creating `ticks$` does nothing by itself: observables are **lazy**.
- The producer pushes notifications through `subscriber.next(value)`, `subscriber.error(err)` and `subscriber.complete()`.
- After `error` or `complete`, the stream is finished: no more values, and the teardown runs.
- The function returned by the producer is the **teardown**. It runs on unsubscribe, error or complete. This is where you clear timers, remove listeners or abort requests.
- The `$` suffix (`ticks$`) is a naming convention for observables.

### Creation functions

You rarely need `new Observable`. RxJS ships helpers:

```ts
import { of, from, interval, timer, fromEvent, throwError, EMPTY } from 'rxjs';

of(1, 2, 3);                 // emits 1, 2, 3 synchronously, then completes
from([1, 2, 3]);             // from an array, Promise or iterable
interval(1000);              // 0, 1, 2... every second, never completes
timer(500);                  // one value after 500ms, then completes
fromEvent(button, 'click');  // DOM events
throwError(() => new Error('boom'));
EMPTY;                       // completes immediately
```

### Observable vs Promise

| Promise | Observable |
| --- | --- |
| Eager: starts when created | Lazy: starts on subscribe |
| Exactly one value | Zero, one or many values |
| Not cancellable | `unsubscribe()` cancels and runs teardown |
| Shared result | Each subscriber gets its own execution (cold) |

To bridge them: `from(promise)` turns a Promise into an Observable, and `firstValueFrom(obs$)` / `lastValueFrom(obs$)` turn an Observable into a Promise.

### Cold vs hot

`ticks$` above is **cold**: each subscriber starts its own interval. `HttpClient.get()` is cold too: two subscriptions mean two HTTP requests. A **hot** observable shares one source between subscribers (DOM events, Subjects, `share()`); you will meet them in the Subjects lesson.

### Observables and signals

Signals represent **state** (a current value you can read synchronously). Observables represent **events over time** (values that arrive asynchronously and can be cancelled or combined). Modern Angular uses signals for state and RxJS for async orchestration, bridged with `toSignal()` and `toObservable()` from `@angular/core/rxjs-interop`.

### Pitfalls

- Forgetting to return a teardown from `new Observable`: timers keep running after unsubscribe.
- Expecting `of(1).subscribe(...)` to be async: creation functions like `of` and `from([..])` emit **synchronously**.
- Calling `next()` after `complete()` does nothing. RxJS ignores it silently.
- Never-completing streams (`interval`, `fromEvent`) must be unsubscribed or they leak.
