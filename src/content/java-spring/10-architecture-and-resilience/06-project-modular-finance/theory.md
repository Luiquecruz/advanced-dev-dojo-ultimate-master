# Project: Modular Finance

This project builds a small financial application as a modular monolith. Accounts hold balances, transfers move money between them, and an audit module records every completed transfer. The modules talk only through public APIs and events, a modularity test keeps the boundaries honest, and the call to an external risk service is protected with a timeout, a circuit breaker and a deliberate fallback. You build it locally with JDK 25, Maven and Docker as a Spring Boot 4 application.

You need: Hexagonal Architecture, Spring Modulith, Events Between Modules, Resilience with Circuit Breakers, Calling Services with RestClient.

## Goal

Create a Maven project `modular-finance` with the base package `com.example.finance` and three modules, `account`, `transfer` and `audit`. A transfer debits one account and credits another in a single transaction, asks a remote risk service whether the transfer is acceptable, and publishes a `TransferCompleted` event that the audit module stores. Check JDK 25, Maven 3.9 or later and Docker with `java -version`, `mvn -v` and `docker info`.

## Features

- Dependencies: `spring-boot-starter-webmvc`, `spring-boot-starter-data-jpa`, `spring-boot-starter-flyway`, `flyway-database-postgresql`, `postgresql`, the Spring Modulith core and JPA starters, a Resilience4j circuit breaker starter for your Spring Cloud release train, and for tests the Modulith test starter, `spring-boot-starter-webmvc-test`, `spring-boot-testcontainers`, `testcontainers-postgresql` and WireMock.
- `account`: an `Account` domain type with `withdraw` and `deposit` rules, an `AccountOperations` public API and an internal JPA adapter.
- `transfer`: a `TransferService`, a `RiskScoreClient` built on `RestClient` with `connect-timeout` and `read-timeout`, a circuit breaker named `risk-service` and a fallback that returns an `unknown` score.
- A policy: `unknown` risk allows transfers up to a contingency limit (for example 500.00) and sends larger ones to `PENDING_REVIEW`.
- `audit`: an `@ApplicationModuleListener` that stores an `audit_entry` row for every `TransferCompleted` event, with the transfer id in a unique column so a resubmitted event cannot create a second row.
- Flyway migrations for `account`, `transfer`, `audit_entry` and the event publication table.
- `POST /api/transfers` answering `201`, `409` for insufficient funds and `202` for a transfer pending review.

## Acceptance criteria

1. `ApplicationModules.of(FinanceApplication.class).verify()` passes, and a test that makes `transfer` import an `account` internal type fails the verification.
2. Transferring 100.00 from an account with 500.00 to another with 0.00 leaves 400.00 and 100.00, answers `201` and, soon after, stores one audit entry.
3. Transferring more than the balance returns `409` and leaves both balances unchanged.
4. If the audit listener throws an exception, the transfer is still committed, and the incomplete event publication remains in the registry.
5. With WireMock returning a score, the transfer follows the score. With WireMock returning `500` several times, the circuit opens and later calls use the fallback without reaching WireMock.
6. With the risk service down, a transfer of 100.00 completes under the contingency limit and a transfer of 900.00 answers `202` with status `PENDING_REVIEW`.
7. A WireMock response slower than the read timeout counts as a failure and triggers the fallback.
8. Ten simultaneous transfers of 100.00 from an account holding 500.00 succeed exactly five times, the other five answer `409`, and the balance is never negative.
9. Delivering the same `TransferCompleted` event to the audit listener twice leaves one `audit_entry` row.
10. After the audit listener failed, restarting with `spring.modulith.events.republish-outstanding-events-on-restart=true`, or calling the `IncompleteEventPublications` bean, delivers the event and leaves one audit row.
11. `mvn verify` passes with PostgreSQL started by Testcontainers.

## Suggested steps

1. Create the project and the three packages. Add the modularity test first, while it is easy to pass.
2. Build `account` with its domain rules and unit tests that need no Spring. Then add the JPA adapter and migration.
3. Build `transfer` with the transaction, the failing-funds case and the event, and protect the source account against overlapping transfers with a pessimistic lock or a version column. Check criteria 2, 3 and 8.
4. Build `audit` with the listener and the registry table. Make the listener fail on purpose to verify criterion 4, then recover the publication as described in criterion 10 and check criterion 9.
5. Write `RiskScoreClient` with `RestClient`, status translation and the breaker. Start with WireMock tests for success, `404`, `500`, slowness and a malformed body.
6. Add the policy for `unknown` scores and the review status, then criterion 6.
7. Generate module documentation with `Documenter` and keep the diagram in the repository.

## Stretch goals

- Move `account` to hexagonal ports and adapters and test its rules with an in-memory store.
- Mark `TransferCompleted` as `@Externalized` and publish it to Kafka from the previous module.
- Add `@Retryable` for the risk call with a small number of attempts and compare the breaker's behavior.
- Expose the breaker state in Actuator and add an alert rule for a breaker that stays open.

## Common mistakes

- Making `AccountRepository` public, so `transfer` quietly depends on it and the verification fails later.
- Testing only the open breaker and never the closed or half-open states.
- Defining a fallback that always says "safe", so a risk outage lets large transfers through.
- Forgetting the registry table migration, so events disappear when the application restarts and the audit trail silently has holes in it.

## In practice

The shape here, modules with enforced boundaries, events between them and guarded calls to outside services, is how a monolith stays understandable as it grows. The modularity test and the failure tests are what keep that structure from eroding.

## Check yourself

1. Which mechanism proves in the build that `transfer` does not use `account` internals?
2. Why does a failing audit listener not roll back the transfer?
3. What business rule did you choose for the fallback, and why is it safe?
