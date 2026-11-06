# Project: Ship the Course Platform

This closing project turns the course platform from code that runs on your machine into something that can be shipped: a container image for the Spring Boot API, another for the Angular client, a Compose file that starts both with a PostgreSQL database, Actuator health and a continuous integration workflow. You build it locally with Docker, JDK 25 and Node, on top of the API and client you wrote in the earlier modules. Any Spring Boot API that serves `/api/courses` and any Angular client that calls it will work; the steps do not depend on what the application does.

You need: The Test Pyramid for Both Ends, Docker for Java Applications, Docker Compose for Local Development, Continuous Integration, Observability with Actuator and Micrometer, Caching and Rate Limiting, Production Configuration and Operations.

## Goal

Work in a repository folder `course-platform` with the API in `api/` and the client in `client/`. At the end, `docker compose --profile full up --build` starts the database, the API and the client, and the client is reachable at `http://localhost:4200` with its `/api` calls forwarded to the API. A workflow file in `.github/workflows/` builds and tests both ends. Nothing is deployed anywhere; the project proves the pieces work together.

## Features

- A multi-stage `api/Dockerfile` with a build stage and a JRE runtime stage, a non-root user and a `.dockerignore`.
- A multi-stage `client/Dockerfile` that builds with Node and serves the result with nginx, with a fallback to `index.html` and a proxy from `/api/` to the API.
- A `compose.yaml` with `database`, `api` and `web` services: the database has a healthcheck, the API waits for it, and the application services are in a `full` profile.
- Configuration through environment variables from a `.env` file that is ignored by Git, plus a committed `.env.example` with fake values.
- Actuator on the API: only `health` and `info` exposed, liveness and readiness available, details hidden from anonymous callers.
- Graceful shutdown with an explicit timeout.
- A `.github/workflows/ci.yaml` with an `api` job and a `client` job, read-only token permissions and actions pinned to commit SHAs.

## Acceptance criteria

The criteria use this test data: database `courses`, user `courses`, password `change-me-locally` in `.env`, the API on port 8080 and the client on port 4200.

1. `docker compose up -d database` starts the database, and `docker compose ps` shows it as healthy after the healthcheck passes.
2. `docker compose --profile full up --build` starts all three services without a manual step, and the API starts only after the database is healthy.
3. `curl http://localhost:8080/actuator/health` answers `{"status":"UP"}` with HTTP 200, and `curl http://localhost:8080/actuator/health/readiness` answers the same status.
4. `curl -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/env` prints `404`, because `env` is not exposed.
5. `curl http://localhost:4200/api/courses` returns the same body as `curl http://localhost:8080/api/courses`, and opening `http://localhost:4200/courses/1` directly in a browser shows the client, not a 404.
6. `docker compose exec api id -u` prints a number other than `0`.
7. After changing one Java source file, a second `docker compose --profile full build api` reuses the cached dependency step.
8. `docker compose stop api` finishes without a timeout kill, and the API log shows a graceful shutdown.
9. The workflow runs `./mvnw -B verify` in `api/` and `npm test -- --no-watch --no-progress` plus `npm run build` in `client/`, sets `permissions: contents: read`, and every `uses:` line ends in a 40-character commit SHA.
10. `.env` is listed in `.gitignore`, and `git status` shows `.env.example` but not `.env`.

## Suggested steps

1. Run `./mvnw -B verify` in `api/` and `npm test -- --no-watch --no-progress` and `npm run build` in `client/` first, so you start from a green build.
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
4. Write `client/Dockerfile` and `client/nginx.conf` as in the Compose lesson, and set the project name in the `COPY` path to match the `dist` folder your build produces.
5. Write `compose.yaml` with the database, its healthcheck and the two application services in the `full` profile. Pass the datasource settings as environment variables, using the service name `database` as the host.
6. Create `.env.example` with `POSTGRES_PASSWORD=change-me-locally`, copy it to `.env`, and add `.env` to `.gitignore`.
7. Run the Compose commands from the acceptance criteria one by one and fix what fails. Read the logs with `docker compose logs api`.
8. Write `.github/workflows/ci.yaml` with the two jobs. Look up the full commit SHA of the release of each action you use, from the action's own repository, and add the version as a trailing comment.
9. Push to a scratch repository, or review the file by hand, and confirm that both jobs would run the same commands you ran in step 1.

## Stretch goals

- Build the API image with `./mvnw spring-boot:build-image` instead and compare its size and layers with your Dockerfile image.
- Add a `/api/courses/{id}` response with `Cache-Control` and an `ETag`, and check the `304` response with `curl -i`.
- Add a `RequestIdFilter` and a Micrometer counter for requests, and expose `prometheus`.
- Add a rate limit on the sign-in route and answer `429` with a `Retry-After` header.
- Add a Dependabot configuration for Maven, npm, Docker and GitHub Actions.

## Common mistakes

- Using `localhost` as the database host in the API container's environment. Inside Compose, use the service name `database`.
- Committing `.env` with the password. Commit only `.env.example`, and check `git status` before pushing.
- Copying the whole project before downloading dependencies, so every code change rebuilds everything. Copy `pom.xml` and `package.json` first.
- Running `docker compose down -v` out of habit and losing the local data you wanted to keep.

## In practice

This is the shape of a real delivery setup: reproducible images, one command for the whole system, health reported to the platform, and a pipeline that checks every change. When you later move to a cluster or a hosting service, the images, environment variables and probes you built here are what you hand over.

## Check yourself

1. Why does the API need a healthy database before it starts, and which Compose setting expresses that?
2. Which files hold real secret values, and which similar files may be committed?
3. Which acceptance criterion would fail first if the runtime image used the root user, and why does it matter?
