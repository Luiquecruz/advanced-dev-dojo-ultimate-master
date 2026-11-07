1. Define the state shape and the injection tokens for the edges.
2. Derive `visible`, `lines`, `total` and `itemCount` with `withComputed`, joining quantities to current products.
3. Write `load` with the guard, status transitions and the error path that keeps products.
4. Write `add`, `remove` and `setCategory` with immutable `patchState` updates, persisting the versioned quantities after cart changes.
5. Restore the cart in the `onInit` hook with a defensive reader.
