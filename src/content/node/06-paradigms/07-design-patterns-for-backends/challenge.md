Integrate a callback-based payment SDK behind your own interface with an **adapter**, add behavior with **decorators**, and pick the implementation with a **factory**.

The starter exports the contract and two implementations you must not change:

```ts
interface ChargeResult { id: string; status: 'succeeded' | 'declined' }
interface PaymentGateway { charge(amountCents: number, currency: string): Promise<ChargeResult> }
```

- `LegacyPayClient` (the "SDK"): `makePayment({ value, curr }, callback)` where `value` is a decimal string such as `'12.50'`, `curr` an uppercase code, and `callback(error, { transactionRef, approved })`.
- `FakeGateway`: always succeeds with ids `fake_1`, `fake_2`, ...

Implement and export:

1. `class LegacyPayAdapter implements PaymentGateway` (constructor receives the client). `charge(1250, 'usd')` calls `makePayment({ value: '12.50', curr: 'USD' }, ...)` and resolves `{ id: transactionRef, status: approved ? 'succeeded' : 'declined' }`; when the callback receives an error, it rejects with that error.
2. `withLogging(gateway, log = console.log)`: returns a `PaymentGateway` that delegates and calls `log` once per charge with `charge <amount> <currency> -> <status> (<id>)` on success or `charge <amount> <currency> -> error: <message>` on failure. It returns the same result object and rethrows the same error.
3. `withLimit(gateway, maxAmountCents)`: rejects with `Error('Amount exceeds limit of <max>')` when `amountCents > maxAmountCents`, without calling the wrapped gateway; otherwise delegates.
4. `createPaymentGateway(config, deps = {})` with `config: { provider, logging?, maxAmountCents? }` and `deps: { legacyClient?, log? }`:
   - `provider: 'legacy'` → `LegacyPayAdapter` over `deps.legacyClient` or a new `LegacyPayClient`; `'fake'` → `FakeGateway`; anything else throws `Error('Unknown payment provider: <provider>')` immediately.
   - When `maxAmountCents` is set, wrap with `withLimit`. When `logging` is true, wrap the result with `withLogging(…, deps.log)` as the **outermost** layer.
