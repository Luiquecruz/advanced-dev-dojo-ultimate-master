Model money transfers with **errors as values**. Balances are integer cents. The starter exports `Result<T, E>`, `ok`, `err`, `Account`, `TransferError`, `createAccounts()` (a `Map` with `alice` 10000 and `bob` 2500), `accounts` and a Hono `app`.

```ts
type TransferError =
  | { type: 'invalid_amount' }
  | { type: 'same_account' }
  | { type: 'account_not_found'; accountId: string }
  | { type: 'insufficient_funds'; balance: number; amount: number };
```

Implement and export:

1. `map(result, fn)`: applies `fn` to an ok value; returns an error result unchanged (the same object).
2. `andThen(result, fn)`: returns `fn(value)` for an ok result; returns an error result unchanged without calling `fn`.
3. `transfer(accounts, { from, to, amount })` → `Result<{ from: Account; to: Account }, TransferError>`. Check in this order and return the **first** error:
   1. `amount` is not a positive integer → `{ type: 'invalid_amount' }`
   2. `from === to` → `{ type: 'same_account' }`
   3. `from` missing → `{ type: 'account_not_found', accountId: from }`, then the same for `to`
   4. `from` balance lower than `amount` → `{ type: 'insufficient_funds', balance, amount }`

   On success return **new** account objects with the updated balances. `transfer` never throws and never changes the map or its accounts.
4. `toHttpError(error)` → `{ status, body: { error: error.type, message } }`:

   | `type` | `status` | `message` |
   | --- | --- | --- |
   | `invalid_amount` | 400 | `Amount must be a positive integer of cents` |
   | `same_account` | 400 | `Cannot transfer to the same account` |
   | `account_not_found` | 404 | `Account <accountId> not found` |
   | `insufficient_funds` | 422 | `Balance <balance> is lower than <amount>` |

5. `POST /transfers` with JSON `{ from, to, amount }`: on success store both returned accounts in `accounts` and answer `200` with `{ from, to }`; on failure answer `toHttpError`'s status and body.
