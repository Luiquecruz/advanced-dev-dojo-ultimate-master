## Attribute directives

A **directive** adds behavior to an existing element. Components are directives with a template; **attribute directives** have no template and change the appearance or behavior of their host element: tooltips, autofocus, permission checks, click-outside, highlight on hover.

```ts
import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[style.backgroundColor]': 'hovered() ? color() : null',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
})
export class Highlight {
  readonly color = input('yellow', { alias: 'appHighlight' });
  protected readonly hovered = signal(false);
}
```

```html
<p appHighlight="lightblue">Hover me</p>
```

- The **selector** `[appHighlight]` matches any element with that attribute. Prefix selectors to avoid clashing with native attributes and libraries.
- An input aliased to the selector name lets the attribute value configure the directive.
- The **`host`** metadata binds host properties (`[prop]`), attributes (`[attr.x]`), classes (`[class.active]`), styles (`[style.width.px]`) and listens to host events (`(click)`, `(window:resize)`, `(document:keydown.escape)`).
- Like components, directives are standalone: add them to the `imports` of the component that uses them.

### Legacy: `@HostBinding` and `@HostListener`

```ts
@Directive({ selector: '[appHighlight]' })
export class Highlight {
  @Input('appHighlight') color = 'yellow';
  @HostBinding('style.backgroundColor') background: string | null = null;

  @HostListener('mouseenter') onEnter() { this.background = this.color; }
  @HostListener('mouseleave') onLeave() { this.background = null; }
}
```

The decorators still work, but the style guide now prefers the `host` object: everything about the host is in one place, it is type-checked against the class, and it works naturally with signals.

### Touching the DOM directly

`inject(ElementRef)` gives you the host element (`elementRef.nativeElement`). Prefer bindings in `host` whenever possible; reach for the element only for imperative APIs (`focus()`, `scrollIntoView()`, third-party widgets), ideally inside `afterNextRender()` so it is safe with server rendering. `Renderer2` is the abstraction older code used to manipulate the DOM in a platform-independent way.

### Composition with `hostDirectives`

A component or directive can apply other directives to its own host, without the consumer writing them in the template:

```ts
@Component({
  selector: 'app-menu-item',
  hostDirectives: [
    { directive: Highlight, inputs: ['appHighlight: color'] },
    CdkMenuItem,
  ],
  template: `<ng-content />`,
})
export class MenuItem {}
```

```html
<app-menu-item color="pink">Settings</app-menu-item>
```

- Host directive inputs and outputs are **not exposed by default**. List them in `inputs`/`outputs`, optionally renaming with `'inner: outer'`.
- Host directives are always standalone and are applied statically (you cannot add them conditionally).
- This is composition instead of inheritance: reuse behavior without `extends`.

### Pitfalls

- Forgetting to add the directive to `imports`: the attribute is silently treated as a plain HTML attribute.
- Directly assigning `nativeElement.style...` while also binding the same style in `host`: the next change detection overwrites your manual change.
- An input aliased to the selector receives `''` when the attribute has no value (`<p appHighlight>`). Provide a fallback with a `computed()` or `transform`.
