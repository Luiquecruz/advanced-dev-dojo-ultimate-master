`exportReport` leaks resources: when the query fails, the lock is never released and the file is never closed. Fix it with explicit resource management.

1. Make `FileHandle` extend `Disposable` and give the object returned by `openFile(path, log)` a `[Symbol.dispose]()` method that pushes `"close <path>"` to `log`.
2. Rewrite `exportReport(log, sql)` with `using` for the lock and the file and `await using` for the connection, acquired in this order:
   1. `acquireLock("report", log)`
   2. `openFile("report.csv", log)`
   3. `connect("db://main", log)`
3. It writes every row returned by `connection.query(sql)` to the file and resolves with the number of rows.
4. Resources must be released in reverse order, **also when `query` rejects** (the rejection must still reach the caller).

A successful run logs exactly:

```ts
['lock report', 'open report.csv', 'connect db://main', 'query SELECT name FROM users',
 'write Ada', 'write Grace', 'disconnect db://main', 'close report.csv', 'unlock report']
```

Do not call `[Symbol.dispose]` or `[Symbol.asyncDispose]` by hand inside `exportReport`.
