# Optimistic Locking with @Version

Two users open the same record, both edit it, and both press save. Without protection the second save silently overwrites the first, and nobody notices. This is the lost update problem, and a transaction alone does not prevent it, because each transaction was valid on its own. Optimistic locking detects the conflict instead of blocking anyone: it assumes conflicts are rare and checks, at write time, that nobody else changed the row.

You need: Transactions, Relationships, Database Migrations and Soft Delete.

## The lost update

Imagine a course with 10 seats left. Request A reads `seats = 10`, request B reads `seats = 10`, A writes `9`, B writes `9`. Two seats were sold and the counter dropped by one. Each request ran in its own correct transaction, but the read-then-write cycle spanned both. The fix is to make the write conditional on the state that was read.

## Adding a version column

JPA implements that condition with a version attribute. Add a `@Version` field to the entity and a matching column to the schema:

```java
@Entity
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int seatsLeft;

    @Version
    private long version;
}
```

```sql
ALTER TABLE course ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
```

Because the schema belongs to Flyway, the column arrives in a migration, and the existing rows get a starting value through the default. Supported types are `int`, `long`, `short` and their wrappers, or a timestamp type such as `Instant`. A number is the safest choice, because timestamps can collide when two updates land in the same clock tick.

## What Hibernate does

On every update Hibernate adds the version to the `WHERE` clause and increments it:

```sql
update course set seats_left = ?, version = ? where id = ? and version = ?
```

If another transaction already committed a change, the stored version no longer matches, zero rows are updated and Hibernate throws an exception. With Spring Data this surfaces as `ObjectOptimisticLockingFailureException`, a subclass of Spring's `OptimisticLockingFailureException`; the JPA exception underneath is `OptimisticLockException`. The transaction rolls back, so no partial change survives. Hibernate owns the version field: never set or increment it by hand, and expose no setter for it.

## Handling the conflict

A conflict is a normal outcome, not a bug, so the service layer decides what it means. For an interactive API the usual answer is to report it and let the client reload:

```java
@RestControllerAdvice
class ConflictAdvice {

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail onConflict(OptimisticLockingFailureException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "The resource was changed by someone else. Reload it and try again.");
    }
}
```

For short operations that the server can safely repeat, retry from outside the transaction: catch the exception around the call that opens it, reload and try again a few times. A retry inside the same transaction is useless, because the persistence context still holds the stale state. A web client can also send the version it read (as an `ETag` or a field) so the check covers the whole time the user spent editing, not just the milliseconds of the transaction.

## When to choose it

Optimistic locking costs one extra column and holds no lock between the read and the write, so reads never wait and throughput stays high; the conditional `UPDATE` still takes a short row lock while it runs. It fits data that is read often and rarely written at the same moment: profiles, settings, course content. When many requests fight over the same row all the time, most attempts fail and retries pile up; that is the case for pessimistic locking, covered next.

## Common mistakes

- Changing the `@Version` value in code. Hibernate manages it; a manual change breaks the comparison or hides a real conflict.
- Not handling `OptimisticLockingFailureException`, so the user sees a 500 instead of a clear conflict answer.
- Retrying inside the same transaction. Start a new transaction for each attempt so it reloads fresh data.
- Using bulk JPQL updates and expecting the version to move. Bulk statements bypass the entity lifecycle unless you increment the version in the query.

## In practice

Most business entities that more than one person edits should carry a version column from the first migration, because adding it later means every client and test must learn about conflicts at once. Return `409 Conflict` as a Problem Details response and make the message actionable.

## Check yourself

1. Why is a transaction alone not enough to prevent a lost update?
2. Which clause does Hibernate add to the `UPDATE`, and what happens when zero rows match?
3. Why must a retry start a new transaction instead of looping inside the old one?
