# Transactions and Consistency

A money transfer is two writes: debit one account, credit another. If the process crashes between them, money disappears. If two transfers run at the same time, both may read the same balance and overdraw it. Transactions solve both problems, but only when you use them correctly.

## ACID in practice

| Letter | Guarantee | What it saves you from |
| --- | --- | --- |
| Atomicity | all writes commit or none do | half-finished operations after an error or crash |
| Consistency | constraints hold after every commit | negative stock, orphan rows |
| Isolation | concurrent transactions do not see each other's partial work | reading a debit without its credit |
| Durability | committed data survives a crash | "saved" data that vanishes on restart |

## Transactions with node-postgres

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

The classic bug: calling `pool.query('BEGIN')` and then `pool.query(...)` again. A pool hands each call a **possibly different connection**, so the statements are not in the same transaction. A transaction belongs to one connection. ORMs wrap this for you (`prisma.$transaction(async (tx) => ...)`, `db.transaction(async (tx) => ...)` in Drizzle and Kysely), and the rule becomes: inside the callback, use `tx`, never the global client.

## The unit of work

A **unit of work** collects the changes of one business operation and commits them together. ORMs implement it with a transaction object; in this lesson you build one in memory: writes go to a pending map, reads see pending writes first, and the commit applies them only when the work succeeds. If the work throws, nothing was applied, so rollback is free.

## Concurrency: the lost update

Atomicity does not protect you from this sequence:

```text
T1: read balance 100        T2: read balance 100
T1: write 100 - 60 = 40     T2: write 100 - 60 = 40
```

Both transfers succeed, 120 left the account and the balance says 40. Postgres' default isolation level, **Read Committed**, allows this when the code reads, computes in JavaScript and writes back. Fixes, from simplest to heaviest:

1. **Atomic statement**: let the database compute and check.
   ```ts
   const { rowCount } = await tx.query(
     'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1',
     [amount, fromId],
   );
   if (rowCount === 0) throw new InsufficientFundsError();
   ```
2. **Pessimistic lock**: `SELECT ... FOR UPDATE` locks the row; a concurrent transfer waits until the first commits.
3. **Optimistic concurrency**: a `version` column; `UPDATE ... WHERE id = $1 AND version = $2`; zero rows updated means retry. Great for user edits where conflicts are rare.
4. **Serializable isolation**: the database aborts one of two conflicting transactions (`40001` serialization failure) and you retry it.

The in-memory database in the challenge takes the bluntest route, one transaction at a time, which is serializable by construction. Real databases get the same safety with row-level locks and MVCC so unrelated transactions still run in parallel.

## Pitfalls

- **Side effects inside transactions**: sending an email or calling a payment API inside the callback cannot be rolled back. Do it after commit, or write an event to an **outbox** table in the same transaction and let a worker deliver it.
- **Long transactions** hold locks and connections; never wait for user input or slow HTTP calls inside one.
- **Forgetting `ROLLBACK`/`release()`**: leaks a connection that stays in a failed transaction state. Use `try/finally` or the library helper.
- **Check in the app, write later**: `if (balance >= amount)` in JavaScript followed by an update is the lost update again unless the row is locked or the condition is in the `UPDATE`.

## When to choose it

Use a transaction whenever one operation writes more than one row that must stay consistent (orders and order lines, transfers, inventory reservations). Prefer a single atomic statement when it can express the rule. Use `FOR UPDATE` for short read-then-write flows with real contention, optimistic versions for editing flows with rare conflicts, and serializable isolation with retries when invariants span many rows. Across services there is no shared transaction: use the outbox pattern and idempotent consumers (sagas) instead of distributed transactions.

## Working with AI

Ask: "wrap these writes in a transaction with `pg`, using one client from the pool, and make the balance check atomic". Review checklist:

- Every statement of the transaction uses the same client or `tx` object, not the pool or the global ORM client.
- Errors trigger `ROLLBACK` and the error is rethrown, not swallowed; the connection is always released.
- Read-modify-write flows have a concurrency strategy (atomic `UPDATE`, `FOR UPDATE`, version column or serializable with retry).
- No HTTP calls, emails or queue publishes inside the transaction; side effects go after commit or through an outbox.
- Transactions are short and their scope matches one business operation.
