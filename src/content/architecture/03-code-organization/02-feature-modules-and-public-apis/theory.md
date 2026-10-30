## A feature is a module, not a folder

Moving files into `features/cart` changes nothing if the rest of the app still imports `features/cart/model/CartContext`. A **feature module** is a folder with a **public API**: one `index.js` that declares what other code may use. Everything else in the folder is private, even though JavaScript cannot enforce that by itself.

```text
features/
  cart/
    model/CartContext.jsx      private: reducer, context object
    components/CartBadge.jsx   private file, public component
    index.js                   public API
  catalog/
    api/fetchProducts.js       private
    components/ProductList.jsx
    index.js
shared/
  lib/formatPrice.js
```

```js
export { CartProvider, useCart } from './model/CartContext';
export { CartBadge } from './components/CartBadge';
```

Consumers import the folder, which resolves to its `index.js`:

```jsx
import { CartBadge, CartProvider } from './features/cart';
```

## Why a public API pays off

- **Free refactoring inside**: rename `model/` to `store/`, swap `useReducer` for Zustand, split a component. As long as `index.js` exports the same names, no consumer changes.
- **A visible contract**: reviewers see the surface of a feature in one file. A new export is a deliberate API change, not a side effect.
- **Fewer accidental couplings**: when `cartReducer` is not exported, nobody can start depending on its action shapes.
- **Enforceable boundaries**: "import `features/<name>` but never `features/<name>/<anything>`" is a single lint rule.

## Explicit named exports, not `export *`

```js
export * from './model/CartContext';
```

This re-exports *everything*, including `CartContext` and `cartReducer`, which were exported from their file only so the feature's own files could share them. Explicit named re-exports keep the list intentional. Default exports in an index also hide what the module offers; prefer named ones.

## Deep imports and how they sneak in

A **deep import** reaches past the index into a feature's internals:

```js
import { useCart } from '../../cart/model/CartContext';
```

Editors auto-import the file where a symbol is *defined*, so deep imports appear without anyone deciding to write them. That is why boundaries need a check: ESLint `import/no-restricted-paths` or `eslint-plugin-boundaries`, dependency-cruiser, or an architecture test like the one this platform runs on its own `src/` folder.

Imports **inside** a feature stay relative and may reach any file (`../model/CartContext`). The rule only applies across features.

## Feature to feature

Here the catalog needs `useCart` to add products, so it imports `../../cart`, through the cart's public API. That is the minimum rule. Stricter architectures go further: Bulletproof React forbids feature-to-feature imports entirely and composes features in the app layer (pass `onAdd` down from `App`), and Feature-Sliced Design forbids imports between slices of the same layer. The next lesson builds a checker for those rules.

## Duplicated helpers go down, not sideways

When two features need the same domain-free helper (`formatPrice`), the fix is not "cart imports catalog's helper". Move it **down** to `shared/lib` and let both import it. Shared files never import features, so dependencies keep flowing in one direction.

```js
import { formatPrice } from '../../../shared/lib/formatPrice';
```

Shared code is usually imported by path (`shared/ui/Button`) rather than through one giant index, because it has no internals to hide and one index would make every consumer load everything.

## Pitfalls

- **Barrel files that re-export the world** slow down tests and bundlers that cannot tree-shake side-effectful modules. Keep feature indexes small and explicit.
- **Circular imports through indexes**: if `cart` imports `catalog` and `catalog` imports `cart`, the indexes form a cycle and one side can see `undefined` exports while modules are still evaluating. Cycles are a design smell: extract the shared part to an entity or to `shared`.
- **Exporting for tests**: do not widen the public API so tests can reach internals. Test the feature through its API, or colocate unit tests inside the feature.
- **A feature's own files importing its index** creates self-cycles. Inside, import files directly.

## When to choose it

Add an `index.js` public API as soon as a feature has a consumer outside its folder, and add the lint rule in the same change. Small apps with one or two features can skip it, but the cost is a few lines, so most teams adopt it from the start. Skip a single giant `shared/index.js`; import shared code by path.
