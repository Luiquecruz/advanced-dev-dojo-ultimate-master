# Hexagonal Architecture

The layered controller, service and repository structure works well at first, but it has a quiet flaw: the repository is usually a Spring Data interface with JPA entities, so the business rules end up depending on the database technology. Hexagonal architecture, also called ports and adapters, reverses that dependency. The business rules sit in the middle and define what they need; frameworks and databases adapt to them at the edge.

You need: Inversion of Control and Dependency Injection, REST Controllers, Spring Data Repositories.

## The idea

Think of the application as a core surrounded by adapters:

- The **domain** holds entities, value objects and rules, as plain Java with no framework annotations.
- **Ports** are interfaces owned by the core that describe how it talks to the outside. There are two kinds.
- **Adapters** implement or call the ports using a specific technology: HTTP, JPA, Kafka, a payment provider.

The dependency rule is the one thing to remember: source code dependencies point inward. Adapters know about the core; the core never imports an adapter, Spring Web, JPA or Kafka types.

## Inbound and outbound ports

An **inbound port** (primary) describes what the application can do. A controller calls it:

```java
public interface TransferMoney {
    TransferResult transfer(TransferCommand command);
}
```

An **outbound port** (secondary) describes what the application needs from the world. The core defines the interface in its own terms:

```java
public interface AccountStore {
    Optional<Account> findById(AccountId id);
    void save(Account account);
}
```

The application service implements the inbound port and uses outbound ports:

```java
class TransferMoneyService implements TransferMoney {

    private final AccountStore accounts;

    TransferMoneyService(AccountStore accounts) {
        this.accounts = accounts;
    }

    @Override
    public TransferResult transfer(TransferCommand command) {
        Account from = accounts.findById(command.from()).orElseThrow(AccountNotFound::new);
        Account to = accounts.findById(command.to()).orElseThrow(AccountNotFound::new);
        from.withdraw(command.amount());
        to.deposit(command.amount());
        accounts.save(from);
        accounts.save(to);
        return TransferResult.completed();
    }
}
```

## Adapters

The JPA adapter implements `AccountStore`. It owns the `@Entity` class and the Spring Data repository, and it maps between the persistence entity and the domain `Account`:

```java
@Repository
class JpaAccountStore implements AccountStore {

    private final AccountJpaRepository repository;

    JpaAccountStore(AccountJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<Account> findById(AccountId id) {
        return repository.findById(id.value()).map(AccountEntity::toDomain);
    }

    @Override
    public void save(Account account) {
        repository.save(AccountEntity.from(account));
    }
}
```

A REST controller is an inbound adapter: it turns HTTP into a `TransferCommand`, calls the port and turns the result into a response. Notice what changed: the `Account` class has no `@Entity`, the service has no Spring Data type, and a test of the transfer rule needs only an in-memory implementation of `AccountStore`, not a database.

## A package layout

One simple layout is `domain`, `application` (services and ports) and `adapter` with `web` and `persistence` below it. Spring wiring happens in the adapters and in a configuration class, so the domain stays free of it. You can keep `@Service` on the application services if you accept that coupling, but the domain model should remain plain.

## The cost

The pattern adds classes and mapping code. For a small CRUD service with no real rules it is too much; the layered structure is fine there. It pays off when the rules are rich, when the same rules are reached from several entry points such as HTTP and messages, or when you expect to replace a technology. Start with the core and only introduce a port when something outside needs to be hidden.

## Common mistakes

- Putting `@Entity`, `@Table` or Spring annotations on the domain classes and calling it hexagonal.
- Confusing the outbound port `AccountStore` with the Spring Data `JpaRepository`. The first belongs to the core, the second is an adapter detail.
- Creating a port and an adapter for every class, which produces ceremony without benefit.
- Letting adapters call each other directly instead of going through the core.

## In practice

Use ports and adapters where the business rules are valuable and long-lived. Test the core with fast plain unit tests, and keep a smaller set of integration tests for each adapter.

## Check yourself

1. In which direction do source code dependencies point in a hexagonal design?
2. What is the difference between an inbound port and an outbound port?
3. Why can the transfer rule be tested without a database?
