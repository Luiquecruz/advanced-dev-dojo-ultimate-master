# Resilience with Circuit Breakers

Your application will depend on services that fail: a payment provider with a bad hour, an internal API that is deploying, a network that drops packets. If every request waits for such a service until it times out, threads pile up, the whole application slows down and a failure in one place spreads everywhere. Resilience patterns limit that damage. This lesson covers the circuit breaker, retries, and the fallback, using Resilience4j through Spring Cloud CircuitBreaker.

You need: Retries and Dead Letter Topics, Observability with Actuator and Micrometer.

## The circuit breaker

A circuit breaker watches calls to a dependency and stops making them when they keep failing. It has three states:

- **Closed**: calls pass through normally and the breaker records successes and failures in a sliding window.
- **Open**: after the failure rate crosses a threshold, calls are rejected immediately without touching the dependency. The failing service gets room to recover and callers get a fast answer instead of a slow one.
- **Half-open**: after a wait period, a few trial calls are allowed. If they succeed the breaker closes again; if they fail it opens again.

The main settings in Resilience4j are the sliding window size, the failure rate threshold (50 percent by default), the wait duration in the open state and the number of trial calls in the half-open state. A threshold of 100 percent practically never opens, so it protects nothing.

## Using it from Spring

Spring Cloud CircuitBreaker provides one API over implementations such as Resilience4j. Add the Resilience4j starter that matches your Spring Cloud release train, which supplies the factory bean:

```java
@Service
class RiskScoreClient {

    private final CircuitBreakerFactory<?, ?> circuitBreakers;
    private final RestClient restClient;

    RiskScoreClient(CircuitBreakerFactory<?, ?> circuitBreakers, RestClient.Builder builder) {
        this.circuitBreakers = circuitBreakers;
        this.restClient = builder.baseUrl("https://risk.example.internal/").build();
    }

    RiskScore scoreFor(UUID customerId) {
        return circuitBreakers.create("risk-service").run(
                () -> restClient.get().uri("scores/{id}", customerId).retrieve().body(RiskScore.class),
                failure -> RiskScore.unknown());
    }
}
```

`run` executes the supplier under the breaker. If the call fails, or the breaker is open, the fallback function receives the failure and returns an alternative. Resilience4j also offers annotations such as `@CircuitBreaker(name = "...", fallbackMethod = "...")` and `@Retry(name = "...")` when its own Spring Boot integration is present for your Boot version. The fallback method must have the same return type and accept the original parameters plus an exception, otherwise it fails at runtime.

## Designing a good fallback

A fallback is a degraded but acceptable answer: a cached value, a safe default, or an explicit "unknown" the caller handles. Decide what is safe for the business. Returning "no risk" when the risk service is down may be dangerous; returning "unknown" and sending the transfer to manual review may be right. Sometimes the correct fallback is a clear error such as `503`, and that is fine.

## Retries

Retry transient failures with a growing wait, and cap the attempts. Spring Framework 7 includes `@Retryable` with `maxRetries`, `delay`, `multiplier` and `jitter`, enabled with `@EnableResilientMethods`; Resilience4j has its own retry. Combine them with care: retries inside an open circuit are pointless, and retries multiply load on a service that is already struggling. Retry only operations that are safe to repeat, which means idempotent calls. Never retry a payment without an idempotency key.

## Other patterns

- A **timeout** is the most basic protection. Every outbound call needs one, because a call without a timeout can wait forever.
- A **rate limiter** caps how many calls per period you make or accept.
- A **bulkhead** limits concurrent calls to one dependency so a slow service cannot use all your threads. Spring Framework 7 offers `@ConcurrencyLimit` for simple cases.

Expose breaker state through Actuator and Micrometer metrics, and alert when a breaker stays open.

## Common mistakes

- Setting the failure rate threshold so high that the breaker never opens.
- A fallback with a different signature, or one that calls the same failing service again.
- Retrying non-idempotent operations, which can duplicate payments or orders.
- Leaving out timeouts and relying on the breaker alone. A call that never returns still blocks a thread, and the breaker only learns about calls that finish.

## In practice

Wrap every call that leaves your process, give each dependency its own breaker and timeout, test the open state on purpose with a stub that fails, and write down what each fallback means for the business.

## Check yourself

1. What happens to calls while a circuit breaker is open?
2. Why is it dangerous to retry a payment request without an idempotency key?
3. What makes a fallback safe for the business?
