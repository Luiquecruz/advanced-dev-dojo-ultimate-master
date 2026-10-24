Finish the product picker in `App.vue`. The `products` array, the `query` and `maxPrice` refs and the template are ready.

1. `filtered` must be a **computed** with the products whose `name` contains `query` (case-insensitive) **and** whose `price` is `<= maxPrice`.
2. `total` must be a **computed** with the sum of the filtered prices. The template renders `Total: $754` with every product visible.
3. `fullName` must be a **writable computed** built from the `firstName` (`"Ada"`) and `lastName` (`"Lovelace"`) refs:
   - `get` returns `"Ada Lovelace"`;
   - `set` splits the new value on the first space, storing the first word in `firstName` and the rest in `lastName`.

The `Full name` input uses `v-model.lazy`, so the setter runs when the field loses focus. The template shows `firstName` and `lastName` in `<output>` elements labelled `First` and `Last`.
