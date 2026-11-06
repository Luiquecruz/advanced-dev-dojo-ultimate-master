# Docker Compose for Local Development

An application is rarely one process: the course platform needs a Spring Boot API, a PostgreSQL database and an Angular client. Docker Compose describes those services in one file and starts them with one command, so a new teammate runs the whole system without installing a database. This lesson writes a `compose.yaml` with a health-checked database, passes configuration through environment variables, runs the API and the client as containers, and shows how Spring Boot can start Compose for you.

You need: Docker for Java Applications (images, multi-stage Dockerfiles).

## Two ways to work

Day to day, you run the API from your IDE and the Angular client with `ng serve`, so reloads are fast, and only the infrastructure lives in a container. Before a release, or to check that the images work, you run everything as containers. One Compose file can serve both if the application services belong to a Compose profile, which keeps them out of a plain `docker compose up`.

## The Compose file

```yaml
services:
  database:
    image: postgres:17
    environment:
      POSTGRES_DB: courses
      POSTGRES_USER: courses
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set it in .env}
    ports:
      - "127.0.0.1::5432"
    volumes:
      - database-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U courses -d courses"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s

  api:
    profiles: ["full"]
    build: ./api
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://database:5432/courses
      SPRING_DATASOURCE_USERNAME: courses
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      database:
        condition: service_healthy

  web:
    profiles: ["full"]
    build: ./client
    ports:
      - "127.0.0.1:4200:80"
    depends_on:
      - api

volumes:
  database-data:
```

Compose reads a `.env` file next to `compose.yaml` to fill `${...}` placeholders. Keep `.env` out of version control and commit a `.env.example` with fake values such as `POSTGRES_PASSWORD=change-me-locally`. The `:?` form makes Compose stop with a message when the variable is missing, instead of starting a database with an empty password.

## Healthchecks and start order

`depends_on` alone waits only until the other container has started, not until PostgreSQL accepts connections. A `healthcheck` runs a command at an `interval`, marks the container unhealthy after the given `retries`, and ignores failures during `start_period`. With the long form `condition: service_healthy`, the API starts only after `pg_isready` succeeds. An API healthcheck needs a tool inside the image that can call `/actuator/health`; check that your base image has one, or rely on an orchestrator's probes (lesson 07).

## Configuration through environment variables

Spring Boot maps environment variables to properties by replacing dots with underscores, removing dashes and using upper case, so `SPRING_DATASOURCE_URL` sets `spring.datasource.url`. Environment variables rank above the `application` files in Boot's property precedence, so the container's values win over defaults packaged in the jar. Inside the Compose network each service is reachable by its name, which is why the URL says `database`, not `localhost`. The `environment` key sets values directly; `env_file` loads them from a file, and values in `environment` override it.

## Running the client

The Angular client builds to static files, and a web server serves them. A multi-stage `Dockerfile` in `client/` builds with Node and serves with nginx:

```dockerfile
FROM node:24 AS build
WORKDIR /client
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /client/dist/course-client/browser/ /usr/share/nginx/html/
```

`ng build` uses the production configuration by default and writes static files to the `browser` folder inside `dist/<project>`; the project name here is `course-client`. A single-page application needs a fallback: any path that is not a file must return `index.html`, so a deep link such as `/courses/7` reaches the router. The same nginx file can forward API calls, which gives the browser one origin and avoids cross-origin requests:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    location /api/ {
        proxy_pass http://api:8080;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

During `ng serve`, the same effect comes from `proxy.conf.json`, where `"/api/**"` maps to a target such as `http://localhost:8080` and `proxyConfig` points at the file in `angular.json`.

## Spring Boot Docker Compose support

Add `spring-boot-docker-compose` as an optional dependency and Spring Boot runs `docker compose up` when the application starts, using the `compose.yaml` in the working directory. Container ports are published to random free host ports if you omit a fixed host port (`"127.0.0.1::5432"` also restricts the random port to loopback), and Boot connects to whatever port was mapped. For images it recognizes by name, including `postgres`, it creates the connection details itself, so the datasource properties become unnecessary in development. A label named `org.springframework.boot.service-connection` supplies the service name for a custom image. Services in the `full` profile stay stopped because no profile is active.

The behavior is tunable: `spring.docker.compose.lifecycle-management` takes `none`, `start-only` or `start-and-stop`, and by default Boot calls `docker compose stop` on shutdown. Compose support is skipped in tests unless `spring.docker.compose.skip.in-tests` is `false`.

## Everyday commands

```bash
docker compose up -d database
docker compose --profile full up --build
docker compose down
docker compose down -v
```

The last command also deletes the named volume, which erases the local data.

## Common mistakes

- Using `localhost` as the database host inside a container. In that container `localhost` is the container itself; use the service name.
- Relying on `depends_on` without a healthcheck, so the API starts before the database accepts connections and fails.
- Committing `.env` with real passwords. Commit only an example file with fake values.
- Running `docker compose down -v` and being surprised that the data is gone.

## In practice

Keep `compose.yaml` small and close to production: the same database major version, the same variable names. Pin image tags, and let new teammates start with `cp .env.example .env` followed by one command.

## Check yourself

1. Why does `depends_on` with `service_healthy` start the API later than plain `depends_on`?
2. Which URL host does the API use to reach PostgreSQL in Compose, and why?
3. Why is the nginx fallback to `index.html` needed for an Angular application?
