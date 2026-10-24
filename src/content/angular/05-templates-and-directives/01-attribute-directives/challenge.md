Create a hover highlight directive and reuse it in a component through `hostDirectives`.

**`Highlight` directive** (selector `[appHighlight]`)

1. An input named (or aliased) `appHighlight` with the color. When it is empty (`<p appHighlight>`), use `'yellow'`.
2. While the pointer is over the host (`mouseenter` → `mouseleave`), the host `style.backgroundColor` is the color; otherwise it is empty.
3. Declare bindings and listeners in the `host` metadata (no `@HostBinding` / `@HostListener`).

**`Card` component** (selector `app-card`)

1. Applies `Highlight` via `hostDirectives`, exposing its `appHighlight` input as `highlightColor`.
2. Projects its content with `<ng-content />`.

**`App` component** (selector `app-root`), imports both and renders:

```html
<p appHighlight="orange">Orange paragraph</p>
<p appHighlight>Default paragraph</p>
<app-card highlightColor="pink">Pink card</app-card>
```
