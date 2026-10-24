1. Read the failing test names: one targets the store in isolation, the others target rendering. That separates model bugs from binding bugs.
2. In `CartStore`, notice that `total` is stored and updated by hand in `add` but not in `remove`. Derived values must be computed: replace the field with a `get total()` getter; `makeAutoObservable` makes it a cached computed.
3. `CartSummary` reads observables but is a plain function component, so MobX never subscribes it. Wrap it in `observer` from `mobx-react-lite`; now it re-renders for changes from clicks and from code outside React.
4. `WishlistCount` reads the proxy directly in render. That gives a correct first value but no subscription. Read `useSnapshot(wishlist)` instead.
5. `SaveButton` passes the snapshot to `toggleSaved`, which tries to mutate a frozen object and throws. Mutate the proxy (`wishlist`) and keep reading `saved` from the snapshot.
