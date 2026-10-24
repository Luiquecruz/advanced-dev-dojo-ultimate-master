## Custom structural directives

A **structural directive** decides whether, how many times and with which data a piece of template is rendered. The built-in control flow (`@if`, `@for`) covers most needs, but structural directives are still how you build reusable rendering logic: permission checks (`*appCan="'admin'"`), feature flags, repeaters, virtual scrolling.

### The `*` is sugar for `<ng-template>`

```html
<p *appUnless="loggedIn">Please sign in</p>

<!-- is compiled to -->
<ng-template [appUnless]="loggedIn">
  <p>Please sign in</p>
</ng-template>
```

The element is **not** rendered by default. The directive receives two things through DI:

- `TemplateRef`: the blueprint inside `<ng-template>`.
- `ViewContainerRef`: the anchor where views can be inserted.

```ts
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

@Directive({ selector: '[appUnless]' })
export class Unless {
  readonly appUnless = input.required<boolean>();
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.container.clear();
      if (!this.appUnless()) {
        this.container.createEmbeddedView(this.template);
      }
    });
  }
}
```

Using a signal input plus `effect()` re-renders whenever the condition changes. A production version would remember whether the view already exists instead of recreating it.

### Microsyntax and context

The text after `*` is a small language. Every `key expr` becomes an input named *selector + Key*, and `let` declares template variables read from the **context** object:

```html
<li *appRepeat="3; let i; let last = isLast">Item {{ i }} @if (last) { (last) }</li>
```

| Microsyntax | Meaning |
| --- | --- |
| `appRepeat="3"` | input `appRepeat` = 3 |
| `let i` | `i` = `context.$implicit` |
| `let last = isLast` | `last` = `context.isLast` |
| `; from: x` (if used) | input `appRepeatFrom` = x |

```ts
interface RepeatContext {
  $implicit: number;
  isLast: boolean;
}

this.container.createEmbeddedView(this.template, { $implicit: index, isLast: index === count - 1 });
```

### Type-checking the context

Add a static guard so the compiler knows the type of `let` variables:

```ts
static ngTemplateContextGuard(directive: Repeat, context: unknown): context is RepeatContext {
  return true;
}
```

### Legacy: `*ngIf`, `*ngFor` and setter inputs

Before Angular 17, `*ngIf` and `*ngFor` from `CommonModule` were themselves structural directives, and custom ones used an `@Input()` setter:

```ts
@Input() set appUnless(condition: boolean) {
  if (!condition && !this.hasView) { this.vcr.createEmbeddedView(this.tpl); this.hasView = true; }
  else if (condition && this.hasView) { this.vcr.clear(); this.hasView = false; }
}
```

The built-in `@if`/`@for` blocks replaced `*ngIf`/`*ngFor` (they are deprecated), but the `TemplateRef` + `ViewContainerRef` mechanism remains the foundation for your own directives.

### Pitfalls

- Only **one** structural directive per element. Wrap in `<ng-container>` to combine them.
- Forgetting `container.clear()`: every change appends more copies.
- Creating views in the constructor without reacting to input changes: the directive renders only once.
