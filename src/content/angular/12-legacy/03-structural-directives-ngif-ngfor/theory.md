## Structural directives before control flow

Until Angular 17 introduced `@if`, `@for` and `@switch`, conditionals and loops were **structural directives** from `CommonModule`, recognizable by the `*` prefix. They were deprecated in Angular 20 but still work in Angular 22, and most existing codebases are full of them.

```html
<section *ngIf="user; else loading">Hello, {{ user.name }}</section>
<ng-template #loading><p>Loading...</p></ng-template>

<li *ngFor="let item of items; let i = index; let last = last; trackBy: trackById">
  {{ i + 1 }}. {{ item.name }} <span *ngIf="last">(last)</span>
</li>
```

## The star is sugar for ng-template

`*ngIf="cond"` is shorthand. Angular rewrites it to:

```html
<ng-template [ngIf]="cond">
  <section>...</section>
</ng-template>
```

The directive receives the `TemplateRef` and decides whether to stamp it into its `ViewContainerRef`. That is why **only one structural directive per element** is allowed: to combine `*ngIf` and `*ngFor`, wrap one in an `<ng-container>`, which renders no DOM element.

## NgIf

- `*ngIf="expr"`: renders when truthy.
- `*ngIf="expr; else other"`: renders the `<ng-template #other>` otherwise.
- `*ngIf="cond; then a; else b"`: both branches as templates.
- `*ngIf="user$ | async as user"`: stores the value in a local variable, the classic way to subscribe once in a template.

## NgFor

- `*ngFor="let item of items"` with exported locals: `index`, `count`, `first`, `last`, `even`, `odd`.
- **`trackBy`**: a function `(index, item) => identity`. Without it NgFor tracks by object identity, so replacing the array with fresh objects from an API **destroys and recreates every DOM node**, losing focus, input state and animations. With `trackBy: trackById`, rows whose id is unchanged are kept.
- No built-in empty state: you pair it with an `*ngIf ... else`.

## NgSwitch

```html
<div [ngSwitch]="status">
  <p *ngSwitchCase="'loading'">Loading</p>
  <p *ngSwitchCase="'error'">Failed</p>
  <p *ngSwitchDefault>Ready</p>
</div>
```

## Legacy vs modern

| CommonModule directive | Built-in control flow |
| --- | --- |
| `*ngIf="c; else e"` + `<ng-template #e>` | `@if (c) { ... } @else { ... }` |
| `*ngIf="obs | async as v"` | `@if (obs | async; as v) { ... }` |
| `*ngFor="let x of xs; trackBy: fn"` (optional) | `@for (x of xs; track x.id) { ... }` (required) |
| `*ngIf` around `*ngFor` for empty lists | `@empty { ... }` |
| `[ngSwitch]` / `*ngSwitchCase` | `@switch` / `@case` / `@default` |
| needs `CommonModule` or `NgIf`/`NgFor` imports | built into the compiler, no imports |

Control flow is faster (no directive instances, better diffing), type-narrows inside `@if`, and makes `track` mandatory so the identity mistake above cannot happen silently. Migrate automatically with:

```bash
ng generate @angular/core:control-flow
```

## Pitfalls when maintaining old templates

- **Missing imports**: in a standalone component, `*ngIf` without `NgIf` (or `CommonModule`) in `imports` renders nothing and only logs `NG0303: Can't bind to 'ngIf'` in the console.
- **`trackBy` returning the index** is as bad as no `trackBy` when items are inserted or reordered.
- **Falsy values**: `*ngIf="count"` hides the block when `count` is `0`. Compare explicitly (`count !== null`).
- **Expensive getters** inside `*ngFor` run on every change detection pass.
