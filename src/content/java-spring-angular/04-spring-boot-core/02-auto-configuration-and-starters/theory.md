# Auto-Configuration and Starters

A Spring Boot application starts with almost no configuration code, yet it has a web server, a JSON mapper and an error page. That comes from two features: starters, which add the right libraries, and auto-configuration, which creates beans from what is on the classpath and backs off when you define your own. This lesson shows what `@SpringBootApplication` does, how to read the conditions report and how to override a default. Facts apply to Spring Boot 4.

You need: Inversion of Control and Dependency Injection (beans, `@Bean` methods, `@Configuration`).

## What `@SpringBootApplication` does

The annotation on your main class is three annotations in one: `@SpringBootConfiguration` (the class is a `@Configuration`), `@ComponentScan` (the scanning from the previous lesson) and `@EnableAutoConfiguration` (the subject of this lesson). Use it on one class only.

```java
@SpringBootApplication
public class CourseApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CourseApiApplication.class, args);
    }
}
```

## Starters

A starter is a dependency that pulls in a curated set of libraries for one purpose. In Spring Boot 4 the starters are named `spring-boot-starter-<technology>`. Many have a test companion named `spring-boot-starter-<technology>-test`; check the starter list before adding one. A project generated at start.spring.io with Java 25, Maven, Spring Web and Validation declares:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.2</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

The parent manages every version, so the dependencies carry none. `spring-boot-starter-webmvc` brings Spring MVC, an embedded Tomcat and Jackson. The older name `spring-boot-starter-web` still exists in Spring Boot 4 but is deprecated in favor of `spring-boot-starter-webmvc`.

## How auto-configuration decides

Auto-configuration classes are annotated with `@AutoConfiguration` and listed in a file named `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` inside each Spring Boot module jar. Boot reads those lists at startup and applies each class only if its conditions hold. The common conditions are:

- `@ConditionalOnClass`: a class is on the classpath, such as Jackson's `JsonMapper`.
- `@ConditionalOnMissingBean`: you have not defined a bean of that type.
- `@ConditionalOnProperty`: a property has a given value.

The second one makes auto-configuration non-invasive. Define your own `JsonMapper` bean and Boot's default backs off. A starter library follows the same pattern:

```java
@AutoConfiguration
@ConditionalOnClass(Clock.class)
public class AuditAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    AuditLog auditLog() {
        return new AuditLog(Clock.systemUTC());
    }
}
```

Listing `AuditAutoConfiguration` in the imports file registers it, and any application bean of type `AuditLog` replaces it.

## Seeing what was applied

Start the application with `--debug` (or set `debug=true`). Boot logs a conditions evaluation report with sections for positive matches, negative matches, exclusions and unconditional classes. A shortened excerpt:

```text
JacksonAutoConfiguration#jacksonJsonMapper matched:
   - @ConditionalOnMissingBean (types: tools.jackson.databind.json.JsonMapper; SearchStrategy: all) did not find any beans

WebMvcAutoConfiguration#hiddenHttpMethodFilter:
   Did not match:
      - @ConditionalOnBooleanProperty (spring.mvc.hiddenmethod.filter.enabled=true) did not find property 'spring.mvc.hiddenmethod.filter.enabled'
```

Read it when a bean you expected is missing or one you did not expect is present. The Actuator `conditions` endpoint shows the same data on a running application.

## Overriding a default

Prefer the smallest change that works, in this order:

1. A property, such as `server.port=9000` or `spring.jackson.default-property-inclusion=non_null`.
2. A customizer bean that adjusts the default without replacing it:

```java
@Bean
JsonMapperBuilderCustomizer failOnUnknownProperties() {
    return builder -> builder.enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
}
```

3. Your own bean of the type, which makes the default back off completely.
4. Excluding a class with `@SpringBootApplication(exclude = ...)` or the `spring.autoconfigure.exclude` property.

## Common mistakes

- Copying a dependency list from an older tutorial, such as `spring-boot-starter-web`, and expecting every Spring Boot 4 class to be there. Generate the project at start.spring.io and read the starters it chose.
- Defining a `JsonMapper` bean only to change one setting. That discards every other default; use a property or a customizer.
- Guessing why a bean is missing. Run with `--debug` and read the report.
- Depending on the inner classes or methods of an auto-configuration class. Only its name, used for exclusion, is public API.

## In practice

You rarely write auto-configuration yourself; you add a starter, set a few properties and let the defaults run. Teams that share a capability across services, such as an audit log, publish it as a starter built with the same pattern, so every service gets it by adding one dependency.

## Check yourself

1. Which three annotations does `@SpringBootApplication` combine?
2. What happens to a Boot default when your application defines a bean of the same type?
3. How do you find out why an auto-configuration was or was not applied?
