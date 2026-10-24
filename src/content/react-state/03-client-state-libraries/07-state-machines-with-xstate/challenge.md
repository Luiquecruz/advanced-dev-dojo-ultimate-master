Model a card payment as an **XState v5** machine so impossible states (double charges, an error banner after success) cannot happen, then drive the UI from it.

**`paymentMachine`** (export it), built with `setup({ actors: { chargeCard }, guards: { isCardValid } }).createMachine(...)`:

- `context`: `{ card: '', receiptId: null, error: null }`, `initial: 'editing'`.
- Guard `isCardValid`: `context.card` is exactly 16 digits.
- `editing`: `card.change` (event `{ type: 'card.change', value }`) assigns `card` (done); `submit` goes to `submitting` **only if** `isCardValid`.
- `submitting`: on entry assigns `error: null`; **invokes** the actor named `'chargeCard'` with `input: { card }`.
  - `onDone` → `success`, assigning `receiptId` from `event.output.receiptId`.
  - `onError` → `failure`, assigning `error` from `event.error.message`.
- `failure`: `retry` → `submitting`, `edit` → `editing`.
- `success`: a final state (`type: 'final'`).

`chargeCard` (a `fromPromise` actor) is already written. Tests replace it with `paymentMachine.provide({ actors: { chargeCard: ... } })`, so keep it referenced by name.

**`Checkout({ machine = paymentMachine })`** uses `useMachine(machine)`:

- Input labelled `Card number` sending `card.change` (done); it is disabled outside `editing`.
- Submit button text `Pay`, or `Processing...` while in `submitting`; **disabled** whenever `snapshot.can({ type: 'submit' })` is `false`.
- In `failure`: a `role="alert"` element containing the error message, a `Retry` button (sends `retry`) and an `Edit card` button (sends `edit`).
- In `success`: render only `<p role="status">Paid! Receipt {receiptId}</p>`.
