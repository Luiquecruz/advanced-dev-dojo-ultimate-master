Inject the two building blocks in each directive: `inject(TemplateRef)` and `inject(ViewContainerRef)`. Declare the input with the selector's name: `readonly appUnless = input.required<boolean>();`.
---
React to the input in the constructor with `effect(() => { ... })`. For `Unless`, create the view only when the condition is false **and** `this.container.length === 0`; call `clear()` when it becomes true.
---
For `Times`: inside the effect, `clear()` the container, then loop `for (let index = 0; index < count; index++)` calling `createEmbeddedView(this.template, { $implicit: index, count })`.
