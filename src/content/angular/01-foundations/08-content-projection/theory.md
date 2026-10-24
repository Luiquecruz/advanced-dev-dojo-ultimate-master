## Passing markup into a component

Inputs pass **data**. Sometimes a component should wrap arbitrary **markup** supplied by the parent: a card, a dialog, a layout, a button with an icon. Angular calls this **content projection**, and the placeholder is `<ng-content>` (the equivalent of React's `children` or Vue's `<slot>`).

```ts
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content />
    </div>
  `,
})
export class Card {}
```

```html
<app-card>
  <h3>Hello</h3>
  <p>Anything between the tags is projected.</p>
</app-card>
```

The projected nodes belong to the **parent**: their bindings, event handlers and component instances are evaluated in the parent's context. The child only decides **where** they appear.

### Multiple slots with `select`

`select` takes a CSS selector (element, attribute or class) and picks matching top-level children. Anything that matches no selector goes to the `<ng-content>` without `select`.

```ts
@Component({
  selector: 'app-dialog',
  template: `
    <header><ng-content select="[dialog-title]" /></header>
    <main><ng-content /></main>
    <footer><ng-content select="app-dialog-actions, [dialog-actions]" /></footer>
  `,
})
export class Dialog {}
```

```html
<app-dialog>
  <h2 dialog-title>Delete file?</h2>
  <p>This cannot be undone.</p>
  <div dialog-actions>
    <button>Cancel</button>
    <button>Delete</button>
  </div>
</app-dialog>
```

Attribute selectors like `[dialog-title]` are the most common convention: they work on any element and read well.

### Fallback content

Since Angular 18, content placed **inside** `<ng-content>` is rendered when nothing is projected into that slot:

```html
<footer>
  <ng-content select="[dialog-actions]">
    <button>Close</button>
  </ng-content>
</footer>
```

### `ngProjectAs`

When the element you want to project doesn't match the selector (for example it's wrapped in an `<ng-container>`), declare which selector it should be treated as:

```html
<ng-container ngProjectAs="[dialog-title]">
  @if (isNew()) { <h2>Create</h2> } @else { <h2>Edit</h2> }
</ng-container>
```

### Only top-level children are matched

`select` matches the **direct children** of the component tag. A `[dialog-title]` nested inside a `<div>` is not matched separately; the whole `<div>` goes to whichever slot it matches.

## Pitfalls

- **Projected content is always created.** Wrapping `<ng-content>` in `@if (open())` hides it, but the parent still instantiates the projected components and runs their lifecycle even when hidden. For truly lazy content, accept an `<ng-template>` and render it with `NgTemplateOutlet` (covered in the templates module).
- **A slot is rendered once.** You can't project the same content twice with two identical `<ng-content>` tags; Angular uses the last matching one. Again, templates are the solution for repeated rendering.
- **Styling projected content:** with default (emulated) view encapsulation, the child's styles don't reach projected nodes. Style them from the parent, or in the child with `:host ::ng-deep` (discouraged) or by styling the slot wrapper.
- **Conditional `<ng-content>` in control flow** is fine, but the content is attached to the first matching slot only.

## Projection vs inputs

| Use an input when… | Use projection when… |
| --- | --- |
| the child needs data to render (`title`, `items`) | the parent controls the markup (rich text, icons, buttons) |
| you want a strict, typed API | you want a flexible layout component |

Many components combine both: `[variant]="'danger'"` as an input plus a projected label.
