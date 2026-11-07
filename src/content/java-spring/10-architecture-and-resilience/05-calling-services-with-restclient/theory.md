# Calling Services with RestClient

Sooner or later your API must call someone else's: a payment provider, a risk engine, another team's service. Doing it well means more than getting a response. You need timeouts, readable error handling, safe use of the result and a way to test the call without the real service. Spring's `RestClient` is the modern, fluent, blocking HTTP client for this, and it is the one to use in new Spring MVC code.

You need: Resilience with Circuit Breakers, REST Controllers, Error Handling with Problem Details.

## RestClient, RestTemplate and WebClient

Spring offers three clients, and the choice is about the programming model:

- `RestClient` is synchronous and blocking, with a fluent API. It fits applications built on Spring MVC and virtual threads.
- `RestTemplate` is the older blocking client. It is in maintenance mode, so avoid it in new code.
- `WebClient` is non-blocking and reactive, built on Project Reactor and used with Spring WebFlux. Choose it only when the application is reactive or needs streaming.

A servlet application that simply calls another service should use `RestClient`.

## Building a client

Inject the Boot-provided `RestClient.Builder`, which already carries your configuration and message converters, and set a base URL:

```java
@Bean
RestClient riskClient(RestClient.Builder builder) {
    return builder.baseUrl("https://risk.example.internal/api/").build();
}
```

Keep the trailing slash in the base URL and use relative paths, so path resolution does not drop the last segment. Boot reads `spring.http.client.connect-timeout` and `spring.http.client.read-timeout` for the underlying request factory, so set both. A call with no timeout can hang a thread indefinitely.

## Making requests

```java
RiskScore score = riskClient.get()
        .uri("scores/{customerId}", customerId)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .body(RiskScore.class);

ResponseEntity<Void> created = riskClient.post()
        .uri("checks")
        .contentType(MediaType.APPLICATION_JSON)
        .body(new RiskCheck(customerId, amount))
        .retrieve()
        .toBodilessEntity();
```

Use URI variables as in `{customerId}` instead of concatenating strings, so values are encoded correctly. `body(Type.class)` converts the JSON response to a record; `toEntity` gives you the status and headers as well.

## Handling errors

By default `retrieve()` throws a `RestClientResponseException` subclass for 4xx and 5xx responses. Translate them into your own domain exceptions with `onStatus`, so callers deal with your language and not with HTTP details:

```java
RiskScore score = riskClient.get()
        .uri("scores/{customerId}", customerId)
        .retrieve()
        .onStatus(status -> status.value() == 404, (request, response) -> {
            throw new CustomerUnknownException(customerId);
        })
        .onStatus(HttpStatusCode::is5xxServerError, (request, response) -> {
            throw new RiskServiceUnavailableException();
        })
        .body(RiskScore.class);
```

Connection problems and timeouts raise `ResourceAccessException`. Catch the exceptions you can act on, and let the circuit breaker from the previous lesson wrap the whole call so repeated failures open the circuit.

## Putting the pieces together

A clean arrangement is one small class per remote service that exposes a domain-oriented method, such as `RiskScoreClient.scoreFor(customerId)`. Inside it sit the `RestClient` call, status translation, and the circuit breaker with its fallback. Callers never see HTTP. This class is an outbound adapter in the hexagonal sense, and the port it implements belongs to your core.

Never log secrets: request headers such as `Authorization` and API keys must stay out of logs and error messages. Pass credentials with a request interceptor or the builder's default headers, loaded from configuration.

## Testing

Test the client against a fake HTTP server instead of the real service. `MockRestServiceServer` can be bound to the builder and verifies requests and returns canned responses, and WireMock runs a real local HTTP server that is useful for simulating delays and failures. Include tests for a 404, a 500, a timeout and a malformed body, because those are the cases that break in production.

## Common mistakes

- Using `RestTemplate` in new code, or `WebClient` in a blocking application with `.block()` everywhere.
- Leaving out timeouts, so a slow service freezes request threads.
- Letting `RestClientResponseException` leak to callers and controllers instead of translating it.
- Logging full requests with the `Authorization` header, which copies a secret into log storage that many people and tools can read.

## In practice

Wrap each remote service behind a small client class with timeouts, status translation and a breaker. Write the failure tests first; they are the part you cannot easily try by hand.

## Check yourself

1. When would you choose `WebClient` instead of `RestClient`?
2. How does `onStatus` help keep HTTP details out of your domain code?
3. Which failure cases should every remote client test cover?
