Give a tiny in-memory database real transactions, then build a money transfer on top of them. `Account`, `Transaction`, `InsufficientFundsError`, the constructor and `getAccount` are given.

## `db.transaction(work)`

`work` receives a `tx` object (`Transaction`) and returns a promise. Implement a **unit of work**:

1. `tx.saveAccount(account)` does not touch the committed data: it records the write in a pending set (store a copy).
2. `tx.getAccount(id)` returns a copy of the pending version when the transaction already wrote that account, otherwise a copy of the committed one (`undefined` when it does not exist).
3. When `work` resolves, apply every pending write to the committed data (**commit**) and resolve with the value `work` returned.
4. When `work` rejects or throws, discard the pending writes (**rollback**) and reject with the **same** error.
5. `db.getAccount(id)` (outside any transaction) only sees committed data.
6. Transactions run **one at a time**, in the order they were started: a transaction starts only after the previous one finished, whether it committed or rolled back. This makes concurrent read-modify-write safe.

## `transfer(db, fromId, toId, amount)`

Runs inside `db.transaction` and resolves with nothing. Inside the transaction, in this order:

| Condition | Rejects with |
| --- | --- |
| `amount <= 0` | `new RangeError('Amount must be positive')` |
| an account does not exist | `new Error('Account not found: <id>')` (check `fromId` first) |
| the source balance is lower than `amount` | `new InsufficientFundsError()` |

Otherwise save both accounts with the new balances. A failed transfer changes nothing, and concurrent transfers can never overdraw the source.
