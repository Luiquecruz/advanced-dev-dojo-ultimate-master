# Code Quality and Coverage

Passing tests tell you the code behaves in the cases you wrote. They do not tell you how many cases you missed, whether the assertions are strong, or whether the code is consistent and free of easy-to-spot defects. This lesson covers coverage with JaCoCo and what it can and cannot tell you, mutation testing as a stronger check, compiler warnings and static analysis, and automatic formatting. The examples run coverage and compiler checks through `mvn verify`; PIT and Spotless use separate Maven commands unless you bind their goals to the lifecycle.

You need: Maven and the Project Layout, JUnit Jupiter in Depth, Test Doubles and Mockito.

## Coverage with JaCoCo

Code coverage records which code ran during the tests. JaCoCo attaches a Java agent to the test JVM and writes a report. Counters include lines, branches (each side of an `if`), methods and classes. Wire it into the build with two executions:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.16</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>verify</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
</plugin>
```

`mvn verify` then writes `target/site/jacoco/index.html`, with each class and line colored by whether it ran. Read the report for the red lines, not for the percentage. In the library catalog project, the untested `Main` class alone leaves line coverage at 70 percent while every rule class is fully covered, so an overall number can mislead in both directions. If you configure Surefire's `<argLine>`, include `@{argLine}` before extra JVM arguments to preserve the JaCoCo agent. Keep an empty Maven `<argLine/>` property for builds that skip the agent; do not put the placeholder inside that property itself.

## What coverage cannot tell you

Coverage shows that code ran, not that anything checked the result. A test that calls a method and asserts nothing gives full coverage and no protection. Treat the number as a floor that finds untested areas, never as a goal. A `check` execution can fail the build when a bundle drops below a limit, for example a 0.80 ratio of covered lines through a rule with `<counter>LINE</counter>`, `<value>COVEREDRATIO</value>` and `<minimum>0.80</minimum>`. Set limits to a level the team already meets and raise them slowly, and exclude generated code and plain entry points instead of writing tests that exist only for the number.

## Mutation testing

A mutation tool answers a harder question: would the tests notice if the code were wrong? PIT changes the compiled code in small ways, called mutants, such as moving a boundary from `<` to `<=`, negating a condition or replacing a return value, and reruns the tests for each. A mutant that makes a test fail is killed; one that no test notices survives. Add PIT with its JUnit 5 plugin, which also works with the JUnit version Spring Boot 4 manages:

```xml
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.30.2</version>
    <dependencies>
        <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>1.2.3</version>
        </dependency>
    </dependencies>
</plugin>
```

Run `mvn test-compile org.pitest:pitest-maven:mutationCoverage`; the first goal matters because PIT does not compile your latest tests itself. With only two tests for the late-fee calculator from the JUnit lesson, one for 10 days and one for -3, every line is covered and still 3 of the 4 generated mutants are killed. The survivor is a changed boundary on `daysLate < 0`: no test uses 0, so nothing notices that 0 days would become an error. Adding the zero case kills it. Mutation runs take much longer than normal tests, so aim them at the classes that hold business rules and run them in a nightly build rather than on every save.

## Compiler warnings and static analysis

The compiler is the cheapest analyzer. `-Xlint:all` enables every warning category and `failOnWarning` turns warnings into errors:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.16.0</version>
    <configuration>
        <compilerArgs>
            <arg>-Xlint:all</arg>
        </compilerArgs>
        <failOnWarning>true</failOnWarning>
    </configuration>
</plugin>
```

On the catalog project this stops the build with `serializable class library.DuplicateBookException has no definition of serialVersionUID`, because every exception is serializable. Dedicated tools go further: SpotBugs looks for bug patterns in the bytecode, and Checkstyle enforces style rules on the source. Introduce one tool at a time with a small rule set, fix or consciously suppress existing findings, and only then make the build fail on new ones.

## Formatting

Formatting arguments waste review time. A formatter applies one style to every file, so diffs show only real changes. Spotless runs a formatter such as google-java-format from Maven:

```xml
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>3.11.0</version>
    <configuration>
        <java>
            <googleJavaFormat/>
        </java>
    </configuration>
</plugin>
```

`mvn spotless:check` fails and lists the files that violate the format, and `mvn spotless:apply` rewrites them. Google's style uses two-space indentation, so the first run on an existing project changes many lines: do it in one commit that contains nothing else.

## Common mistakes

- Chasing a coverage percentage. Tests written only to turn lines green assert nothing, so aim at untested rules and boundaries instead.
- Making the build fail on a threshold the project does not meet yet. Start at the current value and raise it.
- Running mutation testing on the whole project on every build. It is slow, so limit it to important classes and a nightly job.
- Turning on every analyzer rule at once. The flood of findings gets ignored, so add rules gradually.

## In practice

Run coverage on every build and read the report for gaps in business rules. Use mutation testing on the code that matters most, keep compiler warnings at zero, and let the formatter end style discussions. The tools support reviewers, they do not replace judgment about what to test.

## Check yourself

1. Why can a suite with 100 percent line coverage still let a bug through?
2. What does a surviving mutant tell you, and what do you do about it?
3. Why format the whole project in a separate commit when adopting a formatter?
