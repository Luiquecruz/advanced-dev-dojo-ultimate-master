# Configuration and Profiles

The same build must run on a laptop, in tests and in production, with different ports, limits and credentials. Spring Boot separates code from configuration: values live in files, environment variables and command-line arguments, and typed classes read them. This lesson covers `application.yaml`, `@ConfigurationProperties` with records, profiles, the order in which sources override each other, and how to handle secrets. Facts apply to Spring Boot 4.

You need: Inversion of Control and Dependency Injection (beans and `@Configuration`), Auto-Configuration and Starters (properties as the first way to change a default), Records, Enums and Sealed Types (records).

## Configuration files

Boot loads `application.yaml` (or `application.properties`) from the classpath root, a `config/` folder on the classpath, and the working directory. A file next to the jar overrides the packaged one. If both formats sit in one location, `.properties` wins, so pick one format per project.

```yaml
catalog:
  page-size: 20
  import-timeout: 5s
  contact-email: team@example.com
```

Write names in kebab case. Relaxed binding maps `page-size`, `pageSize` and `page_size` to the same property.

## Typed properties with records

`@Value("${catalog.page-size}")` works for one value, but a group of related settings belongs in a class. Bind them to a record:

```java
@ConfigurationProperties(prefix = "catalog")
@Validated
public record CatalogProperties(
        @DefaultValue("20") @Min(1) @Max(100) int pageSize,
        @DefaultValue("5s") Duration importTimeout,
        @NotBlank String contactEmail,
        @NotBlank String apiKey) {
}
```

A record is bound through its constructor, so the values are immutable. `@DefaultValue` supplies a fallback, and `Duration` understands `5s`, `500ms` and `PT5S`. Register the record with `@ConfigurationPropertiesScan` on the application class (or `@EnableConfigurationProperties(CatalogProperties.class)`), then inject it like any bean. With `@Validated` and the validation starter, a bad value stops startup:

```text
Binding to target demo.cfg.CatalogProperties failed:
    Property: catalog.pageSize
    Value: "500"
    Reason: must be less than or equal to 100
```

Failing at startup is the goal: a wrong limit never reaches a request.

## Profiles

A profile names an environment. Put shared values first and override per profile, either in `application-dev.yaml` files or as documents of one file separated by `---`:

```yaml
catalog:
  page-size: 20
spring:
  profiles:
    group:
      prod: metrics
---
spring:
  config:
    activate:
      on-profile: dev
catalog:
  page-size: 5
---
spring:
  config:
    activate:
      on-profile: prod
catalog:
  page-size: 50
```

Activate profiles with `--spring.profiles.active=prod` or the environment variable `SPRING_PROFILES_ACTIVE=prod`. Activating `prod` here also activates `metrics`, because of the profile group. A bean annotated `@Profile("dev")` exists only when `dev` is active. Do not set `spring.profiles.active` inside a profile-specific document; it is not allowed there.

## Which source wins

Later sources override earlier ones. From weakest to strongest:

1. Defaults in code and `@DefaultValue`.
2. Config files: packaged in the jar, then profile-specific files in the jar, then files outside the jar, then their profile-specific files.
3. Operating system environment variables.
4. Java system properties (`-Dcatalog.page-size=30`).
5. Command-line arguments (`--catalog.page-size=9`).
6. Test properties.

To convert a name for an environment variable, replace dots with underscores, drop dashes and use upper case: `catalog.page-size` becomes `CATALOG_PAGESIZE`. With the `prod` profile active, `CATALOG_PAGESIZE=77` overrode the 50 from the profile document, and `--catalog.page-size=9` beat the environment variable.

## Secrets

Keep secrets out of the repository and out of files that ship in the jar. The record above has no value for `apiKey` in any file: the environment supplies it, and `@NotBlank` stops startup when it is missing.

```bash
export CATALOG_APIKEY='local-demo-key'
java -jar target/course-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

The value above is a fake placeholder. Platforms that mount secrets as files can import a folder with `spring.config.import=optional:configtree:/run/secrets/`, where each file name becomes a property name.

## Common mistakes

- Committing a real password or token in `application.yaml` "just for now". Git history keeps it; supply it through the environment.
- Hard-coding environment differences with `if` statements on the profile name. Put the values in profile files and keep code the same.
- Expecting `${MISSING}` to fail startup. A `@ConfigurationProperties` record binds an unresolved placeholder as literal text, so validate required values instead of relying on it.
- Logging the properties object. A record's `toString` prints every component, including the key.

## In practice

Teams keep one `application.yaml` with safe local defaults, add `application-prod.yaml` for production limits, and inject credentials through the platform. The properties record becomes the documented list of what an operator can change, and validation turns a typo into a failed deployment instead of a bug.

## Check yourself

1. Which wins when `application-prod.yaml`, an environment variable and a command-line argument all set `catalog.page-size`?
2. What is the environment variable name for `catalog.import-timeout`?
3. How does a required secret that is missing from the environment get caught?
