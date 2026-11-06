# Docker for Java Applications

A container image packages your application with the exact Java runtime and files it needs, so the same artifact runs on your laptop, in CI and in production. This lesson builds an image for a Spring Boot API in three ways: a multi-stage Dockerfile, a Dockerfile that uses the layers of a Spring Boot jar, and Spring Boot's buildpack support, which builds an image without a Dockerfile. It also covers running as a non-root user and how the JVM sees container memory.

You need: Your First Java Program (running a program with `java`), Packages and Modules (a jar and the classpath).

## Images and containers

An image is a read-only, layered snapshot built from a `Dockerfile`; a container is a running instance of an image. Each instruction creates a layer, and Docker reuses a layer from its cache when the instruction and everything before it are unchanged. That is the rule behind every tip below: put what changes rarely first and what changes often last.

## A multi-stage Dockerfile

A build needs a JDK, Maven and your sources; the running application needs only a Java runtime and the jar. A multi-stage build uses one stage to build and a second to run, so the final image carries none of the build tools:

```dockerfile
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /application
COPY --from=build /workspace/target/*.jar application.jar
ENTRYPOINT ["java", "-jar", "application.jar"]
```

`./mvnw` is the Maven wrapper that module 03 introduces. The cache mount keeps downloaded dependencies between builds, and `-DskipTests` is acceptable here because a pipeline runs the tests before it builds the image (lesson 04). Build and run it:

```bash
docker build -t course-api .
docker run --rm -p 8080:8080 course-api
```

Add a `.dockerignore` file listing `target/`, `.git/` and local files, so the build context stays small and local secrets never enter it. Use the exec form of `ENTRYPOINT` (a JSON array), so `java` is the main process and receives the stop signal directly.

## Using the layers of the jar

A Spring Boot jar holds your classes and every dependency, but dependencies change far less often than your code. Boot can split the jar into layers named `dependencies`, `spring-boot-loader`, `snapshot-dependencies` and `application`. The `tools` jar mode extracts them, and copying them in that order puts the stable layers first:

This variant assumes the jar was already built into `target/`, for example by an earlier stage or a CI step.

```dockerfile
FROM eclipse-temurin:25-jre AS extract
WORKDIR /extract
COPY target/*.jar application.jar
RUN java -Djarmode=tools -jar application.jar extract --layers --destination extracted

FROM eclipse-temurin:25-jre
WORKDIR /application
COPY --from=extract /extract/extracted/dependencies/ ./
COPY --from=extract /extract/extracted/spring-boot-loader/ ./
COPY --from=extract /extract/extracted/snapshot-dependencies/ ./
COPY --from=extract /extract/extracted/application/ ./
ENTRYPOINT ["java", "-jar", "application.jar"]
```

After a change to your code only the last layer is rebuilt and pushed, a small layer instead of the whole jar. The Spring Boot documentation also shows how to add an AOT cache on Java 25 for faster startup. The `tools` jar mode is the one the current Spring Boot reference documents; guides that mention `layertools` describe an older mechanism.

## Buildpacks without a Dockerfile

Spring Boot can build an image with Cloud Native Buildpacks. Both commands need a running Docker daemon:

```bash
./mvnw spring-boot:build-image
./gradlew bootBuildImage
```

The first is Maven's goal and the second is Gradle's task. The default image name is `docker.io/library/<artifact>:<version>`, which you change with the `spring-boot.build-image.imageName` property (Maven) or `--imageName` (Gradle). The default builder is `paketobuildpacks/builder-noble-java-tiny`, a small image with a reduced set of system libraries and no shell. Settings reach the buildpack as environment variables, such as `BP_JVM_VERSION` in the plugin's `<image><env>` block; set it to your Java version if the builder's default differs. Buildpacks give you sensible layers and a maintained base image with no Dockerfile to own; a Dockerfile gives you full control. Pick one per project.

## Run as a non-root user

A container that runs as root gives an attacker who breaks in more power than the application needs. Create an unprivileged user with a fixed ID and switch to it before the entrypoint:

```dockerfile
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app app
USER app
```

Put it before `ENTRYPOINT`. The application must then write only where that user may, such as a temporary directory or a mounted volume.

## The JVM inside a container

The JVM detects the container's memory and processor limits by default (`-XX:+UseContainerSupport`). The default maximum heap is 25 percent of the memory it sees, which is often too small for an API that is the only process in its container. Raise it with `-XX:MaxRAMPercentage`, for example `-XX:MaxRAMPercentage=75`, passed in the `JAVA_TOOL_OPTIONS` environment variable or on the command line. Do not set it near 100: threads, metaspace and direct buffers live outside the heap and count against the container limit, and exceeding the limit gets the container killed.

## Common mistakes

- Copying the whole project before the dependency step, so every source edit invalidates the dependency layer and downloads everything again; copy `pom.xml` first, or use a cache mount.
- Shipping the JDK and Maven in the final image. It is larger and has more to attack; use a build stage and a JRE runtime stage.
- Passing a password with `ENV` or `ARG` in the Dockerfile. Anyone with the image can read it from its history; supply secrets when the container starts.
- Running as root because it works. Add a `USER` instruction.

## In practice

Teams usually pick the buildpack route for plain Spring Boot services and a Dockerfile when they need a specific base image, extra files or an AOT cache. Tag images with the commit or version, not only `latest`, so a deployment names exactly what it runs.

## Check yourself

1. Why does a multi-stage build produce a smaller and safer image?
2. Why are the dependencies copied before the application layer?
3. What happens to an application whose heap is set to 100 percent of the container's memory?
