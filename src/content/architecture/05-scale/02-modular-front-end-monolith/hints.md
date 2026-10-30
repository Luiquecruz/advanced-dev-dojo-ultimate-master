Start with the module that already works: `modules/account/index.js` shows the whole public API of a module. The catalog's `register` is the same one-liner with its own path, title and page.
---
The catalog already receives `events` as a prop from the shell. Replace the cart store call with `events.emit('cart:add', product)` and delete the import of `../cart/cartStore`. Now nothing in the catalog knows the cart exists.
---
In the cart's `register`, the store lives in the closure: `const store = createCartStore(); shell.events.on('cart:add', store.add);`. Define a small component inside `register` that renders `<CartPage store={store} />` and pass it as `Component`. Then drop the `export const cartStore` line.
---
In `App.jsx`, `import * as catalogModule from './modules/catalog'` resolves the folder `index.js`. Keep the modules in an array and call `register(shell)` on each in `createApp()`.
