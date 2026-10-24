## Controlling what an effect depends on

An `effect()` (and a `computed()`) tracks **every signal it reads**, including signals read deep inside functions it calls. That's usually what you want, but sometimes a read should *not* create a dependency.

```ts
effect(() => {
  const page = this.currentPage();
  this.analytics.track('page_view', { page, user: this.user() });   // user() is now a dependency!
});
```

Here the effect also re-runs when the user changes, logging a page view that never happened. `untracked()` reads a value without subscribing to it:

```ts
import { effect, untracked } from '@angular/core';

effect(() => {
  const page = this.currentPage();                       // tracked
  const user = untracked(this.user);                     // read once, not tracked
  this.analytics.track('page_view', { page, user });
});
```

`untracked` accepts a signal or any function: `untracked(() => this.logger.log(this.items()))`. A common use is calling **external code** inside an effect, because you can't know which signals that code reads internally:

```ts
effect(() => {
  const user = this.currentUser();
  untracked(() => this.loggingService.log(`User set to ${user}`));
});
```

The rule of thumb: **track the triggers, untrack the context.**

## Cleaning up after an effect

Effects often start something asynchronous: a timer, a request, a subscription, an event listener. When the effect re-runs, the previous work is usually obsolete. The effect function receives an `onCleanup` registration function:

```ts
effect((onCleanup) => {
  const query = this.query();
  const timer = setTimeout(() => this.search(query), 300);
  onCleanup(() => clearTimeout(timer));
});
```

The cleanup callback runs:

1. **before the next execution** of the effect, and
2. when the effect is **destroyed** (with its component or service, or via `effectRef.destroy()`).

The example above is a debounce: typing fast keeps cancelling the pending timer, so only the last value triggers `search`.

Other typical cleanups:

```ts
effect((onCleanup) => {
  const handler = () => this.width.set(window.innerWidth);
  if (this.trackResize()) {
    window.addEventListener('resize', handler);
    onCleanup(() => window.removeEventListener('resize', handler));
  }
});

effect((onCleanup) => {
  const socket = new WebSocket(`wss://chat.example.com/rooms/${this.roomId()}`);
  onCleanup(() => socket.close());
});
```

## Effect lifetime

```ts
const ref = effect(() => { /* ... */ });   // EffectRef
ref.destroy();                             // stop it manually
```

- Effects created in a component die with the component; effects in a root service live as long as the app.
- `effect(fn, { injector })` creates one outside an injection context.
- `{ manualCleanup: true }` opts out of automatic destruction (rarely needed).
- `afterRenderEffect()` is a variant that runs after rendering, for DOM work that depends on signals.

## Legacy vs modern

With RxJS the same patterns are written with operators: `switchMap` cancels the previous inner observable (cleanup), `debounceTime` debounces, `withLatestFrom` reads a value without reacting to it (like `untracked`), and `takeUntil(destroy$)` ends the stream on destroy. Signals cover the simple cases with plain functions; for complex event streams RxJS is still the better tool (see RxJS interop).

## Pitfalls

- **Writing to a signal you also read** in the same effect creates a loop. If you need the current value just to compute the next one, use `update()` (which doesn't track) or `untracked()`.
- **Forgetting cleanup** leaves timers and listeners running after the effect re-ran or the component was destroyed.
- **Using `untracked` to hide a real dependency**: if the effect's output depends on that value, it should be tracked, or the effect should be a `computed()`.
- **Async functions as effects**: signals read after an `await` are not tracked. Read everything you depend on synchronously at the top of the effect.
