Build a list component whose item rendering can be customized with a template.

**`ItemList`** (selector `app-item-list`)

1. Input `items: string[]` (required).
2. Optional input `itemTemplate: TemplateRef<ItemContext>` where `ItemContext` is `{ $implicit: string; index: number }`.
3. Renders a `<ul>` with one `<li>` per item. Inside each `<li>`, render `itemTemplate` (or a built-in default template that shows just the item text) with `NgTemplateOutlet` and the context `{ $implicit: item, index }`.
4. When `items` is empty, render `<p>No items</p>` instead of the list.

**`App`** (selector `app-root`) renders:

```html
<app-item-list [items]="fruits" [itemTemplate]="numbered" />
<ng-template #numbered let-fruit let-i="index"><strong>{{ i + 1 }}. {{ fruit }}</strong></ng-template>
```

with `fruits = ['Apple', 'Banana', 'Cherry']`.
