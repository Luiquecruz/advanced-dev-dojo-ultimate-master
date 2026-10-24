## Templates are HTML plus bindings

An Angular template is regular HTML extended with a small binding syntax. The compiler turns it into efficient DOM instructions, and every binding is re-evaluated when the signals it reads change.

```ts
@Component({
  selector: 'app-product',
  template: `
    <h2>{{ name() }}</h2>
    <img [src]="imageUrl()" [alt]="name()" />
    <button [disabled]="stock() === 0">Buy</button>
  `,
})
export class Product {
  protected readonly name = signal('Keyboard');
  protected readonly imageUrl = signal('/img/keyboard.png');
  protected readonly stock = signal(3);
}
```

### 1. Interpolation `{{ }}`

Renders an expression as **text**. The value is converted to a string and HTML is escaped, so `{{ '<b>hi</b>' }}` shows the tags literally (safe against XSS).

```html
<p>Total: {{ price() * quantity() }}</p>
<p>{{ user()?.name ?? 'Guest' }}</p>
```

Template expressions are a subset of TypeScript: you can call methods and signals, use ternaries, `?.`, `??`, arithmetic and template literals, but you cannot assign (`=`), use `new`, or reference globals like `window` or `console`. Keep them cheap and side-effect free; move heavy logic into `computed()` signals.

### 2. Property binding `[property]`

Square brackets bind a **DOM property** to an expression. Without brackets the value is a static string:

```html
<input [value]="query()" />      <!-- expression -->
<input value="query()" />        <!-- the literal text "query()" -->
<button [disabled]="isSaving()">Save</button>
```

DOM properties are not the same as HTML attributes. `disabled` is a boolean property, so `[disabled]="false"` really enables the button, while the static attribute `disabled="false"` would still disable it.

### 3. Attribute binding `[attr.name]`

Some attributes have no matching DOM property (ARIA, `colspan` on SVG, `data-*`). Use the `attr.` prefix:

```html
<div role="progressbar" [attr.aria-valuenow]="progress()"></div>
<td [attr.colspan]="columns()"></td>
```

Binding `null` or `undefined` removes the attribute.

### 4. Class and style bindings

```html
<li [class.active]="isActive()">...</li>                 <!-- toggle one class -->
<li [class]="{ active: isActive(), done: isDone() }">    <!-- many classes -->
<div [style.width.px]="width()"></div>                   <!-- unit suffix -->
<div [style.width.%]="progress()"></div>
<div [style]="{ color: color(), 'font-weight': 'bold' }"></div>
```

These bindings merge with static `class="..."` and `style="..."` attributes instead of replacing them.

**Legacy vs modern:** older code uses `[ngClass]` and `[ngStyle]` from `@angular/common`. They still work, but native `[class]` / `[style]` bindings need no import, are faster, and are what the Angular team recommends today.

### 5. Template reference variables `#ref`

`#name` gives a template-local handle to an element (or a component/directive instance):

```html
<input #box />
<button (click)="search(box.value)">Search</button>
```

## Pitfalls

- **Forgetting the parentheses on signals.** `{{ name }}` prints the signal function itself, not its value. Always call it: `{{ name() }}`.
- **Interpolating into properties.** `src="{{ url() }}"` works for strings, but `[disabled]="{{ x }}"` is an error. Use one syntax per binding: `[src]="url()"`.
- **Binding a typo.** `[valu]="x"` fails at compile time with "Can't bind to 'valu' since it isn't a known property" because Angular validates DOM properties.
- **Expensive expressions.** A function call in a template runs on every check of that view. Prefer `computed()`.

## Summary

| Syntax | Binds | Example |
| --- | --- | --- |
| `{{ expr }}` | text content | `{{ name() }}` |
| `[prop]="expr"` | DOM property | `[src]="url()"` |
| `[attr.x]="expr"` | HTML attribute | `[attr.aria-label]="label()"` |
| `[class.x]="bool"` | one CSS class | `[class.online]="isOnline()"` |
| `[style.x.unit]="expr"` | one style | `[style.width.%]="progress()"` |
| `#ref` | element handle | `<input #box>` |
