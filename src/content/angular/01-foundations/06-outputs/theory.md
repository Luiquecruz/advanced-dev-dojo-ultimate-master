## Sending events to the parent

Inputs carry data **down**; outputs send events **up**. A child declares an output with the `output()` function and calls `emit()`:

```ts
import { Component, input, output } from '@angular/core';

export interface Product { id: number; name: string }

@Component({
  selector: 'app-product-row',
  template: `
    <span>{{ product().name }}</span>
    <button (click)="addToCart()">Add</button>
    <button (click)="removed.emit()">Remove</button>
  `,
})
export class ProductRow {
  readonly product = input.required<Product>();
  readonly added = output<Product>();
  readonly removed = output<void>();

  addToCart() {
    this.added.emit(this.product());
  }
}
```

The parent listens with the same event-binding syntax used for DOM events. `$event` is the emitted value:

```html
<app-product-row
  [product]="item"
  (added)="cart.add($event)"
  (removed)="remove(item.id)"
/>
```

Key facts:

- `output<T>()` returns an `OutputEmitterRef<T>`. It only has `emit()` (and `subscribe()` for code that creates components dynamically). It is **not** a signal and holds no value.
- Outputs do **not bubble** through the DOM. Only the direct parent's template can listen.
- Name outputs after what happened, in camelCase: `added`, `valueChange`, `closed`. Avoid `on` prefixes and native event names like `click`, which would collide with the DOM event on the host.
- `alias` renames the public event: `output({ alias: 'valueChanged' })`.

### Outputs from RxJS: `outputFromObservable`

When the events already come from an observable stream, convert it instead of subscribing manually:

```ts
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

export class SearchBox {
  protected readonly query$ = new Subject<string>();
  readonly search = outputFromObservable(
    this.query$.pipe(debounceTime(300), distinctUntilChanged()),
  );
}
```

Angular subscribes only while the component is alive and unsubscribes on destroy. The reverse helper, `outputToObservable(ref)`, turns any output into an observable (useful in tests or when composing streams).

## Legacy vs modern

```ts
// legacy
import { EventEmitter, Output } from '@angular/core';

export class ProductRow {
  @Output() added = new EventEmitter<Product>();
  @Output('valueChanged') changed = new EventEmitter<number>();
}
```

`EventEmitter` extends RxJS `Subject`, so legacy code sometimes subscribed to it, piped it, or called `.next()`. That leaked RxJS into the component API. `output()`:

| `@Output() + EventEmitter` | `output()` |
| --- | --- |
| a full RxJS `Subject` | a minimal `OutputEmitterRef` |
| subscriptions can leak | cleaned up with the component |
| emits even after destroy | emitting after destroy is an error in dev mode |
| decorator metadata | plain function, better type inference |

Both produce the same template API: `(added)="..."`. The `ng generate @angular/core:output-migration` schematic converts decorators.

## Inputs + outputs = presentational components

A component that receives everything through inputs and reports user intent through outputs, without injecting services, is called **presentational** (or "dumb"). The parent (the **container**) owns the state and decides what an event means. This split keeps components reusable and easy to test.

```html
<!-- container decides -->
<app-star-rating [value]="rating()" (rated)="rating.set($event)" />
```

## Pitfalls

- **Forgetting to call `emit()`**: declaring the output does nothing by itself.
- **Expecting a return value**: `emit()` returns `void`; outputs are fire-and-forget.
- **Using an output as state**: there is no `added()` value to read. Keep state in signals.
- **Order of field initializers**: when an output is built from another field (`outputFromObservable(this.query$)`), declare that field first.
