Stores can use each other: `const productsStore = useProductsStore()` at the top of the cart's setup function, then read `productsStore.byId(id)` inside computeds.
---
`byId` may return `undefined`. Filter those out (a type predicate keeps TypeScript happy): `.filter((product): product is Product => product !== undefined)`.
---
Destructuring a reactive store copies the current values. `storeToRefs(store)` returns refs for state and getters only; actions are plain functions and can be destructured from the store itself.
