Start with the public APIs: each `index.js` is a list of re-exports from files inside its own folder, such as `export { ProductList } from './components/ProductList';`. Then point every outside import at the folder.
---
In `App.jsx`, `'./features/cart'` resolves to `features/cart/index.js`, so one import line can bring `CartBadge` and `CartProvider`. In `ProductList.jsx`, the cart folder is two levels up: `'../../cart'`.
---
Create `formatPrice` in `shared/lib/formatPrice.js` with a named export, then replace both local copies with `import { formatPrice } from '../../../shared/lib/formatPrice';` (three levels up from `features/<name>/components/`).
