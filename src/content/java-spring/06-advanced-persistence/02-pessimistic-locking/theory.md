# Pessimistic Locking with LockModeType

Optimistic locking lets conflicts happen and reports them. Some operations cannot afford that: selling the last ticket, debiting an account, assigning a unique seat. When many requests compete for the same row all the time, failing and retrying wastes work. Pessimistic locking takes the opposite stance and makes the database hold the row for one transaction, so the others wait their turn.

You need: Optimistic Locking with @Version, Transactions.

## How the lock works

A pessimistic lock is a database feature that JPA exposes through `LockModeType`. When a query asks for a lock, Hibernate adds the clause that makes PostgreSQL lock the selected rows until the transaction ends:

- `PESSIMISTIC_WRITE` generates `SELECT ... FOR UPDATE`. Other transactions can neither update the row nor lock it, and they wait.
- `PESSIMISTIC_READ` generates a shared lock (`FOR SHARE` on PostgreSQL). Others may read and share it, but cannot write.

The lock is released at commit or rollback. That is why the transaction boundary matters even more here: the longer it stays open, the longer everyone else waits.

## Locking from a repository

With Spring Data, put `@Lock` on a query method:

```java
public interface SeatRepository extends JpaRepository<Seat, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Seat s where s.id = :id")
    Optional<Seat> findForUpdate(@Param("id") long id);
}
```

The service calls it inside a transaction, checks the state and changes it:

```java
@Transactional
public void reserve(long seatId) {
    Seat seat = seats.findForUpdate(seatId).orElseThrow(SeatNotFoundException::new);
    if (seat.isTaken()) {
        throw new SeatAlreadyTakenException(seatId);
    }
    seat.take();
}
```

If two requests arrive together, the second one blocks inside `findForUpdate` until the first commits, then reads the updated row, sees `isTaken()` and fails cleanly. Without the lock both could read "free" and both would succeed.

## Timeouts, deadlocks and scope

A lock without a time limit can hang an HTTP request indefinitely. Bound the wait and translate the resulting `PessimisticLockingFailureException`, or its subclasses such as `CannotAcquireLockException`, into a clear answer such as `409` or `503`. How you bound it depends on the database. The JPA hint `jakarta.persistence.lock.timeout` set to `0` becomes `NOWAIT` on PostgreSQL and fails immediately; positive values are not honored there. For a real wait limit on PostgreSQL, run `SET LOCAL lock_timeout = '3s'` at the start of the transaction or set it on the connection. Always test the behavior on the database you run.

A deadlock appears when transaction A holds row 1 and waits for row 2 while transaction B holds row 2 and waits for row 1. The database detects it and aborts one of them. The standard defense is to lock rows in a consistent order, for example always by ascending id, and to lock as few rows as possible for as short a time as possible.

Lock only what the invariant needs. Locking every read destroys throughput, because the database serializes work that could run in parallel.

## Choosing between the two

| Question | Optimistic | Pessimistic |
| --- | --- | --- |
| Conflicts | Rare | Frequent |
| Cost | One column, no waiting | Waiting and deadlock risk |
| On conflict | Exception, caller retries | Caller waits, then proceeds |
| Typical use | Profiles, content | Stock, seats, balances |

You can also combine them: a version column protects ordinary edits everywhere, while the hot path takes a pessimistic lock.

## Common mistakes

- Locking in every query by default. Take the lock only in the method that enforces the invariant.
- Forgetting a lock timeout, so a stuck transaction freezes requests until the client gives up.
- Calling the locking query outside a transaction. The lock is released as soon as the statement ends, so it protects nothing.
- Locking several rows in different orders in different code paths, which invites deadlocks.

## In practice

Start with optimistic locking and measure. Move a specific operation to a pessimistic lock when the conflict rate shows that retries cost more than waiting, and keep that transaction as short as possible: no remote calls and no slow work while the lock is held.

## Check yourself

1. Which SQL clause does `PESSIMISTIC_WRITE` produce on PostgreSQL, and what does a second transaction do when it meets that row?
2. Why does a pessimistic lock need an active transaction?
3. How do you avoid deadlocks when a use case locks two rows?
