Build two slot-based components and use them in `App.vue`.

**`Card.vue`**

1. Render a root `<article class="card">` with:
   - `<header>` containing a named slot `header` with the fallback text `Untitled`,
   - `<div class="body">` containing the default slot,
   - `<footer>` containing a named slot `footer`, rendered **only** when the parent provides that slot.

**`ItemList.vue`**

2. Prop `items: { id: number; name: string; price: number }[]`.
3. Render `<ul class="item-list">` with one `<li>` per item. Inside each `<li>`, render a scoped slot named `item` that passes `item` and `index`. Its fallback is the item name.

**`App.vue`**

4. Render a `Card` whose header is `Products`, whose body is the `ItemList`, and whose footer is `<small>2 items</small>`.
5. Customize each row with the `item` slot so it reads `1. Keyboard ($120)`, `2. Mouse ($45)`.
