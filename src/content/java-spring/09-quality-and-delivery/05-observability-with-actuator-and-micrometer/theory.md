# Observability with Actuator and Micrometer

A deployed application is a black box until it reports on itself. Observability is the ability to answer "what is it doing and why is it slow or broken?" from the outside, using three signals: metrics (numbers over time), logs (events) and traces (the path of one request across services). Spring Boot Actuator exposes the application's state over HTTP, Micrometer records metrics and traces, and the logging system carries the context that ties them together. This lesson sets up each at an introductory level for the course API.

You need: The Backend Test Pyramid (what each level checks), Docker Compose for Local Development (running the API with its configuration), Continuous Integration (pipeline basics).

## Actuator and what it exposes

Add the `spring-boot-starter-actuator` dependency and the application gains a set of operational endpoints under `/actuator`. They expose information about the running process, so exposure is deliberate:

- By default only `health` is exposed over HTTP, at `/actuator/health`.
- `management.endpoints.web.exposure.include` lists more endpoints, for example `health,info,metrics,prometheus`. `*` selects all of them and must be quoted in YAML.
- `management.endpoints.web.exposure.exclude` always wins over `include`.
- `management.endpoint.<id>.access` sets what an endpoint allows, such as `read-only` or `none`.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "health,info,metrics,prometheus"
  endpoint:
    health:
      show-details: when-authorized
```

Endpoints such as `env`, `beans` and `heapdump` reveal configuration and memory, so never expose them to the public internet. If Spring Security is on the classpath and you define no `SecurityFilterChain` of your own, Boot secures every actuator endpoint except `health`; once you define your own chain, the rules are yours to write, including for `/actuator/**` (module 06). A separate management port, set with `management.server.port`, keeps the endpoints off the public listener. `show-details` takes `never` (the default), `when-authorized` or `always`; the default hides the components behind the status.

## Health and groups

The health endpoint combines indicators for the database, disk space and other resources into one status. `DOWN` and `OUT_OF_SERVICE` answer with HTTP 503, `UP` and `UNKNOWN` with 200. A health group selects some indicators under its own path, such as `/actuator/health/custom`. Liveness and readiness are groups too, covered in lesson 07.

## Metrics with Micrometer

Micrometer is the metrics facade Actuator uses, in the way SLF4J is the logging facade. The `metrics` endpoint lists names at `/actuator/metrics`, and `/actuator/metrics/jvm.memory.max` shows one metric with its measurements and available tags. Narrow it with `?tag=area:nonheap`; the docs describe this endpoint as a way to look at metrics, not as a production backend. For production, expose them in a format a monitoring system scrapes: with the Micrometer Prometheus registry on the classpath and `prometheus` in the exposure list, `/actuator/prometheus` serves them.

You add your own metrics through an injected `MeterRegistry`:

```java
@Service
public class EnrollmentMetrics {

    private final MeterRegistry registry;

    public EnrollmentMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public <T> T timed(Supplier<T> enrollment) {
        return Timer.builder("course.enrollment.duration")
                .description("Time spent creating an enrollment")
                .register(registry)
                .record(enrollment);
    }

    public void countResult(String result) {
        registry.counter("course.enrollments", "result", result).increment();
    }
}
```

A counter only goes up, a gauge reports a current value such as a queue size, and a timer records durations and counts. Tags split one metric into series, such as `result=created` and `result=duplicate`. Keep tag values to a small, fixed set. A tag with a user ID or a request URL with parameters creates a new series per value and can overwhelm the monitoring system. Common tags such as the environment are set once with `management.metrics.tags.<name>`.

## Tracing

A metric says that requests are slow; a trace says where. A trace is a tree of spans, one per operation, sharing a trace ID that travels between services in request headers. Spring Boot's OpenTelemetry support comes from the `spring-boot-starter-opentelemetry` starter, which exports spans over OTLP; the target is set under `management.opentelemetry.tracing.export.otlp`. By default only 10 percent of requests are sampled (`management.tracing.sampling.probability` is `0.1`); set it to `1.0` in development, and choose a lower value in production for cost. Trace propagation to other services works for clients built from the auto-configured `RestClient.Builder`, `RestTemplateBuilder` or `WebClient.Builder`; a client created with `RestClient.create()` does not propagate it.

## Logs that can be searched

When a request fails, you search the logs for it. Two changes make that practical. First, structured logs: `logging.structured.format.console=ecs` (or `logstash` or `gelf`) writes each event as JSON, and every key in the logging context, the MDC, becomes a field. Second, a correlation ID: with tracing on, Boot puts `traceId` and `spanId` into the MDC and into the default log pattern. Without tracing, or to honor an ID the client sends, a small filter can do the same:

```java
@Component
public class RequestIdFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Request-Id";
    private static final String MDC_KEY = "requestId";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String incoming = request.getHeader(HEADER);
        String requestId = incoming != null && SAFE_ID.matcher(incoming).matches()
                ? incoming
                : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
```

The filter accepts the incoming ID only when it matches a safe pattern, so a client cannot inject line breaks or huge values into your logs, and it removes the key in `finally` so a pooled thread never carries one request's ID into the next. An API consumer can send the header, and a support ticket can then quote the ID the API returned.

## Common mistakes

- Exposing every endpoint with `include: "*"` on a public port. `env`, `beans` and `heapdump` leak configuration and memory.
- Tagging a metric with an unbounded value such as a user ID or a full URL. The number of series grows without limit.
- Logging passwords, tokens or full request bodies. Logs are copied to many systems and kept for a long time.
- Forgetting `finally` when setting an MDC value, so IDs leak between requests on reused threads.

## In practice

Start with health, metrics and structured logs, which are cheap and answer most questions. Add tracing when a request crosses services or when slow requests need a breakdown. Decide what to alert on from the symptoms users feel, such as error rate and latency, rather than from every metric you can collect.

## Check yourself

1. Which endpoints are reachable over HTTP in a new Spring Boot application, and how do you add more?
2. Why is a user ID a poor tag for a metric?
3. What does a trace show that a metric does not?
