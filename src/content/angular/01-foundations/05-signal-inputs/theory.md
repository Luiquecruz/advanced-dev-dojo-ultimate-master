## Passing data into a component

A parent passes data to a child through **inputs**. Since Angular 17.1 (stable in v19) inputs are declared with the `input()` function, which returns a read-only **signal**:

```ts
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-badge',
  template: `<span>{{ initials() }} · {{ name() }}</span>`,
})
export class UserBadge {
  readonly name = input.required<string>();
  readonly size = input<'small' | 'large'>('small');
  protected readonly initials = computed(() =>
    this.name().split(' ').map((part) => part[0]).join(''),
  );
}
```

```html
<!-- parent template -->
<app-user-badge [name]="user().name" size="large" />
```

- `input<T>(initialValue)` declares an optional input with a default.
- `input<T>()` without a value has type `T | undefined`.
- `input.required<T>()` must be bound by every parent. Forgetting it is a **compile-time error** in the parent's template.
- Inside the class you read it like any signal: `this.name()`. Because it is a signal, `computed()` and `effect()` that read it update automatically when the parent passes a new value. No `ngOnChanges` needed.
- Input signals are **read-only** for the child: there is no `.set()`. The parent owns the value. (When a child must write back, use `model()`, covered later.)

### Static attributes vs bindings

```html
<app-price [amount]="120" />    <!-- number 120 -->
<app-price amount="120" />      <!-- string "120" -->
<app-toggle disabled />         <!-- string "" -->
```

A static attribute always passes a string. That's where transforms help.

### Transforms

A transform converts the incoming value before it is stored. Angular ships two:

```ts
import { booleanAttribute, input, numberAttribute } from '@angular/core';

export class Toggle {
  readonly disabled = input(false, { transform: booleanAttribute }); // "" / "true" -> true, "false" -> false
  readonly step = input(1, { transform: numberAttribute });          // "5" -> 5
}
```

Now `<app-toggle disabled />` gives `true`. You can write your own, for example `transform: (value: string) => value.trim()`. Transforms must be pure functions; they are not the place for side effects.

### Aliases

```ts
readonly label = input('', { alias: 'ariaLabel' });
```

The template binds `[ariaLabel]`, the class uses `label()`. The style guide discourages aliases except to keep a public API stable while renaming.

### Inputs on the host: `host` bindings

Inputs often drive host styling:

```ts
@Component({
  selector: 'app-card',
  host: { '[class.featured]': 'featured()' },
  template: `<ng-content />`,
})
export class Card {
  readonly featured = input(false, { transform: booleanAttribute });
}
```

## Legacy vs modern

```ts
// legacy (decorator)
export class UserBadge implements OnChanges {
  @Input({ required: true }) name!: string;
  @Input() size: 'small' | 'large' = 'small';
  @Input({ transform: booleanAttribute }) disabled = false;
  initials = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name']) {
      this.initials = this.name.split(' ').map((p) => p[0]).join('');
    }
  }
}
```

| Concern | `@Input()` | `input()` |
| --- | --- | --- |
| Type | plain property (needs `!` for required) | `InputSignal<T>` |
| Derived state | `ngOnChanges` or a setter | `computed()` |
| Mutability | the child can overwrite it (a common bug) | read-only |
| Change detection | needs zone.js / `OnPush` marking | the signal notifies Angular precisely |

`@Input()` is still supported, and the `ng generate @angular/core:signal-input-migration` schematic converts it.

## Pitfalls

- **Reading a required input in the constructor** throws `NG0950` because the parent hasn't bound it yet. Read inputs in templates, `computed()`, `effect()` or lifecycle hooks.
- **Forgetting the call:** `{{ name }}` instead of `{{ name() }}`.
- **Trying to `set()` an input:** copy it into a `linkedSignal()` if the child needs a local, editable version.
- **Passing numbers as static attributes** without `numberAttribute`: `"120"` is a string and `"120" + 1` is `"1201"`.
