# Maven and the Project Layout

Until now you compiled with `javac` and ran with `java`. Real projects add libraries, tests and a packaged result, and a build tool automates all of it from one description. Maven is the build tool the rest of this track uses. This lesson covers the `pom.xml`, coordinates, dependencies and scopes, the build lifecycle, the everyday commands, the Maven Wrapper and the way a Spring Boot project inherits its versions.

You need: Your First Java Program, Exceptions and Your First Test, Packages and Modules.

## What Maven does

Maven reads a `pom.xml` (project object model) that says what the project is and what it depends on, and it follows conventions for everything else. It downloads libraries from Maven Central into a local repository (`~/.m2/repository`), compiles, runs tests and packages a jar. Install Maven 3.9 or newer next to JDK 25 and check both with `mvn -v`, which prints the Maven version and the Java it found.

## The standard layout

Maven expects fixed folders, so no configuration is needed to find your code:

```text
library-catalog/
  pom.xml
  src/main/java/library/Catalog.java
  src/main/resources/
  src/test/java/library/CatalogTest.java
  src/test/resources/
  target/
```

`src/main` holds production code, `src/test` holds tests and never ships. `target/` is generated output (classes, test reports, the jar): never edit it and never commit it.

## The pom.xml

A minimal `pom.xml` for a Java 25 library with JUnit looks like this:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>library-catalog</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.release>25</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>6.0.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

`groupId`, `artifactId` and `version` are the coordinates that identify any artifact in Maven. The group is usually a reversed domain you control, and the artifact is the project name. A version ending in `-SNAPSHOT` marks work in progress. Packaging defaults to `jar`. `maven.compiler.release` is passed to `javac --release`, so it fixes both the language level and the API level.

## Dependencies and scopes

Each dependency is a set of coordinates plus a scope that says where it is on the classpath:

- `compile` (the default): available everywhere and passed on to projects that depend on yours.
- `runtime`: not needed to compile, needed to run, such as a database driver.
- `provided`: expected from the platform at run time, so it is not packaged.
- `test`: only for compiling and running tests, and not transitive.

Libraries bring their own dependencies, called transitive dependencies. `mvn dependency:tree` prints the whole tree, which is the first tool to reach for when two versions of a library collide.

## The build lifecycle

Maven's default lifecycle is an ordered list of phases. Running a phase runs every earlier phase first:

| Phase | What happens |
| --- | --- |
| `validate` | checks the project is correct |
| `compile` | compiles `src/main/java` |
| `test` | compiles and runs the unit tests |
| `package` | builds the jar into `target/` |
| `verify` | runs checks on the package, such as integration tests |
| `install` | copies the jar into `~/.m2/repository` |
| `deploy` | uploads it to a remote repository |

The real list has more phases between these. Phases do no work themselves: plugin goals are bound to them, for example `compiler:compile` to `compile` and `surefire:test` to `test`. `clean` belongs to a separate lifecycle that deletes `target/`, so builds are usually `mvn clean verify`.

## Everyday commands

```bash
mvn test                              # compile and run the unit tests
mvn clean verify                      # full build from scratch
mvn test -Dtest=CatalogTest           # one test class
mvn package -DskipTests               # build the jar without running tests
mvn dependency:tree                   # show dependencies and their origin
```

`-D` sets a system property that plugins read. The packaged jar has no `Main-Class` entry yet, so run it with `java -cp target/library-catalog-1.0.0-SNAPSHOT.jar library.Main`.

## The Maven Wrapper

Different machines have different Maven versions. The wrapper pins one for the project: run `mvn wrapper:wrapper` once, commit the generated `mvnw`, `mvnw.cmd` and `.mvn/wrapper/maven-wrapper.properties`, and then everyone and every CI job runs `./mvnw verify`. The script downloads the pinned Maven on first use.

## Dependency management and the Spring Boot parent

Repeating versions in every dependency invites mismatches. A BOM (bill of materials) is a POM that only lists compatible versions. Import it in `dependencyManagement` and omit versions below:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.junit</groupId>
            <artifactId>junit-bom</artifactId>
            <version>6.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Spring Boot does this for the whole Spring ecosystem. A Spring Boot 4 project usually inherits from `spring-boot-starter-parent`, which manages the versions of Spring, JUnit, Mockito, Jackson and many more, turns the `java.version` property into the compiler release and configures the Boot plugin:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.2</version>
    <relativePath/>
</parent>
<properties>
    <java.version>25</java.version>
</properties>
```

Dependencies such as `spring-boot-starter-webmvc` then need no version. A project that already has another parent can import `spring-boot-dependencies` as a BOM instead.

## Common mistakes

- Running `mvn compile` and expecting tests to run. Only `test` and later phases run them, so start with `mvn test` or `mvn verify`.
- Giving a test library the default scope. It then lands on the production classpath and in the packaged artifact, so mark JUnit and Mockito with `<scope>test</scope>`.
- Pinning a different version of a library the BOM already manages. The versions drift apart, so omit the version unless you mean to override it.
- Committing `target/` or editing files inside it. It is rebuilt by every `clean`.

## In practice

Teams commit the wrapper, run `./mvnw clean verify` locally and in CI, let a BOM or parent own the versions, and keep the `pom.xml` short enough to read in one screen. When a build misbehaves, read the phase and goal lines in the Maven output first, then the dependency tree.

## Check yourself

1. Which phases run when you type `mvn package`, and which of them runs the tests?
2. Why should JUnit be in `test` scope and a database driver in `runtime` scope?
3. What problem does the Maven Wrapper solve, and which files do you commit for it?
