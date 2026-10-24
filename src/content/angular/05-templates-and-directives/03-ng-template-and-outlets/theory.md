## `<ng-template>`, `<ng-container>` and template outlets

### `<ng-template>`: a template that is not rendered

Content inside `<ng-template>` is compiled but **not** rendered. It becomes a `TemplateRef` that something else can stamp out later, zero, one or many times.

```html
<ng-template #loading>
  <p>Loading…</p>
</ng-template>
```

`#loading` is a **template reference variable**. On an `<ng-template>` it refers to the `TemplateRef`; on a regular element it refers to the DOM element; on a component, to the component instance.

### `<ng-container>`: a grouping element without DOM

`<ng-container>` renders its children with no wrapper element. It is the host for outlets and for directives that need an element but should not add one.

### `NgTemplateOutlet`: render a template somewhere

```ts
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-card',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #fallback><em>No content</em></ng-template>
    <ng-container *ngTemplateOutlet="body() ?? fallback" />
  `,
})
export class Card {
  readonly body = input<TemplateRef<unknown>>();
}
```

You can also bind it as a property on `<ng-container>`: `[ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="ctx"`.

### Passing data with a context

The context object becomes `let-` variables inside the template:

```html
<ng-template #row let-user let-position="index">
  {{ position }}. {{ user.name }}
</ng-template>

<ng-container *ngTemplateOutlet="row; context: { $implicit: user, index: 1 }" />
```

- `let-user` (no value) reads `$implicit`.
- `let-position="index"` reads `context.index`.

### Customizable components

This is the key pattern: a component owns the **logic** (looping, empty state, selection, virtualization) while the parent provides the **presentation** as a template. Libraries like Angular CDK tables and Material autocomplete work this way.

```html
<app-item-list [items]="users" [itemTemplate]="userRow" />

<ng-template #userRow let-user let-i="index">
  <strong>{{ i + 1 }}.</strong> {{ user.name }}
</ng-template>
```

Compared to `<ng-content>`, which projects content **once** and owned by the parent, a template input can be rendered **many times with different data**.

### `@let` for local template variables

Angular 19+ lets you declare read-only variables directly in templates, avoiding repeated calls or pipes:

```html
@let user = user$ | async;
@let fullName = user?.first + ' ' + user?.last;
<h1>{{ fullName }}</h1>
```

### Legacy notes

- `<ng-template [ngIf]="cond" [ngIfElse]="other">` and `*ngIf="cond; else loading"` were the common way to reference `<ng-template>` blocks before `@if/@else`.
- Old code sometimes read templates with `@ContentChild(TemplateRef)`; today `contentChild(TemplateRef)` or an explicit input is preferred.

### Pitfalls

- Using a reference variable from inside an `@if` or `@for` block outside of it: references are scoped to their template.
- Forgetting to import `NgTemplateOutlet`: the binding fails with "Can't bind to 'ngTemplateOutlet'".
- Mismatched context names: `let-i="index"` needs a context property named exactly `index`.
