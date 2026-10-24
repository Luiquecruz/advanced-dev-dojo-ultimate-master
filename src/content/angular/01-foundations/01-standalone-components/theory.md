## Standalone components

Since Angular 19 every component is **standalone by default**: it declares its own dependencies in `imports` and needs no `NgModule`.

```ts
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">+1</button>
    @if (isEven()) { <span>even</span> }
  `,
})
export class Counter {
  protected readonly count = signal(0);
  protected readonly isEven = computed(() => this.count() % 2 === 0);

  increment() {
    this.count.update((value) => value + 1);
  }
}
```

- **Signals** hold reactive state. Read by calling them: `count()`. Write with `.set()` or `.update()`.
- `computed()` derives read-only signals that recompute when dependencies change.
- Angular 21+ applications are **zoneless by default**: signals tell Angular exactly what changed.
- Templates use `{{ }}` interpolation, `[property]` binding and `(event)` binding, plus the built-in control flow blocks `@if`, `@for` and `@switch`.
- Since Angular 20 the style guide drops the `.component` suffix: `counter.ts` exporting `Counter`.
