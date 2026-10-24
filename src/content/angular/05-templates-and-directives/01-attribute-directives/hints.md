Name the input like the selector so the attribute value feeds it: `readonly appHighlight = input('');`. A `computed(() => this.appHighlight() || 'yellow')` handles the empty attribute.
---
Track hovering in a `signal(false)` and update it from host listeners: `'(mouseenter)': 'hovered.set(true)'`, `'(mouseleave)': 'hovered.set(false)'`.
---
Bind the style in `host`: `'[style.backgroundColor]': 'hovered() ? color() : null'`.
---
On `Card`: `hostDirectives: [{ directive: Highlight, inputs: ['appHighlight: highlightColor'] }]`.
