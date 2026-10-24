## Built-in control flow

Since Angular 17 templates have **built-in blocks** for conditionals and loops. They are part of the template language itself, so they need no imports and the compiler can type-check and optimize them.

### `@if`, `@else if`, `@else`

```html
@if (user(); as u) {
  <p>Welcome back, {{ u.name }}</p>
} @else if (isLoading()) {
  <p>Loading…</p>
} @else {
  <button>Sign in</button>
}
```

`as u` stores the evaluated condition in a local variable, handy when the condition is a value you want to reuse (and it is narrowed to a truthy type).

### `@for` with `track`

```html
<ul>
  @for (product of products(); track product.id; let i = $index, last = $last) {
    <li [class.last]="last">{{ i + 1 }}. {{ product.name }}</li>
  } @empty {
    <li>No products found</li>
  }
</ul>
```

- `track` is **mandatory**. It tells Angular how to identify each item so that, when the array changes, existing DOM nodes are moved or kept instead of destroyed and recreated. Track a stable unique key (`item.id`). Use `track $index` only for static lists, and `track item` for primitive values.
- Implicit variables: `$index`, `$count`, `$first`, `$last`, `$even`, `$odd`. Rename them with `let i = $index`.
- `@empty` renders when the collection has no items, so you rarely need a separate `@if (list.length === 0)`.

### `@switch`

```html
@switch (status()) {
  @case ('active') { <span class="green">Active</span> }
  @case ('banned') { <span class="red">Banned</span> }
  @default { <span>Unknown</span> }
}
```

Cases use strict equality (`===`) and there is no fall-through. `@default` is optional.

### `@let`: template variables

`@let` (Angular 18.1+) declares a read-only local variable in the template. It is re-evaluated whenever the template is checked and is visible to the following siblings and their children:

```html
@let total = cart().items.length;
@let hasItems = total > 0;
<p>{{ total }} items</p>
@if (hasItems) { <button>Checkout</button> }
```

Use it to avoid repeating a long expression, or to unwrap a value once. It is not a replacement for `computed()`: derived business state still belongs in the class.

## Legacy vs modern

Before v17, control flow came from **structural directives** in `CommonModule`:

```html
<!-- legacy -->
<p *ngIf="user as u; else signIn">Welcome back, {{ u.name }}</p>
<ng-template #signIn><button>Sign in</button></ng-template>

<li *ngFor="let p of products; trackBy: trackById; let i = index">{{ i + 1 }}. {{ p.name }}</li>

<div [ngSwitch]="status">
  <span *ngSwitchCase="'active'">Active</span>
  <span *ngSwitchDefault>Unknown</span>
</div>
```

| Legacy | Modern |
| --- | --- |
| `*ngIf="x; else tpl"` + `<ng-template #tpl>` | `@if (x) { } @else { }` |
| `*ngFor` + optional `trackBy` function | `@for (...; track key)` with required `track` |
| no empty state | `@empty { }` |
| `[ngSwitch]` / `*ngSwitchCase` | `@switch` / `@case` / `@default` |
| import `NgIf`, `NgFor`, `CommonModule` | nothing to import |

The built-in blocks are faster (the new `@for` diffing algorithm is significantly quicker than `NgFor`), give better type narrowing, and read like JavaScript. The `ng generate @angular/core:control-flow` schematic migrates existing templates automatically. `*ngIf` and friends are deprecated and are covered in the Legacy module.

## Pitfalls

- **Missing `track`** is a compile error. Picking a bad key (like `$index` for a list that gets reordered or filtered) causes DOM nodes and their state, such as an input's text or focus, to stick to the wrong item.
- **Duplicate track keys** produce a runtime warning and unpredictable updates.
- **Logic in templates:** filtering inside `@for (x of items().filter(...))` reruns the filter on each check. Prefer a `computed()` like `visibleItems`.
- `@let` variables cannot be reassigned from the template and are not available before their declaration.
