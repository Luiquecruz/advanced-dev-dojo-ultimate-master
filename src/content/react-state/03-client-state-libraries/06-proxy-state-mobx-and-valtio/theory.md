## Mutable state, tracked reads

Redux, Zustand and Jotai ask you to produce **new** objects. MobX and Valtio flip that around: you **mutate** plain-looking objects, and a JavaScript `Proxy` records which properties each component read during render. When one of those properties changes, only those components re-render. No selectors, no equality functions, no spread operators.

Both libraries rely on the same idea, but expose it differently:

| | MobX | Valtio |
| --- | --- | --- |
| State shape | classes or objects made observable | any object wrapped in `proxy()` |
| Reading in React | wrap the component in `observer` | `useSnapshot(state)` returns an immutable snapshot |
| Derived values | `computed` getters, cached | getters on the proxy, recomputed on read |
| Writes | actions (methods) | mutate the proxy anywhere |
| Side effects | `autorun`, `reaction`, `when` | `subscribe`, `subscribeKey`, `watch` |

## MobX: observables, computeds, actions, reactions

```js
import { makeAutoObservable, runInAction } from 'mobx';

export class CartStore {
  items = [];
  constructor() {
    makeAutoObservable(this);
  }
  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  add(product) {
    const existing = this.items.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else this.items.push({ ...product, quantity: 1 });
  }
  async loadSaved() {
    const saved = await fetch('/api/cart').then((response) => response.json());
    runInAction(() => {
      this.items = saved;
    });
  }
}
```

`makeAutoObservable` turns fields into **observables**, getters into **computeds** (cached until a dependency changes) and methods into **actions** (batched writes). Code after an `await` is no longer inside the action, so wrap it in `runInAction` (or use `flow` with generators).

```jsx
import { observer } from 'mobx-react-lite';

export const CartTotal = observer(function CartTotal({ cart }) {
  return <p>Total: ${cart.total}</p>;
});
```

`observer` subscribes the component to exactly the observables it dereferenced in its last render. A component that reads `cart.total` but is **not** wrapped in `observer` renders once and never updates: the most common MobX bug.

**MobX 7** (with `mobx-react-lite` 5) cleaned up the API: always Proxy-based, legacy decorators removed (use `makeAutoObservable` or standard decorators), namespaced helpers became named exports (`observable.ref` is now `observableRef`, `action.bound` is `actionBound`), and `Provider`/`inject` are gone from the React bindings: pass stores with plain React context.

## Valtio: write the proxy, read the snapshot

```jsx
import { proxy, useSnapshot } from 'valtio';

export const wishlist = proxy({ ids: [] });

export function toggleSaved(id) {
  const index = wishlist.ids.indexOf(id);
  if (index === -1) wishlist.ids.push(id);
  else wishlist.ids.splice(index, 1);
}

function SavedCount() {
  const snap = useSnapshot(wishlist);
  return <p>Saved: {snap.ids.length}</p>;
}
```

The rule is strict: **read from the snapshot, write to the proxy**.

- Reading `wishlist.ids` directly in render gives the right value once, but the component never re-renders.
- Snapshots are **frozen**: `snap.ids.push(id)` throws. Event handlers must mutate the proxy.
- `useSnapshot(state, { sync: true })` re-renders synchronously, which avoids caret jumps in controlled inputs.
- `ref(obj)` stores a value without proxying it (DOM nodes, class instances). `proxyMap` / `proxySet` from `valtio/utils` give observable collections.
- Outside React, `subscribe(state, callback)` and `subscribeKey(state, 'key', callback)` react to changes, and `snapshot(state)` gives a plain frozen copy for logging or persistence.

## Pitfalls

- **Destructuring too early**: `const { total } = cart` outside an observer render (or in a parent that is not an observer) captures a value, not a subscription.
- **Storing derived values**: a `total` field updated by hand in some actions drifts as soon as one action forgets it. Use a getter.
- **Replacing nested proxies** in Valtio while a component holds `useSnapshot(state.child)`: the component keeps observing the old child. Prefer `useSnapshot(state)` and read `snap.child.x`.
- **Global singletons in tests**: export factories (`createCartStore()`, `createWishlist()`) so each test gets fresh state.

## When to use it / when not to

**Use MobX** for rich, long-lived domain models with behavior (editors, trading screens, CAD-like tools) where classes, computed graphs and reactions read naturally, and for teams coming from OOP backgrounds. **Use Valtio** when you want Zustand-sized setup with mutable syntax, or need state shared with non-React code (canvas, game loops) that just mutates objects.

**Avoid them** when the team relies on immutable data and explicit action logs (Redux Toolkit gives better traceability), when you need strict serializability for time travel or SSR transfer, or when React Compiler-style "plain values in, JSX out" components are a priority: proxy tracking is implicit, so a missing `observer` or a snapshot/proxy mix-up fails silently. As always, keep server data in a query cache.
