# Events Between Modules

Modules need to cooperate, but if the transfer module calls the audit module's service directly, every new reaction to a transfer means changing the transfer code, and the dependency points the wrong way. Events fix this. The module that owns a fact publishes an event, and any other module reacts to it without the publisher knowing. Spring Modulith adds to plain Spring events what a business system needs: reacting after the commit, in its own transaction, and not losing an event if the application stops.

You need: Spring Modulith, The Transactional Outbox Pattern.

## Publishing an event

An event is a plain immutable object named after something that happened. The publishing module uses Spring's `ApplicationEventPublisher`:

```java
public record TransferCompleted(UUID transferId, UUID from, UUID to, BigDecimal amount) { }

@Service
class TransferService {

    private final ApplicationEventPublisher events;

    TransferService(ApplicationEventPublisher events) {
        this.events = events;
    }

    @Transactional
    void complete(Transfer transfer) {
        // update balances and save the transfer
        events.publishEvent(new TransferCompleted(transfer.id(), transfer.from(), transfer.to(), transfer.amount()));
    }
}
```

The event type lives in the publisher's public API, so other modules may depend on it. That is the intended direction: the audit module knows about the transfer module's event, while the transfer module knows nothing about audit.

## Listening in another module

The audit module declares a listener with the Spring Modulith annotation:

```java
@Component
class AuditTrail {

    @ApplicationModuleListener
    void on(TransferCompleted event) {
        // write an audit record
    }
}
```

`@ApplicationModuleListener` is a shortcut for three annotations at once: `@Async`, `@Transactional(propagation = REQUIRES_NEW)` and `@TransactionalEventListener`. This has important consequences:

- The listener runs only after the publisher's transaction commits. If the transfer rolls back, no audit record is written.
- It runs on another thread, so the publisher does not wait for it.
- It has its own transaction, so a failure in the listener does not roll back the transfer.

A plain `@EventListener`, by contrast, runs synchronously inside the publisher's transaction and thread, which couples their failures.

## The event publication registry

Asynchronous after-commit listeners have a weakness: if the application crashes between the commit and the listener's completion, the event is lost. The event publication registry closes that gap. Spring Modulith writes a record for each event and each interested listener in the same transaction as the publisher's work, and removes it only when the listener finishes successfully. Incomplete publications can be resubmitted on restart, or on demand through the `IncompleteEventPublications` bean.

Add the starter for your persistence technology, such as the JPA or JDBC starter, and create the registry table through a Flyway migration, since your schema belongs to migrations. This is the same idea as the outbox from the messaging module, built into the framework for events inside one application.

Because a listener can run again after a failure, it should be idempotent, exactly like a message consumer.

## From internal events to messages

The registry can also forward selected events to a broker. Mark an event with `@Externalized` and Spring Modulith publishes it to Kafka or another supported system, with the same reliability as the registry. This lets you start as a modular monolith with internal events and move one module to its own service later by changing where the event is delivered, not how the code reacts to it.

## Common mistakes

- Injecting another module's service just to trigger a side effect, instead of publishing an event.
- Using `@EventListener` and expecting it to run after the commit and independently of the publisher.
- Skipping the registry table, which silently reintroduces lost events after a restart.
- Making listeners non-idempotent, so a resubmitted event repeats its effect, such as writing the same audit record twice or sending a second email.

## In practice

Publish events for facts other modules care about, keep their payloads small and stable, and put listeners next to the module that owns the reaction. Watch for incomplete publications in monitoring, because a growing number means a listener keeps failing.

## Check yourself

1. Why does the audit module depend on the transfer module's event and not the other way around?
2. Which three behaviors does `@ApplicationModuleListener` combine?
3. What problem does the event publication registry solve?
