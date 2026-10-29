Inside `transaction`, create `const pending = new Map<string, Account>()` and a `tx` whose `saveAccount` writes there. After `const result = await work(tx)`, copy every pending entry into `this.accounts`. If `work` throws, the `await` throws too and the commit line is never reached: rollback is free.
---
Serialize with a promise chain: keep `private queue: Promise<unknown> = Promise.resolve()` and start each transaction with `this.queue.then(() => this.execute(work))`.
---
Store the next link without its failure, or one rolled back transaction would block every later one: `const run = this.queue.then(() => this.execute(work)); this.queue = run.catch(() => undefined); return run;`. Make `transfer` return `db.transaction(async (tx) => { ... })` and read both accounts with `tx.getAccount`, never `db.getAccount`.
