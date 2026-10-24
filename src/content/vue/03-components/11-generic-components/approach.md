1. Add the `generic` attribute with the `id` constraint to `<script setup>`.
2. Declare `items` and `selected` props, the `select` event and the typed default slot, all using `T`.
3. Render the listbox with one keyed option per item.
4. Bind `aria-selected`, emit `select` on click and render the slot with `item` and `selected`, falling back to the id.
