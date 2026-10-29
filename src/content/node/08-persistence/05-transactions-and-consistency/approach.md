1. Separate committed state from the transaction's private changes. A pending `Map` is the unit of work: it collects what the transaction intends to change.
2. Reads inside the transaction look in the pending map first, so the work sees its own writes; reads outside never see them.
3. Commit is a single synchronous loop after `await work(tx)`. Because it does not await anything, no other code can observe a half-applied commit.
4. Rollback needs no code: if `work` throws, you never reach the commit, and the pending map is garbage collected. Let the error propagate unchanged.
5. Buffering alone still loses updates: two transactions can both read balance 100 before either commits. Serialize them with a promise queue, and make the queue survive failures by chaining on a version of the promise that never rejects.
6. Write `transfer` as validation plus two writes inside the transaction. Every check reads through `tx`, so the balance you check is the balance you update.
