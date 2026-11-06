# Capstone: Review and Delivery

The last stage turns a working project into a deliverable one. You review the whole system against the requirements, package both ends in containers, run everything with one command, let continuous integration check each change, expose health information, and write down what you learned.

You need: Capstone: Requirements and Design, Capstone: The Spring API, Capstone: Persistence and Migrations, Capstone: Security, Capstone: The Angular Client.

## Goal

Finish `course-catalog` so that a stranger can clone it, set two environment variables, run `docker compose up --build` and use it, while a pipeline proves that every pull request still builds and passes its tests. Module 08 (quality and delivery) covers the test pyramid, Docker and Compose, continuous integration and Actuator in depth.

## Features

- A self-review in `docs/review.md` that checks each requirement from stage one with evidence.
- A multi-stage Dockerfile for the API and one for the client, and a `compose.yaml` with PostgreSQL, the API and the client.
- A GitHub Actions workflow with one job per end.
- Health probes through Actuator, with nothing sensitive exposed.
- A short retrospective in `docs/retrospective.md`.

## Acceptance criteria

1. With `DB_PASSWORD` and `APP_JWT_SECRET` set, `docker compose up --build` starts three services and the list appears in the browser with the fixed data.
2. Starting Compose without `APP_JWT_SECRET` stops with a message that names the variable.
3. The API container runs as a non-root user, and its final image contains no Maven and no build tools.
4. `GET /actuator/health/readiness` answers `200` with no token, while `/actuator/env` is not reachable.
5. A pull request runs both jobs; a deliberately broken test turns the pipeline red and the fix turns it green.
6. `docs/review.md` lists every stage-one requirement with a check and at least three findings you fixed.
7. `docs/retrospective.md` names at least three things that went well, three that hurt and three topics to study next.

## Suggested steps

1. Review before packaging. For each area ask one question and record the evidence: does `docs/openapi.yaml` still match the responses; does every error have the Problem Details shape; does the chain deny by default; is the instructor loaded without extra queries; do the tests cover the unhappy paths of each stage; does the client map server errors to fields; does anything secret appear in the repository or logs?
2. Package the API in two stages, so the final image has only a JRE and the extracted layers, which keep dependencies in a layer that changes rarely:

```dockerfile
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build
COPY . .
RUN ./mvnw -B -DskipTests package \
    && cp target/*.jar application.jar \
    && java -Djarmode=tools -jar application.jar extract --layers --destination extracted

FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 app
WORKDIR /app
COPY --from=build /build/extracted/dependencies/ ./
COPY --from=build /build/extracted/spring-boot-loader/ ./
COPY --from=build /build/extracted/snapshot-dependencies/ ./
COPY --from=build /build/extracted/application/ ./
USER app
ENTRYPOINT ["java", "-jar", "application.jar"]
```

3. Package the client the same way: a Node stage runs `npm ci` and the production build, and an `nginx` stage serves the output and proxies `/api/` to the `api` service, which keeps browser and API on one origin.
4. Wire the services together. The `:?` form makes Compose refuse to start when a variable is missing, and the database health check keeps the API from starting too early:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: catalog
      POSTGRES_USER: catalog
      POSTGRES_PASSWORD: ${DB_PASSWORD:?Set DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catalog -d catalog"]
  api:
    build: ./api
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/catalog
      SPRING_DATASOURCE_USERNAME: catalog
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD:?Set DB_PASSWORD}
      APP_JWT_SECRET: ${APP_JWT_SECRET:?Set APP_JWT_SECRET}
      SPRING_PROFILES_ACTIVE: local
    depends_on:
      db:
        condition: service_healthy
```

The `local` profile enables the demo seed location from stage three. Keep it confined to this local Compose setup; production must not activate that seed profile.

5. Add the `client` service with `ports: ["127.0.0.1:8080:80"]`. Keep real values in an untracked `.env` file and commit only `.env.example` with fake ones.
6. Expose only what operations need: `management.endpoints.web.exposure.include=health,info` and `management.endpoint.health.probes.enabled=true`, which adds the liveness and readiness groups.
7. Add `.github/workflows/ci.yml` with `contents: read` permissions, one job that runs `./mvnw -B verify` in `api` with `actions/setup-java` and Temurin 25, and one that runs `npm ci`, the build and `ng test --no-watch` in `client` with Node 24. Pin every action to its reviewed full commit SHA and include its version as a comment. The container tests need Docker, which the GitHub-hosted Ubuntu runners provide.
8. Write the retrospective while the work is fresh: decisions that held, decisions you would change, and what you would study next.

## Stretch goals

- Add metrics behind an `ADMIN` rule and read one with Micrometer.
- Add a cache for the course list and decide how a delete invalidates it.
- Add rate limiting to the login endpoint.
- Replace the self-signed tokens with an external identity provider.

## Common mistakes

- Copying the whole project into the final image, so build tools and sources ship to production.
- Putting passwords in `compose.yaml` or the Dockerfile. Pass them as environment variables and keep real values out of version control.
- Declaring the review finished because the tests are green. Tests show what you thought to check; the review asks what you did not.
- Exposing every Actuator endpoint "for debugging", which can leak configuration.

## In practice

Delivery work is mostly removing surprises: the same command builds locally and in CI, secrets arrive from outside, and the platform can ask the application whether it is alive and ready. A written review and a retrospective are cheap and make the next project faster.

## Check yourself

1. Which review question found the most serious problem in your project, and which test now guards it?
2. Why is the readiness endpoint public while the environment endpoint is not?
3. What from this project would you study next, and why?
