## Writable state that depends on other state

`computed()` is perfect for derived values, but it's **read-only**. Some UI state is *both* derived and editable:

- the selected shipping option defaults to the first available option, the user can pick another, and when the list of options changes the selection must be re-validated;
- a quantity field starts at the product's minimum, the user edits it, and it resets when another product is shown;
- an editable copy of an input value.

Before `linkedSignal`, people wrote an `effect()` that called `set()` on a signal whenever the source changed, which is fragile (extra render, ordering issues). `linkedSignal()` (stable since Angular 20) models it directly.

### Short form

```ts
import { linkedSignal, signal } from '@angular/core';

const options = signal(['Ground', 'Air', 'Sea']);
const selected = linkedSignal(() => options()[0]);

selected();              // 'Ground'
selected.set('Air');     // the user picks another option
selected();              // 'Air'
options.set(['Email', 'Pickup']);
selected();              // 'Email' — reset because the source changed
```

A linked signal is a `WritableSignal`: `set()` and `update()` work. Whenever any signal read by the computation changes, the value is **recomputed and overrides** the manual value.

### Long form: `source` + `computation` with `previous`

Often you want to keep the user's choice if it's still valid:

```ts
const selected = linkedSignal<string[], string>({
  source: options,
  computation: (newOptions, previous) =>
    previous && newOptions.includes(previous.value) ? previous.value : newOptions[0],
});
```

- `source` is the signal (or function) to watch.
- `computation(sourceValue, previous)` returns the new value. `previous` is `undefined` on the first run, then `{ source, value }` with the previous source value and the previous **linked** value (including manual `set()` calls).
- Only `source` is tracked. Signals read inside `computation` are not dependencies.
- An `equal` option is available like in `signal()`.

### With signal inputs

This is the idiomatic way to get "an editable local copy of an input":

```ts
export class ProfileForm {
  readonly user = input.required<User>();
  protected readonly draftName = linkedSignal(() => this.user().name);

  rename(value: string) {
    this.draftName.set(value);   // local edit, the parent's input is untouched
  }
}
```

When the parent passes another user, `draftName` resets to the new name.

## Choosing the right primitive

| Need | API |
| --- | --- |
| A value derived from others, never edited directly | `computed()` |
| A value derived from others **and** editable, reset when the source changes | `linkedSignal()` |
| An editable value shared two-way with the parent | `model()` |
| Independent state | `signal()` |
| Talking to the outside world (DOM APIs, storage, logging) | `effect()` |

## Legacy vs modern

```ts
// legacy pattern
export class VariantPicker implements OnChanges {
  @Input() product!: Product;
  selectedSize = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product']) {
      const sizes = this.product.sizes;
      this.selectedSize = sizes.includes(this.selectedSize) ? this.selectedSize : sizes[0];
    }
  }
}

// early-signals anti-pattern
effect(() => this.selectedSize.set(this.product().sizes[0]));
```

Both are replaced by a single declarative `linkedSignal`.

## Pitfalls

- **Expecting manual values to survive source changes**: in the short form they never do; use `previous` in the long form to keep them.
- **Reading other signals in `computation`** and expecting them to trigger updates: only `source` is tracked in the long form.
- **Using `linkedSignal` where `computed` suffices**: if nobody ever calls `set()`, it should be `computed()`.
- **Side effects in the computation**: like `computed`, it must be pure.
