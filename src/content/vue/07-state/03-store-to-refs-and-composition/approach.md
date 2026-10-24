1. In `cart.ts`, call `useProductsStore()` inside the setup function and keep the instance in a constant.
2. Build `items` by mapping `ids` through `productsStore.byId` and filtering out missing products.
3. Build `total` by reducing `items` over `price`.
4. In `CartSummary.vue`, import `storeToRefs` from `pinia`, write `const { items, total } = storeToRefs(cart)` and `const { add } = cart`.
