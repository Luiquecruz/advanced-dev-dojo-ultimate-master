1. List what each feature's consumers actually use: `App` needs `ProductList`, `CartProvider` and `CartBadge`; the catalog needs `useCart`. That list is the public API, nothing more.
2. Write each `index.js` with explicit named re-exports from the feature's own files. Leave `fetchProducts`, `CartContext` and `cartReducer` out on purpose.
3. Rewrite the imports that cross a feature boundary to target the folder (`./features/cart`, `../../cart`). Leave imports within the same feature relative to their files.
4. The duplicated helper has no domain knowledge, so it moves down to `shared/lib`, not sideways into one of the features. Export it once and import it from both places.
5. Check the direction: shared imports nothing from features, features import each other only through indexes, and the app composes features through their APIs.
6. Run the shop again: behavior must be identical, because a structural refactor should never change what users see.
