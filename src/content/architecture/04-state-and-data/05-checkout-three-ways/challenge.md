Build the same checkout flow **three ways behind one contract**, so a single test suite runs against every version. The `useReducer` version is done and is your reference; finish the TanStack Query + Context version and the XState version.

Project layout (entry `App.jsx`):

```
App.jsx                    select "Implementation" + CheckoutView over the chosen version (done)
api/placeOrder.js          placeOrder(order): POST /api/orders, throws "Order failed: {status}" (done)
checkout/contract.js       the shared contract (JSDoc) and INITIAL_CHECKOUT_DATA (done)
checkout/CheckoutView.jsx  renders any implementation (done)
local/useCheckout.js       useReducer + a ref guard (done)
query/useCheckout.jsx      CheckoutProvider + useCheckout with useMutation (TODO)
machine/useCheckout.js     checkoutMachine + useCheckout with XState (TODO)
```

**The contract.** `useCheckout()` returns `{ step, data, error, order, next, back, submit, retry }`:

- `step`: `'cart' | 'shipping' | 'payment' | 'submitting' | 'error' | 'done'`, starting at `'cart'`.
- `data`: `{ items, address, card }`, starting at `INITIAL_CHECKOUT_DATA` (`{ items: [], address: '', card: '' }`). `next(fields)` and `submit(fields)` merge `fields` into it; `back()` never clears it.
- `error`: the message of the failed request (`'Order failed: 503'`) while in `'error'`, otherwise `null`. `order`: the parsed response (`{ id }`) once `'done'`, otherwise `null`.

| From | Call | To |
| --- | --- | --- |
| `cart` | `next(fields)` | `shipping` |
| `shipping` | `next(fields)` / `back()` | `payment` / `cart` |
| `payment` | `submit(fields)` / `back()` | `submitting` (POSTs `data` with `placeOrder`) / `shipping` |
| `submitting` | request resolves / rejects | `done` / `error` |
| `error` | `retry()` / `back()` | `submitting` (POSTs the same `data` again) / `payment` (error cleared) |

Every other call is **ignored** (no state change, no request): `submit()` from `cart`, `next()` on `payment`, anything while `submitting` or `done`. Calling `submit()` twice in the same tick sends **one** request.

**`query/useCheckout.jsx`**: export `CheckoutProvider` (holds `formStep` and `data` in state and the order mutation from `useMutation({ mutationFn: placeOrder })`) and `useCheckout()` (reads the provider's value from Context). The visible `step` is derived: `'submitting'` while the mutation is pending, `'error'` when it failed, `'done'` when it succeeded, otherwise `formStep`. `back()` from `'error'` resets the mutation. The mutation status only reaches React after a render, so guard double submits with the `requestInFlight` ref, like the local version does.

**`machine/useCheckout.js`**: finish `checkoutMachine` with `setup` + `createMachine`: register `placeOrder` as a `fromPromise` actor, add the `shipping`, `payment`, `submitting` (invokes it with `context.data`), `error` and final `done` states. The hook (`useMachine`) is done. No guard is needed: a state without a transition for an event ignores it.

Tests render each hook with `renderHook` (inside a `QueryClientProvider`, plus `CheckoutProvider` when the module exports one) and control `/api/orders` with `mockApi`. Only `api/placeOrder.js` may call `fetch`. In the preview the fake API accepts `POST /api/orders`, so **Pay** reaches the confirmation; the tests use `mockApi` to force failures for **Retry** and **Back to payment**.
