1. Treat the `Map` as a table and the repository as its only gateway: nothing outside the class touches the rows.
2. Decide the copy rule once: rows go in as new objects and come out as new objects. This mirrors a real database, where every query returns fresh data, and prevents callers from mutating storage by accident.
3. Put the uniqueness rule next to the data, as a database `UNIQUE` constraint would be, with one helper that compares emails case-insensitively.
4. In `update`, look up the current row first (return `null` if missing), then check the email against other rows, then merge with the id last so a patch can never change it.
5. Implement `list` as sort, slice, copy: the same `ORDER BY id LIMIT OFFSET` a SQL repository would run.
6. Keep business rules (normalizing the email, default role, "not found" as an error) in the service, which receives the interface. That is what lets the tests swap the in-memory class for a fake, and production swap it for Postgres.
