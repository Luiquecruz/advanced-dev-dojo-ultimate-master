1. Add `count` and `total` to `getters` as arrow functions of `state` that reduce over `state.items`.
2. Add `addItem` to `actions` as a method: find an item by name; increment its quantity or push a new item.
3. Add `removeItem` that reassigns `this.items` to a filtered copy.
4. In `App.vue`, add the `Clear cart` button calling `cart.$reset()` and two paragraphs interpolating `cart.count` and `cart.total`.
