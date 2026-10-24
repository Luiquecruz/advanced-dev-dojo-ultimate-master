Getters receive `state` as their first argument: `count: (state) => state.items.reduce(...)`.
---
Actions are regular methods: use `this` to reach the state (`this.items`). Do not use arrow functions for actions, they have no `this`.
---
In `addItem`, look for an existing item with `this.items.find(...)`. Mutating `existing.quantity++` is fine: state is reactive.
---
Option stores get `$reset()` for free because Pinia can call your `state()` function again. In the template, `@click="cart.$reset()"` and `{{ cart.count }}`.
