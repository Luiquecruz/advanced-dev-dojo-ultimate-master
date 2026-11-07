# Caching with Spring and Redis

Spring can cache the result of a method without you touching Redis directly. You annotate a service method, and a proxy checks the cache before running it. When the cache lives in Redis, every instance of the API shares the same entries, so a value cached by one server is a hit on the others and an eviction on one is visible to all. This lesson wires the cache abstraction to Redis and shows the rules that keep it correct.

You need: Redis and Spring Data Redis, Transactions.

## Turning it on

Add `spring-boot-starter-cache` next to the Redis starter, enable caching on a configuration class, and tell Boot to use Redis:

```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 10m
      key-prefix: "catalog:"
      use-key-prefix: true
```

```java
@Configuration
@EnableCaching
class CacheConfiguration {
}
```

Keep `@EnableCaching` off the main application class, so a test slice does not get caching by accident. Boot then creates a `RedisCacheManager` with one cache per name you use, all with the defaults above.

## The annotations

```java
@Service
public class EventCatalogService {

    @Cacheable(cacheNames = "events", key = "#id", unless = "#result == null")
    public EventView find(long id) {
        return loadFromDatabase(id);
    }

    @CachePut(cacheNames = "events", key = "#result.id()")
    public EventView rename(long id, String title) {
        return saveTitle(id, title);
    }

    @CacheEvict(cacheNames = "events", key = "#id")
    public void cancel(long id) {
        cancelInDatabase(id);
    }
}
```

`@Cacheable` returns the stored value on a hit and skips the method body. `@CachePut` always runs the method and refreshes the entry. `@CacheEvict` removes the entry once the method returns without an error. Write the key explicitly with SpEL, and make it carry whatever must be kept apart: if two cached methods in the same cache rely on the default key, parameters of the same value collide, and a key such as `#id` still collides across two methods of one cache, so give those methods separate cache names or add a distinguishing prefix to the key. `unless` is evaluated after the call, which lets you avoid caching empty results.

## Serializing cached values

The default `RedisCacheManager` serializes values with the JDK serializer, which is the same problem as in the previous lesson. Configure JSON per cache with a typed serializer, so the value read back is the type the method returns:

```java
@Bean
RedisCacheManagerBuilderCustomizer eventCache() {
    return builder -> builder.withCacheConfiguration("events",
            RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(10))
                    .disableCachingNullValues()
                    .serializeValuesWith(RedisSerializationContext.SerializationPair
                            .fromSerializer(new JacksonJsonRedisSerializer<>(EventView.class))));
}
```

A generic JSON serializer without type information reads values back as plain maps, and the cached method then fails with a `ClassCastException` at the call site. A typed serializer avoids that. Cache read-only view records with only strings, numbers and dates, not entities.

## Where caching goes wrong

Caching works through a proxy, so a call from one method to another method of the same object bypasses it, exactly as with `@Transactional`. Move the cached method to another bean.

A cache is a copy, and copies go stale. Decide who evicts what: every write path that changes a cached row must evict or update the entry, otherwise users read old data until the time to live ends. Evict after the transaction commits whenever possible, because evicting before the commit lets a concurrent reader load the old row and put it back.

Cache keys also decide privacy. Anything that depends on the caller, such as a price per customer, must include the customer in the key, or one user will receive another user's data.

## Testing

Test the behavior, not the annotation: call the method twice and assert that the repository was hit once, and that after the write path the next read reaches the database again. Use a real Redis container in an integration test, so serialization problems appear before production.

## Common mistakes

- Calling a cached method from the same class, so the proxy never runs.
- Leaving the default key and the JDK serializer, which causes collisions and opaque data.
- Forgetting to evict on one of several write paths, serving stale data until expiry.
- Putting caller-specific data under a key that does not include the caller, which can show one user the cached answer that was computed for another user.

## In practice

Cache read-heavy, rarely changing data first: catalogs, reference lists, configuration. Measure the hit ratio, then decide whether a method deserves a cache at all, because every cache adds a consistency rule to remember.

## Check yourself

1. What does `@Cacheable` do on a hit, and what does `@CachePut` do differently?
2. Why does a self-invocation skip the cache?
3. Why should a key include the user when the cached data depends on the user?
