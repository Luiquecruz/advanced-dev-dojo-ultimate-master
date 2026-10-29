Build a small payment checkout on top of `EventEmitter` and the helpers that keep it safe to use.

The starter declares the event map and the `Payment` type. Implement the exports:

1. `class Checkout extends EventEmitter` with `pay(orderId: string, amount: number): void`:
   - `amount > 0`: emit `'paid'` with one argument `{ orderId, amount }`.
   - otherwise: emit `'error'` with `new Error('Invalid amount for <orderId>')` (for example `Invalid amount for A-1`). With no `'error'` listener this throws, which is the normal `EventEmitter` behavior.
2. `onPaid(checkout, listener): () => void` registers `listener` for `'paid'` and returns a function that removes exactly that listener.
3. `nextPayment(checkout): Promise<Payment>` resolves with the payload of the next `'paid'` event and rejects with the error if `'error'` comes first. Use `once` from `node:events`.
4. `attachErrorLogger(checkout): void` adds an `'error'` listener that calls `console.error('Payment failed: <message>')`, so a failed payment no longer throws.
