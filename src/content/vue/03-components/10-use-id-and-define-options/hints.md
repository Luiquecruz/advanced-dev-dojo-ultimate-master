`defineOptions({ name: 'FormField', inheritAttrs: false })` replaces the separate `<script>` block you would otherwise need.
---
`const id = useId()` once in setup. Bind `:for="id"` on the label and `:id="id"` on the input.
---
Use a template literal for related ids: `` :id="`${id}-help`" ``. Binding `undefined` removes an attribute: ``:aria-describedby="help ? `${id}-help` : undefined"``.
