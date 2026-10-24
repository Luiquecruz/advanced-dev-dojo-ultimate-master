## Listening to events with `( )`

Parentheses bind a **DOM event** to a template statement:

```html
<button (click)="save()">Save</button>
<input (input)="onInput($event)" (blur)="touched.set(true)" />
```

The statement runs every time the event fires. Unlike binding expressions, statements may have side effects: call methods, set signals, even chain calls with `;`.

```ts
@Component({
  selector: 'app-like',
  template: `<button (click)="likes.update(n => n + 1)">❤ {{ likes() }}</button>`,
})
export class Like {
  protected readonly likes = signal(0);
}
```

In a zoneless application a template event handler automatically schedules change detection for the component, so updating a signal (or even a plain field) inside it refreshes the view.

### `$event`

`$event` is the native event object (`MouseEvent`, `KeyboardEvent`, `InputEvent`…), or the emitted value for component outputs.

```ts
@Component({
  template: `<input [value]="name()" (input)="updateName($event)" />`,
})
export class NameField {
  protected readonly name = signal('');

  updateName(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
  }
}
```

Type the parameter as `Event` and narrow `event.target`; the template type checker knows `$event` is an `Event` for `(input)`. Alternatively avoid `$event` with a template reference variable:

```html
<input #box (keyup)="search(box.value)" />
```

### Key event filtering

Angular can filter keyboard events by key, with modifiers:

```html
<input (keydown.enter)="submit()" (keydown.escape)="cancel()" />
<textarea (keydown.control.enter)="send()"></textarea>
<div (keydown.shift.tab)="previous()"></div>
```

`keydown.enter` only calls `submit()` when the pressed key is Enter, so you don't need `if (event.key === 'Enter')` inside the handler. Use `code` for layout-independent physical keys: `(keydown.code.keyw)`.

### Preventing default behavior

Call `preventDefault()` on the event when needed:

```html
<form (submit)="$event.preventDefault(); save()">…</form>
<a href="/help" (click)="openHelp($event)">Help</a>
```

### Global and host events

A component can listen to events on its own host element, or on `window`/`document`, through the `host` metadata:

```ts
@Component({
  selector: 'app-shortcuts',
  host: {
    '(document:keydown.escape)': 'close()',
    '(window:resize)': 'measure()',
  },
  template: `...`,
})
export class Shortcuts {}
```

**Legacy vs modern:** older code uses `@HostListener('window:resize', ['$event'])` on a method. It still works, but the style guide prefers the `host` object, which keeps all host bindings in one place.

### Two-way binding on native inputs

`[value]` + `(input)` is the manual form of two-way binding. Angular Forms (`[(ngModel)]`, reactive forms, Signal Forms `[field]`) automate it, and components get `[(prop)]` with `model()` in a later lesson.

## Pitfalls

- **Calling the method too early:** `(click)="save"` does nothing; it must be a statement, `(click)="save()"`.
- **Using `(change)` for live updates:** on text inputs `change` fires only on blur. Use `(input)` for keystrokes.
- **Heavy work in `(scroll)` or `(mousemove)`:** these fire constantly. Throttle them (RxJS `fromEvent` + `throttleTime`) or use CSS.
- **Reading `event.target.value` without narrowing:** `event.target` is `EventTarget | null` in TypeScript, so cast it to the concrete element type.
- **Naming handlers after events** (`onClick`, `handleKeydown`). The style guide recommends naming them after the action: `save()`, `send()`, `clear()`.
