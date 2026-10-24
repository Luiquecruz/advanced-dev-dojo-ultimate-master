## Two-way binding between components

Sometimes a child needs to **change** a value owned by the parent: a toggle switch, a quantity picker, a date picker, a tab group's selected index. With plain inputs and outputs you would write:

```html
<app-toggle [checked]="darkMode()" (checkedChange)="darkMode.set($event)" />
```

`model()` packages that pair into one writable signal, and the **banana-in-a-box** syntax `[( )]` binds both directions at once.

```ts
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `
    <button role="switch" [attr.aria-checked]="checked()" (click)="toggle()">
      {{ checked() ? 'On' : 'Off' }}
    </button>
  `,
})
export class Toggle {
  readonly checked = model(false);

  toggle() {
    this.checked.update((value) => !value);
  }
}
```

```ts
@Component({
  selector: 'app-settings',
  imports: [Toggle],
  template: `
    <app-toggle [(checked)]="darkMode" />
    <p>Dark mode is {{ darkMode() ? 'enabled' : 'disabled' }}</p>
  `,
})
export class Settings {
  protected readonly darkMode = signal(false);
}
```

### How it works

- `model<T>(initial)` creates a `ModelSignal<T>`: an **input** named `checked` plus an **output** named `checkedChange`.
- Inside the child it is a writable signal: `set()` and `update()` work (unlike `input()`).
- When the child writes to it, Angular emits `checkedChange` with the new value. When the parent passes a new value, the child's signal updates.
- `[(checked)]="darkMode"` binds a **signal** (note: no parentheses). Angular reads it for the input and calls `darkMode.set($event)` on change. You can also bind a plain field: `[(checked)]="isDark"`.
- `model.required<T>()` forces the parent to bind it.
- One-way usage still works: `[checked]="true"` or `(checkedChange)="log($event)"`.

### `[( )]` is syntax sugar

```html
<app-toggle [(checked)]="darkMode" />
<!-- is the same as -->
<app-toggle [checked]="darkMode()" (checkedChange)="darkMode.set($event)" />
```

This naming convention (`x` + `xChange`) is exactly what the legacy decorator API used too, and it's how `[(ngModel)]` works on form controls.

## Legacy vs modern

```ts
// legacy
export class Toggle {
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  toggle() {
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
```

The legacy version needs two members kept in sync by hand. Forgetting the `emit` (or emitting a different value than you stored) were classic bugs. `model()` makes the pair one source of truth.

## `model()` vs `input()` vs `linkedSignal()`

| Need | Use |
| --- | --- |
| Child only reads the value | `input()` |
| Child edits the value and the **parent must know** | `model()` |
| Child keeps a **local** editable copy that resets when the input changes | `input()` + `linkedSignal()` |

Use `model()` for genuine form-like controls. Don't use it as a shortcut to mutate parent state from deep components; that's what services or outputs with clear intent are for.

## Pitfalls

- **Calling the signal in the banana box:** `[(checked)]="darkMode()"` passes a value, not something writable, and is a compile error. Write `[(checked)]="darkMode"`.
- **Expecting `checkedChange` when the parent changes the value:** the output fires only when the **child** writes to the model.
- **Validation:** `model()` has no transform option. Clamp or validate in the child before calling `set()`.
