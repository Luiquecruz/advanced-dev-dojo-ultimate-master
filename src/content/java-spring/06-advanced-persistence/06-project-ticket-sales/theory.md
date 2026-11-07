# Project: High-Concurrency Ticket Sales

This project builds a small ticket box office for events with heavy simultaneous demand. The rule that matters is simple and unforgiving: the same seat is never sold twice. You enforce it with a pessimistic lock on PostgreSQL, protect ordinary edits with a version column, and use Redis to cache the event catalog. You build it locally with JDK 25, Maven and Docker as a Spring Boot 4 application.

You need: Optimistic Locking with @Version, Pessimistic Locking with LockModeType, Redis and Spring Data Redis, Caching with Spring and Redis, TTL, Eviction and Cache Stampede.

## Goal

Create a Maven project `ticket-box` with the base package `com.example.tickets`. An `Event` has a title, a start time and many `Seat`s. A seat is either free or sold. Buying a seat must succeed exactly once even when dozens of requests arrive together, the event details are cached in Redis, and everything is verified by tests that start real PostgreSQL and Redis containers. Check JDK 25, Maven 3.9 or later and Docker with `java -version`, `mvn -v` and `docker info`.

## Features

- Dependencies: `spring-boot-starter-webmvc`, `spring-boot-starter-data-jpa`, `spring-boot-starter-data-redis`, `spring-boot-starter-cache`, `spring-boot-starter-flyway`, `flyway-database-postgresql` and `postgresql`; for tests `spring-boot-starter-webmvc-test`, `spring-boot-testcontainers`, `testcontainers-junit-jupiter` and `testcontainers-postgresql`.
- A `docker-compose.yml` with PostgreSQL and Redis, both published on `127.0.0.1`.
- Migrations `V1` (`event`, `seat` with a unique `(event_id, label)`) and `V2` (a `version` column on `event`).
- Entities `Event` (with `@Version`) and `Seat`, and a `SeatRepository.findForUpdate` method with `PESSIMISTIC_WRITE`.
- `TicketService.buy(eventId, seatLabel)` in one transaction that locks the seat, rejects a sold seat with a domain exception and marks it sold.
- `EventCatalogService.find(id)` cached with `@Cacheable` and evicted with `@CacheEvict` when the event changes, using a JSON typed serializer, a 10-minute TTL and a key prefix.
- `GET /api/v1/events/{id}` returning `X-Cache-Hit: true` or `false`, and `POST /api/v1/tickets` answering `201` or `409`.

## Acceptance criteria

All tests use a Spring-managed PostgreSQL container and a Redis container shared with the application context.

1. The context starts with `ddl-auto=validate` after Flyway applied `V1` and `V2`.
2. With an event that has one free seat `A1`, 50 threads started together through a `CountDownLatch` each call `buy`. Exactly 1 call succeeds and 49 throw the domain exception, and the seat row says sold once.
3. `POST /api/v1/tickets` for a free seat returns `201`, and the same request again returns `409` with a Problem Details body.
4. Two concurrent updates of the same `Event` loaded at the same version make one of them fail with `ObjectOptimisticLockingFailureException`.
5. The first `GET /api/v1/events/{id}` returns `X-Cache-Hit: false` and the second returns `true`, and a spy on the repository shows one database read for the two calls.
6. After the event is renamed through the service, the next `GET` returns the new title and `X-Cache-Hit: false`.
7. The Redis key for the event starts with the configured prefix and has a TTL between 1 and 600 seconds (`redis.getExpire(key)`).
8. `mvn verify` starts both containers, runs every test above and passes.

## Suggested steps

1. Create the project, the dependencies and the compose file. Start both containers and confirm them with `docker compose ps`.
2. Write `V1` and `V2`. Keep `ddl-auto=validate` and `open-in-view=false`.
3. Model `Event` and `Seat`. Keep the seat's `sold` flag changeable only through a `sell()` method that rejects a second sale.
4. Add `findForUpdate`, then write `buy`. Keep the transaction short: lock, check, change, return. Do no remote calls inside it.
5. Write the concurrency test first with the lock removed and watch it fail with several sales, then restore the lock and watch it pass. The failing run proves that the test can detect the problem.
6. Add the cache: a typed `JacksonJsonRedisSerializer<EventView>`, a TTL and a prefix. Return the hit flag by checking whether the service method ran, for example with a counter in the view builder.
7. Add the controller, the Problem Details advice for the domain and locking exceptions, and the two HTTP tests.
8. Run `mvn verify` from a clean checkout and fix anything that depends on your machine.

## Stretch goals

- Add TTL jitter and compare expiry times for ten cached events.
- Add a `reserve` step with a 5-minute hold stored in Redis with a TTL, released automatically if the buyer never pays.
- Replace the pessimistic lock with an atomic `UPDATE seat SET sold = true WHERE id = ? AND sold = false` and compare the throughput and the code.
- Count requests per client in Redis with `INCR` and `EXPIRE` and answer `429` after a limit.

## Common mistakes

- Reading the seat without a lock and checking `isSold()` afterward. Two requests can both read "free" before either writes.
- Starting the 50 threads one by one, so they never overlap. Release them together with a latch.
- Caching the JPA entity instead of a view record, so serialization fails or leaks internals.
- Making assertions on elapsed milliseconds. Assert on the hit flag and the repository call count, which do not depend on the machine.

## In practice

Overselling is one of the clearest cases where a database guarantee beats application code. The lock, the unique constraint and a test that attacks the rule from many threads are what let you change the code later without fear.

## Check yourself

1. Which part of your design makes the second concurrent buyer fail, and where is that decision enforced?
2. Why is a test that never overlaps its threads worthless for this rule?
3. Which data in this project is safe to lose from Redis, and why?
