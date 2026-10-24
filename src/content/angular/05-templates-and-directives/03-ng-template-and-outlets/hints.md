Declare the inputs: `readonly items = input.required<string[]>();` and `readonly itemTemplate = input<TemplateRef<ItemContext>>();`.
---
Define a fallback inside `ItemList`: `<ng-template #defaultItem let-item>{{ item }}</ng-template>`. Pick the template with `itemTemplate() ?? defaultItem`.
---
Inside the `@for`, render: `<ng-container *ngTemplateOutlet="itemTemplate() ?? defaultItem; context: { $implicit: item, index: $index }" />`.
---
In `App`, the template reference `#numbered` is the `TemplateRef`: `[itemTemplate]="numbered"` and `<ng-template #numbered let-fruit let-i="index">`.
