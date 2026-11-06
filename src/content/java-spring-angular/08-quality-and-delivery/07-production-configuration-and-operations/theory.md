# Production Configuration and Operations

The same jar or image should run on a laptop, in a test environment and in production, with only its configuration changing. This lesson covers what that takes: profiles and external configuration, handling secrets, stopping gracefully, sizing connection pools, giving the JVM the right memory settings, reporting health to the platform, and rolling out a new version without dropping requests.

You need: Docker for Java Applications (the JVM in a container), Docker Compose for Local Development (environment variables), Observability with Actuator and Micrometer (health and logs), Caching and Rate Limiting (several instances behind one address).

## Profiles and external configuration

Build one artifact and configure it from outside. Spring Boot reads `application.yaml` from the jar, then profile files such as `application-prod.yaml`, and environment variables and command-line arguments override all of them. A profile is a named set of configuration, activated with `spring.profiles.active`, usually through the environment:

```bash
SPRING_PROFILES_ACTIVE=prod java -jar application.jar
```

Use profiles for settings that differ by kind of environment, such as log levels or a feature switch. Keep the number small, because every profile is a combination you must test. The properties that activate profiles (`spring.profiles.active`, `spring.profiles.include`, `spring.profiles.group`) are only allowed in files that are not themselves profile-specific. A profile group, such as `production` activating `proddb` and `prodmq`, gives a deployment one name for several profiles. Values that identify one deployment, such as a database URL, belong in environment variables, not in a file inside the image.

## Secrets

A secret is any value that grants access: passwords, API keys, signing keys. The principles matter more than the tool:

- **Never in source control or in an image.** History and image layers are copied everywhere and rarely cleaned.
- **Supplied at run time** by the platform: environment variables, or files mounted into the container.
- **Least privilege.** The database user of the API needs data rights, not the right to drop tables; use separate credentials per environment.
- **Rotatable.** Design so a secret can be replaced and the application restarted without a code change.
- **Out of logs and endpoints.** Never log them, and keep `env` and `configprops` actuator endpoints closed to the public.

Spring Boot can read secrets from mounted files with a configuration tree. With this import, each file under the folder becomes a property named after the file, with the file's content as the value, which suits Docker and Kubernetes secrets:

```properties
spring.config.import=optional:configtree:/run/secrets/
```

A file named `spring.datasource.password` in that folder then sets that property. Environment variables remain the simplest option for non-critical setups.

## Graceful shutdown

When a platform stops an instance, it sends a termination signal and expects the process to finish. Graceful shutdown is on by default for the embedded servers: the server stops accepting new requests, lets in-flight requests complete and then closes the context. Bound the wait with a property:

```yaml
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
```

The platform also has a limit. Kubernetes sends `SIGTERM` and, by default, waits 30 seconds before it kills the container, so keep your timeout below the platform's grace period. Shutting down from some IDEs may be immediate because they do not send a proper signal, so test with a real signal.

## Connection pools

Every database call borrows a connection from a pool. Spring Boot picks HikariCP when it is available, and `spring.datasource.hikari.maximum-pool-size` sets its size. More is not better: the database can serve only so many connections, and the total is the pool size times the number of instances. Three instances with a pool of 30 need 90 connections, which can exceed the database's connection limit and starve other clients. Size the pool from measurements, and leave room for migrations, admin tools and other services.

## JVM memory flags

The JVM reads the container's limits by default. The default maximum heap is 25 percent of that memory, set with `-XX:MaxRAMPercentage`, so many services raise it, for example to `-XX:MaxRAMPercentage=75`, leaving room for metaspace, thread stacks and direct buffers. `-XX:+HeapDumpOnOutOfMemoryError` writes a heap dump when the heap is exhausted, to the folder given by `-XX:HeapDumpPath`; point it at a mounted volume, because a dump written inside a container disappears with it. Flags can be set in the `JAVA_TOOL_OPTIONS` environment variable, so you do not rebuild the image to tune them.

## Health probes

Platforms ask two different questions. A liveness probe asks whether the process is stuck and needs a restart. A readiness probe asks whether it should receive traffic now. Spring Boot provides both as health groups at `/actuator/health/liveness` and `/actuator/health/readiness`, enabled by default in Spring Boot 4; set `management.endpoint.health.probes.add-additional-paths=true` to also serve them as `/livez` and `/readyz` on the main port.

The reference warns against putting external systems such as the database in the liveness group: a database outage would make the platform restart every instance, which does not fix the database and turns one failure into many. A failing readiness probe instead takes the instance out of rotation until it recovers, and does not restart it. During graceful shutdown the readiness state becomes `REFUSING_TRAFFIC` and the server rejects new requests; the HTTP probes stop answering too, so the platform may keep routing to the instance for a moment. The Spring Boot documentation points to a Kubernetes `preStop` hook, which delays the stop signal so the platform stops routing first.

## Zero-downtime rollouts

A rolling update replaces instances gradually. In Kubernetes the Deployment controller keeps a minimum number of pods available (`maxUnavailable`, 25 percent by default) and creates new pods above the desired count (`maxSurge`, 25 percent by default); a new pod counts as available only when its readiness probe passes. Together with graceful shutdown, users never reach an instance that is starting or stopping. Two more habits make it safe:

- **Backward-compatible changes.** While old and new versions run side by side, both must work with the same database and the same API. Add a column before the code that uses it, and remove it only after no version reads it (module 05 covers migrations).
- **A way back.** Keep the previous image and know the command to roll back, such as `kubectl rollout undo`.

## Common mistakes

- Baking the production database password into `application-prod.yaml` or the image. Supply it when the container starts.
- Putting the database in the liveness probe, so a database outage restarts every healthy instance.
- Setting the heap to 100 percent of the container memory. Non-heap memory counts against the limit and the container is killed.
- Raising the pool size to hide slow queries, which moves the bottleneck to the database.

## In practice

Treat configuration as part of the release: review it, version it and keep environments as alike as possible. Test the failure paths on purpose, such as stopping an instance under load or revoking a secret, before production does it for you.

## Check yourself

1. Why should the liveness probe not depend on the database?
2. How does a graceful shutdown help a rolling update?
3. What limits the useful size of a connection pool?
