# Caching and Rate Limiting

Two techniques protect a busy API from its own traffic. Caching avoids repeating work whose answer has not changed: a database query, a remote call, a transfer of bytes the client already has. Rate limiting refuses work beyond what the system, or one client, should consume. This lesson covers Spring's cache abstraction and its invalidation rules, HTTP caching with `Cache-Control` and `ETag`, and rate limiting concepts, including where to enforce them.

You need: Observability with Actuator and Micrometer (metrics to measure a cache), Docker Compose for Local Development (more than one instance of the API).

## The Spring cache abstraction

Spring Boot caches method results with annotations on the methods of a Spring bean, backed by a cache provider you choose. Add `spring-boot-starter-cache`, put `@EnableCaching` on a configuration class (the reference advises against the main application class, because caching then becomes mandatory in every test), and annotate:

```java
@Service
public class CourseCatalogService {

    @Cacheable(cacheNames = "courses", key = "#id")
    public CourseView find(long id) {
        return loadFromDatabase(id);
    }

    @CachePut(cacheNames = "courses", key = "#id")
    public CourseView rename(long id, String title) {
        return saveTitle(id, title);
    }

    @CacheEvict(cacheNames = "courses", key = "#id")
    public void remove(long id) {
        deleteFromDatabase(id);
    }
}
```

`@Cacheable` checks the cache first and runs the method only on a miss. `@CachePut` always runs the method and stores the result. `@CacheEvict` removes an entry after the method completes successfully, or the whole cache with `allEntries = true`. The default key is the single parameter itself, or a combination of all parameters, so parameters need correct `equals` and `hashCode`; `key = "#id"` makes the choice explicit. `condition` is evaluated before the call and `unless` after it, which lets you skip caching null results with `unless = "#result == null"`. Cache values whose component state cannot be mutated through constructor inputs or accessors. Records are only shallowly immutable: use immutable components or defensive copies so one caller cannot change what another receives.

Two behaviors surprise beginners. Caching works through a proxy, so a call from one method to another method of the same object bypasses the cache; move the cached method to another bean. And on a concurrent miss every thread computes the value unless you set `sync = true`, which lets one thread compute while the others wait.

## Choosing a provider

With no library on the classpath Boot falls back to a simple in-memory map, which is meant for getting started, not for production. With Caffeine on the classpath, the configuration is a property:

```properties
spring.cache.cache-names=courses
spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=10m,recordStats
```

Caffeine lives inside each JVM. With three API instances, an update evicts one instance's entry while the other two keep serving the old value until it expires. A shared provider such as Redis gives all instances one cache, with a time to live set by `spring.cache.redis.time-to-live`. Whichever you choose, always bound the cache by size and by time.

## Invalidation and TTL

Invalidation is the hard part of caching. Three rules cover most cases:

- **Evict or update on write.** Every method that changes the data must evict or update the entries it affects.
- **Set a time to live (TTL).** Even with eviction in place, a TTL limits how long a mistake or a change made outside the application stays visible.
- **Cache only what tolerates staleness.** A course title can be ten minutes old; a stock count or a payment status usually cannot.

Measure before and after: Boot instruments the caches configured at startup for libraries such as Caffeine and Redis, with metric names that start with `cache`, and a cache with a low hit rate only adds memory use and complexity.

## HTTP caching

The browser and any shared proxy can cache too, which saves the request entirely. The server controls that with headers. `Cache-Control` sets the rules, and `ETag` identifies a version so the client can ask "has it changed?" and get a `304 Not Modified` with no body:

```java
@GetMapping("/api/courses/{id}")
public ResponseEntity<CourseView> show(@PathVariable long id) {
    CourseView course = courses.find(id);
    return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
            .eTag(String.valueOf(course.version()))
            .body(course);
}
```

Spring also offers `ShallowEtagHeaderFilter`, which computes an ETag from the response body; it saves bandwidth but not the work of building the response. `private` prevents reuse by shared caches, but it does not isolate a browser cache when accounts switch in the same profile. For user-specific responses use `no-store` or a carefully tested policy that accounts for identity changes; sensitive data should use `no-store`. Keep the validators and cache policy attached to the response contract, and test that a changed representation produces a different validator.

## Rate limiting

A rate limiter decides, per client, whether a request may proceed now. The common algorithm is the token bucket: a bucket holds up to a fixed number of tokens, refills at a steady rate, and each request takes one. A burst is allowed up to the bucket size, and the long-run rate is the refill rate. This version takes the clock as a parameter, so it is testable:

```java
public final class TokenBucket {

    private final long capacity;
    private final double refillPerNano;
    private final LongSupplier nanoClock;
    private double tokens;
    private long lastRefill;

    public TokenBucket(long capacity, long refillPerSecond, LongSupplier nanoClock) {
        if (capacity <= 0 || refillPerSecond <= 0) {
            throw new IllegalArgumentException("capacity and refill must be positive");
        }
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000.0;
        this.nanoClock = nanoClock;
        this.tokens = capacity;
        this.lastRefill = nanoClock.getAsLong();
    }

    public synchronized boolean tryAcquire() {
        long now = nanoClock.getAsLong();
        tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerNano);
        lastRefill = now;
        if (tokens < 1) {
            return false;
        }
        tokens -= 1;
        return true;
    }
}
```

When the limiter says no, answer `429 Too Many Requests` and, when you can, a `Retry-After` header so well-behaved clients know when to come back. The key you limit by matters: an API key or user ID for authenticated traffic, the client address for anonymous traffic, and stricter limits on sign-in and password reset endpoints.

## Where to enforce limits

Spring Boot does not ship a general rate limiter, so the choice is architectural:

- **At the edge**, in a reverse proxy, a load balancer or an API gateway. This stops excess traffic before it reaches the application. Spring Cloud Gateway has a `RequestRateLimiter` filter whose Redis implementation uses a token bucket and answers 429 by default.
- **In the application**, as a filter or interceptor with a library, when the limit depends on business rules such as a plan or a tenant.
- **Per instance or shared?** An in-memory bucket limits each instance separately, so three instances allow three times the rate. A shared store, such as Redis, enforces one limit across all of them.

Use both layers for important APIs: a coarse limit at the edge and a precise one in the application.

## Common mistakes

- Caching a method and calling it from the same class. The call skips the proxy, so nothing is cached.
- Caching without eviction or a TTL, so a change in the database stays invisible until a restart.
- Returning `Cache-Control: public` for one user's data. Choose `no-store` or a private policy that accounts for account changes in a browser profile.
- Rate limiting by instance memory behind a load balancer and expecting a global limit.

## In practice

Cache the reads that are expensive and tolerant of staleness, bound every cache, and watch hit rates. Put a broad rate limit at the edge first; add per-user rules in the application only where business rules need them.

## Check yourself

1. What is the difference between `@CachePut` and `@Cacheable`?
2. Why can a Caffeine cache return stale data when the API runs on several instances?
3. What should a client receive when it exceeds the rate limit?
