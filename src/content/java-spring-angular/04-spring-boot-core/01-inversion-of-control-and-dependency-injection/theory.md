# Inversion of Control and Dependency Injection

A Spring Boot application is a set of objects, called beans, that a container creates, connects and shuts down for you. Instead of each class calling `new` on its collaborators, a class declares what it needs and the container supplies it. This lesson covers the container, stereotype annotations, component scanning, constructor injection, bean methods and scopes. Facts here apply to Spring Boot 4 on Spring Framework 7.

You need: Interfaces and Generics (programming to an interface), Classes and Objects (constructors and `final` fields), Packages and Modules (packages and sub-packages).

## Inversion of control

Without a container, `main` builds the whole object graph by hand:

```java
CourseRepository repository = new InMemoryCourseRepository();
CourseService service = new CourseService(repository);
CourseController controller = new CourseController(service);
```

That is fine for three classes. With fifty, you would maintain the creation order, decide what is shared and run shutdown code yourself. Inversion of control moves that job out of your code: the container decides when objects are created and how they are connected. Dependency injection is how it connects them: it passes each object what it needs, usually as constructor arguments.

The container is an `ApplicationContext`, and `SpringApplication.run(...)` starts one and returns it. A bean is an ordinary object the context manages; no base class is required.

## Stereotypes and component scanning

`@SpringBootApplication` combines `@SpringBootConfiguration`, `@EnableAutoConfiguration` (next lesson) and `@ComponentScan`. Scanning starts at the package of the annotated class and includes its sub-packages. Every class there with a stereotype annotation becomes a bean:

- `@Component`: a generic bean.
- `@Service`: business logic.
- `@Repository`: data access; with persistence support it also translates persistence exceptions.
- `@RestController` and `@Controller`: web endpoints.
- `@Configuration`: a class that declares beans with `@Bean` methods.

All of them are `@Component` underneath; most only state intent, while the web ones also make the class a request handler. Keep the application class in the root package, such as `com.example.courseapi`. A bean in a sibling package like `com.example.other` is never scanned, and startup fails with a message that a constructor parameter "required a bean of type ... that could not be found".

## Constructor injection

A class with one constructor needs no annotation on it. The container reads the parameter types and passes matching beans (with several constructors, mark the one to use with `@Autowired`):

```java
@Service
public class CourseService {

    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }
}
```

Constructor injection is the default choice, for four reasons:

- The field is `final`, so the object is never half-built.
- A test can call `new CourseService(fakeRepository)` with no Spring at all.
- A missing bean stops startup with a clear message instead of failing on the first request.
- Dependencies are visible in the signature, so a class with eight parameters shows that it does too much. Spring Boot also rejects circular references by default (`spring.main.allow-circular-references` is `false`).

Injection on a field (`@Autowired private CourseRepository repository;`) hides all of this: the field cannot be `final`, and a test needs reflection or a running container to set it.

## Beans from `@Bean` methods

For a class you cannot annotate, such as a JDK or library type, declare a bean in a `@Configuration` class:

```java
@Configuration(proxyBeanMethods = false)
public class ClockConfiguration {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
```

The bean name is the method name, and the parameters of a `@Bean` method are injected too. Injecting a `Clock` instead of calling `Instant.now()` lets a test supply a fixed one.

## Choosing between candidates

When two beans implement one interface, injection by type is ambiguous. Mark a default with `@Primary`, pick one with `@Qualifier`, or ask for all of them:

```java
@Component
@Primary
public class EmailNotifier implements Notifier { /* ... */ }

@Component
public class SmsNotifier implements Notifier { /* ... */ }

@Service
public class AlertService {

    public AlertService(Notifier primary,
                        @Qualifier("smsNotifier") Notifier sms,
                        List<Notifier> all) { /* ... */ }
}
```

The default bean name is the simple class name with a lower-case first letter, so `SmsNotifier` is `smsNotifier`.

## Scopes

The default scope is singleton: one instance per container (not per JVM), shared by every thread. A singleton must therefore not keep request-specific data in fields. A prototype bean (`@Scope("prototype")`) is created each time it is requested, and web scopes such as `@RequestScope` give one instance per HTTP request.

A prototype injected into a singleton is resolved once, when the singleton is built, so the singleton keeps that single instance. To get a fresh one each time, inject an `ObjectProvider` and call `getObject()`:

```java
@Service
public class ReportService {

    private final ObjectProvider<ReportBuilder> builders;

    public ReportService(ObjectProvider<ReportBuilder> builders) {
        this.builders = builders;
    }

    public String report(String title) {
        return builders.getObject().line(title).build();
    }
}
```

## Common mistakes

- Creating a collaborator with `new` inside a bean, such as `new CourseService(...)` in a controller. The object is outside the container, so its own injected dependencies, configuration and proxies are missing.
- Putting the application class in a sub-package, so sibling packages are never scanned and beans seem to vanish.
- Injecting with `@Autowired` on fields, which hides dependencies and blocks `final`.
- Keeping per-request state in a singleton field, which different requests then overwrite.

## In practice

Most beans are singletons with constructor injection: controller calls service, service calls repository, each typed against an interface where a second implementation is plausible. Reach for `@Bean` methods for third-party types and for values such as the clock, and for `@Qualifier` only when two implementations really coexist.

## Check yourself

1. Why does a single-constructor bean need no `@Autowired`, and what do you gain from `final` fields?
2. Where must the `@SpringBootApplication` class live, and what happens to beans outside its package?
3. How do you get a new prototype instance on every call from a singleton?
