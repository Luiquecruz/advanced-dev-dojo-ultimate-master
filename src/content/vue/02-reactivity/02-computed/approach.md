1. Make `filtered` read `query.value` and `maxPrice.value` and filter the static `products` array with both conditions.
2. Make `total` reduce over `filtered.value`, so it reuses the cached filtered list.
3. Replace the `fullName` ref with `computed({ get, set })`: the getter joins the two refs, the setter splits the input and writes them back.
4. Type in the inputs of the preview to confirm the list, total and name fields update together.
