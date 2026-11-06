# Integration Tests with Testcontainers

A repository tested against an in-memory database proves that it works on that database. Production runs PostgreSQL or MySQL, with different SQL dialects, types, constraints and locking, and the differences show up as bugs only after release. Testcontainers closes the gap by starting a real, disposable database in a container from inside the test. This lesson covers the requirements, the JUnit integration, the Spring Boot integration, the lifecycle and the usual traps. The Spring and JPA classes in the snippets are taught in modules 04 and 05.

You need: Maven and the Project Layout, JUnit Jupiter in Depth, Test Slices and Spring Testing Basics.

## Why a real database

Embedded databases such as H2 are fast and need nothing installed, but they imitate a database. A query that uses a vendor function, a column type, a unique index with a condition or a lock hint can pass on the imitation and fail on the real thing. A container runs the same image you deploy, so the test exercises the real engine, migrations and constraints.

## Requirements

Testcontainers needs a Docker-API compatible container runtime on every machine that runs these tests, including the CI agents: Docker installed locally, or a service such as Testcontainers Cloud. The first run pulls the image, which takes time and network access. If no runtime is found, the tests fail; `@Testcontainers(disabledWithoutDocker = true)` skips them instead, which suits a team where not everyone has Docker but hides the gap on CI if you are careless.

## Dependencies

Testcontainers 2 splits modules by technology and names their artifacts with a `testcontainers-` prefix. For JUnit Jupiter and PostgreSQL in test scope, plus the JDBC driver:

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-junit-jupiter</artifactId>
    <version>2.0.5</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers-postgresql</artifactId>
    <version>2.0.5</version>
    <scope>test</scope>
</dependency>
```

In a Spring Boot project the parent manages the Testcontainers version, so you omit it. In version 2 the container class is `org.testcontainers.postgresql.PostgreSQLContainer`.

## With plain JUnit

`@Testcontainers` activates the extension and `@Container` marks a field whose lifecycle it manages. The database listens on a random host port, so ask the container for its URL:

```java
@Testcontainers
class PostgresContainerTest {

    @Container
    static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    @Test
    void containerAcceptsSqlOverJdbc() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement statement = connection.createStatement()) {
            statement.execute("create table book (isbn varchar(20) primary key, title text not null)");
            statement.execute("insert into book values ('1', 'Dune')");
            // assertions on a select go here
        }
    }
}
```

A `static` container is started once before the first test of the class and stopped after the last. An instance field would be restarted for every test method, which is slow. Pin the image tag to the version you run in production and never use `latest`, so a new image cannot change test results.

## With Spring Boot

`spring-boot-testcontainers` adds `@ServiceConnection`: declare the container as a bean and Spring Boot configures the data source from it, with no URL properties to copy.

```java
@TestConfiguration(proxyBeanMethods = false)
class PostgresTestConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
    }
}

@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Import(PostgresTestConfiguration.class)
class BookRepositoryPostgresTest { /* tests as before */ }
```

`@DataJpaTest` replaces the data source with an embedded one unless you set `replace = Replace.NONE`. Spring Boot's documentation prefers containers managed as beans over the JUnit extension, because Spring caches a context for reuse after the extension has stopped a container, and a later test then fails against a dead database.

## Schema and data

A real database starts empty. Spring Boot generates the schema automatically only for embedded databases; with PostgreSQL the first query fails with `relation "book" does not exist`. Create the tables with the migration tool from module 05, which also tests the migrations themselves, or set `spring.jpa.hibernate.ddl-auto=create-drop` for the tests only. Each test should create the rows it needs and not rely on rows left by another test.

## Reuse and speed

Starting a container costs seconds, so share one per class or per suite. Testcontainers also has an experimental reuse feature: call `withReuse(true)` and enable it with `testcontainers.reuse.enable=true` in `~/.testcontainers.properties`. The container then survives between runs on your machine, which speeds up local work, but the documentation says it is not suited for CI.

## Where these tests run

Name classes that start containers `*IT` and run them with the Maven Failsafe plugin, which executes them in the `integration-test` phase and checks the result in `verify`, while plain `mvn test` stays fast. The Spring Boot parent manages the plugin version; in a plain project add a `<version>`.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

## Common mistakes

- Running the tests on a machine without a container runtime and reading the failure as a code bug. Check that Docker is running first.
- Tagging the image `latest`. A silent upgrade of the database changes behavior between runs, so pin the version.
- Hard-coding `localhost:5432` in a test. The mapped port is random; read it from the container.
- Relying on rows left by an earlier test. Order is not guaranteed, so each test creates its own data.

## In practice

Keep most tests free of containers, and keep a focused set that proves repositories, migrations and the critical flows against the production engine. Use the same image tag as production, share containers, and run these tests in CI where Docker is available.

## Check yourself

1. What kinds of bugs can an in-memory database hide that a PostgreSQL container finds?
2. Why must a Spring test use the container's reported URL instead of a fixed port?
3. How do `mvn test` and `mvn verify` differ for a class named `BookRepositoryIT`?
