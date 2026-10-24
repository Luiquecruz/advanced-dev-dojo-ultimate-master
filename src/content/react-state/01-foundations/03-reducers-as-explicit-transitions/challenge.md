Model a checkout wizard as a **finite status** with explicit transitions. The UI in `Checkout` is already written: it renders one screen per `state.status`. Implement the reducer and the async handler.

**State** (`initialCheckout`, already exported): `{ status: 'shipping', address: '', card: '', orderId: null, error: null }`.

**`checkoutReducer(state, action)`** (named export, pure, never mutates). Transition table:

| Status | Event | Next state |
| --- | --- | --- |
| `shipping` | `{ type: 'shippingSubmitted', address }` | `payment`, stores `address` (done) |
| `payment` | `{ type: 'paymentSubmitted', card }` | `review`, stores `card` |
| `payment` | `{ type: 'back' }` | `shipping` |
| `review` | `{ type: 'orderPlaced' }` | `submitting`, `error: null` |
| `review` | `{ type: 'back' }` | `payment` |
| `submitting` | `{ type: 'orderSucceeded', orderId }` | `done`, stores `orderId` |
| `submitting` | `{ type: 'orderFailed', error }` | `failed`, stores `error` |
| `failed` | `{ type: 'retried' }` | `review`, `error: null` |
| `done` | `{ type: 'restarted' }` | `initialCheckout` |

- A **known** event that is not allowed in the current status (for example `orderPlaced` while `submitting`) returns **the same state object**.
- A type that is not in `knownTypes` **throws** an `Error`.

**`handlePlaceOrder`** inside `Checkout`: dispatch `orderPlaced`, then `await placeOrder({ address, card })` (a prop that resolves to `{ orderId }`). Dispatch `orderSucceeded` with the id, or `orderFailed` with `error.message` when it rejects.
