## The async pipe and subscription management

Every `subscribe()` you write is a promise to **unsubscribe** later. Forget it, and a destroyed component keeps receiving values, running code and holding memory: a classic Angular leak.

```ts
@Component({ selector: 'app-clock', template: `{{ time() }}` })
export class Clock {
  protected readonly time = signal(0);
  constructor() {
    interval(1000).subscribe((n) => this.time.set(n)); // leaks after destroy!
  }
}
```

There are four ways to fix this, from most to least preferred.

### 1. Let something else subscribe: `toSignal()`

```ts
protected readonly time = toSignal(interval(1000), { initialValue: 0 });
```

`toSignal` subscribes immediately and unsubscribes when the injection context (the component) is destroyed. Great when you only need the latest value in the template.

### 2. The `async` pipe

```ts
@Component({
  selector: 'app-clock',
  imports: [AsyncPipe],
  template: `
    <p>{{ time$ | async }}</p>
    @if (user$ | async; as user) { <p>{{ user.name }}</p> }
  `,
})
export class Clock {
  protected readonly time$ = interval(1000);
}
```

The `AsyncPipe` subscribes when the view renders, calls `markForCheck()` on every value (so it works with OnPush and zoneless), and unsubscribes when the view is destroyed. It also unsubscribes and resubscribes if the expression returns a different observable. It returns `null` until the first value arrives.

### 3. `takeUntilDestroyed()`

When you really need side effects in `subscribe()` (navigation, writing to a store, imperative APIs), complete the stream when the component is destroyed:

```ts
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class Clock {
  protected readonly time = signal(0);

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe((n) => this.time.set(n));
  }
}
```

Without arguments it must run in an injection context (constructor or field initializer). Elsewhere, pass a `DestroyRef`:

```ts
private readonly destroyRef = inject(DestroyRef);

start() {
  interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
}
```

Place `takeUntilDestroyed` **last** in the pipe, so operators after it cannot keep inner subscriptions alive.

### 4. Legacy: `ngOnDestroy` + `Subject` + `takeUntil`

The pattern you will see in pre-v16 code:

```ts
export class Clock implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(...);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

It works, but it is boilerplate that `takeUntilDestroyed()` replaces. Another legacy variant stored `Subscription` objects and called `subscription.unsubscribe()` in `ngOnDestroy`.

### Which streams must be cleaned up?

- **Must**: infinite streams (`interval`, `fromEvent`, Subjects, store selectors, router events).
- **Usually safe**: `HttpClient` requests complete after one response, but unsubscribing still cancels in-flight requests when the user leaves, so cleanup is good practice.

### Pitfalls

- Subscribing to the same observable twice in a template with two `| async`: two subscriptions, maybe two HTTP calls. Use `@if (obs$ | async; as value)` or `toSignal`.
- Calling `takeUntilDestroyed()` without arguments in `ngOnInit` or a click handler throws `NG0203`.
- Forgetting `AsyncPipe` in the component `imports`: the template fails with "The pipe 'async' could not be found".
