# Test Slices and Spring Testing Basics

A Spring Boot application is a context of objects wired together, and a test can start all of it, a part of it or none of it. This lesson explains that choice at a high level so the later modules can add tests as they add code. Modules 04 and 05 teach the controllers, services and repositories themselves; here the classes in the snippets are small stand-ins, and you only need to recognize the shape of the tests.

You need: Interfaces and Generics, Maven and the Project Layout, JUnit Jupiter in Depth, Test Doubles and Mockito.

## Three levels of Spring tests

1. **No Spring at all.** A service that receives its collaborators through the constructor can be built with `new` and tested with Mockito, as in the previous lesson. This is the fastest level and covers business rules.
2. **A slice.** Spring starts only the beans of one layer, such as the web layer or the persistence layer, with only the auto-configuration that layer needs.
3. **The whole application.** `@SpringBootTest` starts the full context, as the application would at run time.

Each level up is slower and proves more about wiring. A healthy suite has many tests at level 1, fewer slices and a handful of full-context tests.

## Dependencies

`spring-boot-starter-test` brings JUnit, Spring Test, AssertJ and Mockito. In Spring Boot 4 each technology also has a test companion starter, such as `spring-boot-starter-webmvc-test` for Spring MVC and `spring-boot-starter-data-jpa-test` for Spring Data JPA, and these bring the test starter transitively. Declare the companion of every technology you test, in test scope. The annotations live in matching packages, for example `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`, which differs from older articles you may find.

## A web slice

`@WebMvcTest` starts Spring MVC with only controllers, controller advice, filters, converters and similar web beans. Regular `@Service` and `@Repository` beans are not created, so the controller's collaborators become mocks. `@MockitoBean` is Spring's annotation for putting a Mockito mock into the context; `@MockBean` from Spring Boot 3 was removed in Boot 4.

```java
@WebMvcTest(BookController.class)
class BookControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private BookService service;

    @Test
    void knownBookReturnsItsTitle() {
        given(service.find("1")).willReturn(Optional.of(new BookEntity("1", "Dune")));

        assertThat(mvc.get().uri("/books/1")).hasStatusOk().hasBodyTextEqualTo("Dune");
    }
}
```

MockMvc (here its AssertJ-style wrapper `MockMvcTester`) exercises the controller through Spring's request handling without opening a network port. It checks mappings, status codes, JSON conversion and validation, but not the behavior of a real server such as Tomcat.

## A persistence slice

`@DataJpaTest` scans entities, configures Spring Data repositories and an embedded database if one is on the classpath, and wraps every test in a transaction that is rolled back at the end, so tests do not see each other's rows.

```java
@DataJpaTest
class BookRepositoryTest {

    @Autowired
    private BookRepository repository;

    @Test
    void titleSearchIgnoresCaseAndSorts() {
        repository.save(new BookEntity("2", "Emma"));
        repository.save(new BookEntity("1", "Dune"));

        assertThat(repository.findByTitleContainingIgnoreCaseOrderByTitle("E"))
                .extracting(BookEntity::getTitle)
                .containsExactly("Dune", "Emma");
    }
}
```

An embedded database is fast but is not the database you run in production, which the next lesson addresses with real containers.

## The full application

`@SpringBootTest` loads the whole application. By default it does not start a server: it provides a mock web environment, and with `webEnvironment = RANDOM_PORT` it starts the embedded server on a random port. In Spring Boot 4 it no longer provides MockMvc automatically, so add `@AutoConfigureMockMvc` to the test class when you want it.

```java
@SpringBootTest
@AutoConfigureMockMvc
class CatalogApiApplicationTests {

    @Autowired
    private MockMvcTester mvc;
    // tests call mvc.get().uri(...) against the real beans
}
```

Spring caches a started context and reuses it for every test class with the same configuration. Adding a `@MockitoBean` or a different property creates a different configuration and therefore another startup, which is why a suite with many varied `@SpringBootTest` classes becomes slow.

## Choosing the level

Ask what could break. A pricing rule is plain Java: test it with no Spring. A URL mapping, a status code or a JSON field is the web layer: use a slice. A query method or a constraint is the persistence layer: use a data slice. Whether the layers work together, with real configuration and wiring, needs a few full tests.

## Common mistakes

- Using `@SpringBootTest` for every test. Each one pays the startup cost and the suite becomes slow, so use plain unit tests and slices first.
- Looking for a missing bean in a slice. A `@WebMvcTest` does not create services, so provide them with `@MockitoBean`.
- Expecting `MockMvc` to appear in a `@SpringBootTest` without `@AutoConfigureMockMvc`.
- Copying `@MockBean` from older examples. It no longer exists in Spring Boot 4; use `@MockitoBean`.

## In practice

Write the unit tests first, add one slice per layer that has Spring-specific behavior, and keep a small set of full tests for the critical paths. Group full tests so they share configuration and one cached context.

## Check yourself

1. What does `@WebMvcTest` leave out of the context, and how do you supply a controller's service?
2. Why does adding a `@MockitoBean` to one `@SpringBootTest` class make the suite slower?
3. Which level of test would you use for a late fee rule, a JSON field name and a database constraint?
