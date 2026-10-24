Write two composables in `main.ts` (no preview; the tests call your exports).

1. `useCart()` keeps its state in `const state = reactive({ items: [] as string[], coupon: '' })` and returns:
   - every state field as **linked refs** (`...toRefs(state)`), so `const { items, coupon } = useCart()` stays reactive in both directions;
   - `itemCount`: a **read-only ref** built with `toRef(() => ...)` holding `state.items.length`;
   - `summary`: a computed string `"<n> items"`, followed by `" with <coupon>"` when a coupon is set (e.g. `"2 items with SAVE10"`);
   - `add(item: string)`: pushes the item into `state.items`.
2. `useLength(source: MaybeRefOrGetter<string>)` returns a computed with the length of the source, using **`toValue`**. It must work with a plain string, a ref and a getter.
