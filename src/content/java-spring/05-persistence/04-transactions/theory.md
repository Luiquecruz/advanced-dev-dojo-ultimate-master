# Transactions

A transaction groups database operations so that they all succeed or none of them does. Without one, a failure halfway through a use case leaves half-written data. Spring manages transactions declaratively with `@Transactional`, and a transaction-scoped persistence context normally follows that boundary; Open Session in View can keep it open longer, as lesson 5 explains. This lesson covers where to put the boundary, how rollback works, propagation, read-only transactions, isolation at an introductory level and the pitfalls that make an annotation silently do nothing.

You need: JPA and Hibernate Basics, Spring Data Repositories, Relationships, Exceptions in Depth.

## The boundary belongs to the service

Put `@Transactional` on service methods that implement one use case. Inherited CRUD repository methods have transaction settings (reads are read-only); declared query methods need explicit configuration or a surrounding transaction, but a service method calling several repositories needs one transaction around all of them:

```java
@Service
public class CourseService {

    private final CourseRepository courses;
    private final TagRepository tags;

    public CourseService(CourseRepository courses, TagRepository tags) {
        this.courses = courses;
        this.tags = tags;
    }

    @Transactional
    public Long create(String title, Level level, List<String> tagNames) {
        Course course = new Course(title, level);
        for (String name : tagNames) {
            course.addTag(tags.findByName(name).orElseGet(() -> tags.save(new Tag(name))));
        }
        return courses.save(course).getId();
    }
}
```

If saving the course fails, the tags created a moment ago are rolled back too. Spring Boot configures a `JpaTransactionManager` and enables annotation-driven transactions, so no further setup is needed. Use `org.springframework.transaction.annotation.Transactional`. Keep controllers free of it, so a request never holds a transaction while it parses input or writes a response.

## How it works, and the self-invocation trap

Spring wraps the bean in a proxy. A call from another bean goes through the proxy, which opens the transaction, calls your method and commits or rolls back. A call from one method to another method of the same object does not pass through the proxy:

```java
@Service
public class CourseImportService {

    private final CourseRepository courses;

    public CourseImportService(CourseRepository courses) {
        this.courses = courses;
    }

    public void importAll(List<String> titles) {
        titles.forEach(this::importOne);
    }

    @Transactional
    public void importOne(String title) {
        courses.save(new Course(title, Level.BEGINNER));
    }
}
```

Calling `importAll` from a controller starts no transaction, because `importOne` is reached through `this`. Each `save` then commits on its own, and a failure on the third title keeps the first two. The reference documentation states that, in proxy mode, only external calls are intercepted. Fix it by annotating `importAll`, or by moving `importOne` into another bean. Class-based proxies cannot intercept final methods, so keep service classes and their transactional methods non-final.

## Rollback rules

By default, a `RuntimeException` or an `Error` rolls the transaction back, and a checked exception does not: the transaction commits. Declare checked failures explicitly:

```java
@Transactional(rollbackFor = IOException.class)
public void importFile(Path file) throws IOException {
    // parse the file and save courses
}
```

Since Spring Framework 6.2, `@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)` changes the default for the whole application. Catching an exception inside the method also prevents a rollback, because the proxy never sees it. If an inner `REQUIRED` call through a proxy throws an exception matching its rollback rules, the shared transaction is marked rollback-only. Catching that exception in the outer method does not clear the marker, so commit can fail with `UnexpectedRollbackException`. A checked exception does not trigger this by default.

## Propagation

The default, `REQUIRED`, joins the transaction already running or starts one. `REQUIRES_NEW` suspends the current transaction and runs the method in an independent one that commits or fails by itself:

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void recordAttempt(String message) {
    attempts.save(new AuditEntry(message));
}
```

This keeps an audit row even when the caller rolls back. It takes a second database connection, so a small pool can deadlock under load. The other values are `SUPPORTS`, `MANDATORY`, `NOT_SUPPORTED`, `NEVER` and `NESTED`, which uses JDBC savepoints. `JpaTransactionManager` disables nested transactions by default; even when enabled, a JDBC savepoint does not restore the JPA persistence context. Do not rely on nested rollback for JPA entity changes.

## Read-only transactions

`@Transactional(readOnly = true)` on query methods tells the driver the work is read-only, and with Hibernate Spring sets the flush mode to manual, so dirty checking is skipped. It is not a guard against writes: some databases reject them, but do not rely on it.

## Isolation and concurrent updates

The isolation level controls what a transaction sees of concurrent changes. `Isolation.DEFAULT` uses the database setting, which in PostgreSQL is `READ COMMITTED`, and PostgreSQL treats `READ_UNCOMMITTED` as `READ_COMMITTED`. Higher levels prevent more anomalies and cause more failed transactions to retry. For the common lost-update problem, two users editing the same row, use optimistic locking:

```java
@Version
private long version;
```

Hibernate adds the version to `UPDATE ... WHERE id = ? AND version = ?` and raises an optimistic locking failure when another transaction changed the row first.

## Common mistakes

- Annotating a method called from another method of the same class and expecting a transaction. The proxy is bypassed.
- Throwing a checked exception and expecting a rollback. It commits unless `rollbackFor` says otherwise.
- Catching an exception inside the transactional method and returning normally, so the transaction commits.
- Calling a remote service inside a transaction, which keeps a database connection busy while it waits.

## In practice

Keep transactions short and put them on the service that owns the use case. Remember that `@DataJpaTest` rolls back each test, so call `flush()` to force the SQL to run, or the constraint you wanted to test never fires.

## Check yourself

1. Why does `importAll` not run inside a transaction in the self-invocation example?
2. A method throws `IOException`. Is the transaction rolled back, and how do you change that?
3. When would you use `REQUIRES_NEW`, and what does it cost?
