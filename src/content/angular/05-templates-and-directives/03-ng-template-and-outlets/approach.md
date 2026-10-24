1. Separate responsibilities: `ItemList` owns looping and the empty state; the parent owns how one item looks.
2. Accept the presentation as a `TemplateRef` input and provide a default `<ng-template>` for when it is missing.
3. Branch on `items().length` with `@if` to show the empty message.
4. In the `@for`, render the chosen template with `NgTemplateOutlet`, passing the item as `$implicit` and the index.
5. In `App`, declare the custom `<ng-template>` with `let-` variables matching the context and pass its reference to the list.
