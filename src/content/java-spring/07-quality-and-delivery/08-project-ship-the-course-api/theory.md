# Project: Ship the Course API

This closing project turns the course API into a deliverable backend: a runtime container image, PostgreSQL in Compose, Actuator health and a continuous integration workflow. Build it locally with Docker Engine 28 or newer, JDK 25 and Maven 3.9 or newer, on top of the persistence and security work from earlier modules. Exercise its HTTP contract directly; the project needs no frontend application.

You need: The Backend Test Pyramid, Docker for Java Applications, Docker Compose for Local Development, Continuous Integration, Observability with Actuator and Micrometer, Caching and Rate Limiting, Production Configuration and Operations.

## Goal

Work in a repository folder `course-platform` with the API in `api/`. At the end, `docker compose --profile full up --build` starts the database and API. An HTTP client can check health and make authorized course requests at `http://127.0.0.1:8080`. A workflow in `.github/workflows/` builds and tests the API; this is local delivery practice rather than a deployment to an external service.

## Features

- A multi-stage `api/Dockerfile` with a build stage and a JRE runtime stage, a non-root user and a `.dockerignore`.
- A `compose.yaml` with `database` and `api` services: the database has a healthcheck, the API waits for it, and the API is in a `full` profile.
- Configuration through environment variables from a `.env` file that is ignored by Git, plus a committed `.env.example` with fake values.
- Actuator on the API: only `health` and `info` exposed, liveness and readiness available, details hidden from anonymous callers.
- Graceful shutdown with an explicit timeout.
- A `.github/workflows/ci.yaml` with an `api` verification job, read-only token permissions and actions pinned to commit SHAs.

## Acceptance criteria

The criteria use this test data: database `courses`, user `courses`, password `change-me-locally` in `.env`, the API on port 8080.

1. `docker compose up -d database` starts the database, and `docker compose ps` shows it as healthy after the healthcheck passes.
2. `docker compose --profile full up --build` starts both services without a manual step, and the API starts only after the database is healthy.
3. `curl http://localhost:8080/actuator/health` answers HTTP 200 with `status: UP`, and `curl http://localhost:8080/actuator/health/readiness` answers the same status. The health body may also list group names; it must not expose component details to anonymous callers.
4. `curl -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/env` does not return environment data: an unexposed endpoint is 404 when the request reaches routing, while a security rule can reject it with 401 or 403 first.
5. An authorized `GET /api/courses` returns the documented page shape. The same protected request without a token returns 401, and a valid token without its required authority returns 403. The tests retain the API policy instead of permitting all requests for convenience.
6. `docker compose exec api id -u` prints a number other than `0`.
7. After changing one Java source file, a second `docker compose --profile full build api` reuses the cached dependency step.
8. `docker compose stop api` finishes without a timeout kill, and the API log shows a graceful shutdown.
9. The workflow runs `./mvnw -B verify` in `api/`, sets `permissions: contents: read`, and every `uses:` reference is pinned to a 40-character commit SHA with its version in a trailing comment.
10. `.env` is listed in `.gitignore`, and `git status` shows `.env.example` but not `.env`.

## Suggested steps

1. Run `./mvnw -B verify` in `api/` first, so you start from a green build.
2. Add `spring-boot-starter-actuator` to the API and set the exposure, health details and graceful shutdown in `application.yaml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "health,info"
  endpoint:
    health:
      show-details: never
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
```

   If the API uses Spring Security from the security module, allow anonymous access to `/actuator/health/**` in its filter chain, because a custom chain replaces Boot's default rules.
3. Write `api/Dockerfile` with the build stage, a runtime stage on a JRE image and a `USER` instruction before `ENTRYPOINT`. Add `api/.dockerignore` listing `target/`, `.git/` and `.env`.
4. Write `compose.yaml` with the database, its healthcheck and the API in the `full` profile. Pass the datasource settings as environment variables, using the service name `database` as the host. Publish the API as `127.0.0.1:8080:8080` for the local checks. If security is enabled, obtain a local test access token for the protected requests; do not weaken the production policy to make curl succeed.
5. Create `.env.example` with `POSTGRES_PASSWORD=change-me-locally`, copy it to `.env`, and add `.env` to `.gitignore`.
6. Run the Compose commands from the acceptance criteria one by one and fix what fails. Read the logs with `docker compose logs api`.
7. Write `.github/workflows/ci.yaml` with the API job. Look up the full commit SHA of the release of each action you use, from the action's own repository, and add the version as a trailing comment.
8. Push to a scratch repository, or review the file by hand, and confirm that the job would run the same commands you ran in step 1.

## Stretch goals

- Build the API image with `./mvnw spring-boot:build-image` instead and compare its size and layers with your Dockerfile image.
- Add a `/api/courses/{id}` response with `Cache-Control` and an `ETag`, and check the `304` response with `curl -i`.
- Add a `RequestIdFilter` and a Micrometer counter for requests, and expose `prometheus`.
- Add a rate limit on the sign-in route and answer `429` with a `Retry-After` header.
- Add a Dependabot configuration for Maven, Docker and GitHub Actions.

## Common mistakes

- Using `localhost` as the database host in the API container's environment. Inside Compose, use the service name `database`.
- Committing `.env` with the password. Commit only `.env.example`, and check `git status` before pushing.
- Copying the whole project before downloading dependencies, so every code change rebuilds everything. Copy `pom.xml` and the Maven Wrapper configuration first.
- Running `docker compose down -v` out of habit and losing the local data you wanted to keep.

## In practice

This is the shape of a real delivery setup: reproducible images, one command for the whole system, health reported to the platform, and a pipeline that checks every change. When you later move to a cluster or a hosting service, the images, environment variables and probes you built here are what you hand over.

## Check yourself

1. Why does the API need a healthy database before it starts, and which Compose setting expresses that?
2. Which files hold real secret values, and which similar files may be committed?
3. Which acceptance criterion would fail first if the runtime image used the root user, and why does it matter?
