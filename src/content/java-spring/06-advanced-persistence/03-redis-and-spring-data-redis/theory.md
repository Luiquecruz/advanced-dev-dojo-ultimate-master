# Redis and Spring Data Redis

A relational database is the source of truth, but it is not the fastest place to answer the same question a thousand times a second. Redis is an in-memory data structure store: it keeps data in RAM and answers simple reads and writes in well under a millisecond. Teams use it for caches, counters, short-lived tokens, locks and queues. This lesson shows what Redis stores and how a Spring Boot 4 application talks to it.

You need: Optimistic Locking with @Version, Pessimistic Locking with LockModeType, Spring Data Repositories.

## What Redis stores

Redis maps string keys to values of a few built-in types. The ones you will meet first:

- **String**: text or bytes, also used for numbers with atomic `INCR`.
- **Hash**: a map of fields, a good fit for a small object.
- **List**: ordered values, used for simple queues.
- **Set** and **sorted set**: unique members, the second with a score for rankings.

Every key can carry a time to live. Redis deletes the key when the time is up, which makes it natural for temporary data. Because the data lives in memory, treat it as fast but limited and rebuildable: the database holds the truth, and Redis holds a copy you could lose.

Naming keys with a prefix, such as `course:42` or `session:abc`, keeps them readable and lets you inspect one family with `SCAN`.

## Running it locally

Add a service to the Compose file you already use for PostgreSQL:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
```

Publishing on `127.0.0.1` keeps the instance off your network. A Redis exposed publicly without a password is a well-known way to lose a server.

## Connecting from Spring Boot

Add `spring-boot-starter-data-redis`. It brings Spring Data Redis and the Lettuce client, and Boot auto-configures a connection factory from properties:

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2s
```

Two templates are ready to inject. `StringRedisTemplate` works with string keys and string values and is the simplest choice:

```java
@Service
public class ViewCounter {

    private final StringRedisTemplate redis;

    public ViewCounter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public long record(long courseId) {
        return redis.opsForValue().increment("course:views:" + courseId);
    }
}
```

`increment` maps to the atomic `INCR` command, so concurrent requests never lose a count. `RedisTemplate<K, V>` handles arbitrary types, and that is where serialization matters.

## Serialization

Redis stores bytes, so your objects must be converted. By default `RedisTemplate` uses the JDK serializer, which produces binary data that only Java can read, ties the stored bytes to your class layout and breaks when the class changes. Prefer JSON. In Spring Data Redis 4, which uses Jackson 3, the serializers are `JacksonJsonRedisSerializer` for one known type and `GenericJacksonJsonRedisSerializer` for mixed values:

```java
@Bean
RedisTemplate<String, CourseView> courseViewTemplate(RedisConnectionFactory factory) {
    RedisTemplate<String, CourseView> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);
    template.setKeySerializer(RedisSerializer.string());
    template.setValueSerializer(new JacksonJsonRedisSerializer<>(CourseView.class));
    return template;
}
```

The older `GenericJackson2JsonRedisSerializer` still exists for Jackson 2 data but is deprecated for removal. Cache and store small, flat view objects, not JPA entities: a managed entity with lazy collections and bidirectional links does not serialize cleanly and leaks persistence concerns into the cache.

## Common mistakes

- Leaving the default JDK serialization, which produces opaque bytes tied to the Java class.
- Storing JPA entities directly instead of records or DTOs built for reading.
- Exposing Redis on a public interface without authentication.
- Treating Redis as the only copy of important data. It lives in memory, so plan for losing it, and keep the authoritative record in the database where it survives restarts.

## In practice

Use Redis for data that is cheap to recompute and expensive to fetch repeatedly: view models, counters, throttling state. Always set a time to live, keep values small, and let the application survive when Redis is down by falling back to the database or failing the feature gracefully.

## Check yourself

1. Why is Redis fast, and what does that imply about the data you keep only there?
2. What is the difference between `StringRedisTemplate` and `RedisTemplate<K, V>`?
3. Why prefer JSON serialization over the default JDK serializer?
