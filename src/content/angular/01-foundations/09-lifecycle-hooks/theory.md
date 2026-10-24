## A component's life

Angular creates a component, binds its inputs, renders it, keeps it in sync, and finally destroys it. **Lifecycle hooks** are methods Angular calls at each of these moments. Implement the matching interface (`OnInit`, `OnDestroy`…) so TypeScript checks the method name.

| Hook | When | Typical use |
| --- | --- | --- |
| `constructor` | instance created, **inputs not set yet** | `inject()` dependencies, create signals/effects |
| `ngOnChanges(changes)` | before `ngOnInit` and whenever an input changes | react to specific input transitions (`previousValue` → `currentValue`) |
| `ngOnInit()` | once, after the first inputs are set | start work that needs inputs (timers, subscriptions, initial fetch) |
| `ngDoCheck()` | every change detection pass | custom change detection (rarely needed) |
| `ngAfterContentInit()` / `Checked` | after projected content is initialized / checked | read content queries |
| `ngAfterViewInit()` / `Checked` | after the component's view is initialized / checked | read view queries |
| `afterNextRender()` / `afterEveryRender()` | after Angular has rendered **the whole app** to the DOM | DOM measurement, focus, third-party DOM libraries |
| `ngOnDestroy()` | once, just before destruction | clean up timers, listeners, subscriptions |

```ts
import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-clock',
  template: `<time>{{ now().toLocaleTimeString() }}</time>`,
})
export class Clock implements OnInit, OnDestroy {
  readonly everyMs = input(1000);
  protected readonly now = signal(new Date());
  private timerId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.timerId = setInterval(() => this.now.set(new Date()), this.everyMs());
  }

  ngOnDestroy() {
    clearInterval(this.timerId);
  }
}
```

Why not start the timer in the constructor? Because `everyMs()` still holds the default value there: Angular sets inputs **after** construction. Reading a `input.required()` in the constructor even throws `NG0950`.

### `ngOnChanges` and `SimpleChanges`

```ts
ngOnChanges(changes: SimpleChanges<Clock>) {
  const change = changes.everyMs;
  if (change && !change.firstChange) {
    console.log(`interval ${change.previousValue} -> ${change.currentValue}`);
  }
}
```

It works with signal inputs too (pass the class as the generic for typed keys). With signals, however, most derived state is simpler with `computed()`, and side effects with `effect()`. Keep `ngOnChanges` for logic that really needs the previous value.

### Modern cleanup: `DestroyRef`

Instead of splitting setup and teardown across two hooks, register cleanup next to the setup:

```ts
export class Clock implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    const id = setInterval(() => this.now.set(new Date()), this.everyMs());
    this.destroyRef.onDestroy(() => clearInterval(id));
  }
}
```

`DestroyRef` also works in services and functions (`takeUntilDestroyed()` uses it under the hood).

### Render hooks: `afterNextRender` and `afterEveryRender`

These are functions, not methods. Call them in the constructor (an injection context):

```ts
export class SearchBox {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      this.host.nativeElement.querySelector('input')?.focus();
    });
  }
}
```

- They run after the DOM is updated, so DOM reads/writes are safe.
- They do **not** run on the server (SSR), which makes them the right place for browser-only APIs.
- To avoid layout thrashing, split work into phases: `afterNextRender({ write: () => ..., read: () => ... })`.
- `afterRenderEffect()` combines this with signal tracking: it re-runs after render when the signals it reads change.

## Legacy vs modern

| Legacy pattern | Modern pattern |
| --- | --- |
| `ngOnChanges` to recompute derived fields | `computed()` from signal inputs |
| `ngOnDestroy` + `Subject` + `takeUntil(destroy$)` | `DestroyRef.onDestroy()` / `takeUntilDestroyed()` |
| `ngAfterViewInit` to touch the DOM | `afterNextRender()` (SSR-safe) |
| `ngDoCheck` for manual dirty checking | signals |

## Pitfalls

- **Changing bound state in `ngAfterViewInit`** triggers `ExpressionChangedAfterItHasBeenCheckedError` (NG0100) in dev mode.
- **Forgetting cleanup**: intervals and global listeners keep running after the component is gone, leaking memory and updating dead state.
- **Heavy `ngDoCheck` / `*Checked` hooks**: they run on every change detection pass.
- **Relying on hook order between sibling directives**: only the order for one class is guaranteed.
