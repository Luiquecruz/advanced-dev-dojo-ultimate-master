# JPA and Hibernate Basics

Most services keep their data in a relational database, and Java objects do not look like table rows. The Jakarta Persistence API (JPA) describes how to map objects to tables and how to load and save them, and Hibernate ORM is the implementation Spring Boot uses. This lesson covers what an entity is, how a persistence context tracks entities inside a transaction, and what changes when an entity outlives that transaction.

You need: Classes and Objects, Collections, Maven and the Project Layout, Inversion of Control and Dependency Injection, Project: Course API.

## JPA and Hibernate

JPA is a specification: annotations and interfaces in the `jakarta.persistence` package, at version 3.2 in Spring Boot 4. Hibernate ORM 7 is the provider that implements it. The starter below brings Hibernate and Spring Data JPA (next lesson) onto the classpath:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

The exact Hibernate 7.x version comes from Spring Boot's dependency management; the Dependency Versions appendix of the Boot reference lists it for your Boot version. You also add a JDBC driver and the `spring.datasource.*` properties, and Boot configures the `EntityManagerFactory` and a transaction manager for you.

## An entity

An entity is a class mapped to a table. Each instance is a row:

```java
@Entity
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Level level;

    protected Course() {
    }

    public Course(String title, Level level) {
        this.title = title;
        this.level = level;
    }

    public Long getId() { return id; }

    public String getTitle() { return title; }

    public void rename(String newTitle) { this.title = newTitle; }
}
```

The specification requires a top-level (or static nested) class that is not an enum, interface or record, is not `final`, and has a public or protected constructor without parameters. Hibernate calls that constructor and then fills the fields, so a `protected` one keeps application code on the validating constructor. Because an entity needs a no-argument constructor and changing state, a record cannot be one; records fit as query results (next lesson).

Spring Boot's default naming strategy turns `Course` into the table `course` and a field `createdAt` into the column `created_at`. Always map enums with `EnumType.STRING`: the JPA default stores the ordinal, so inserting a constant in the middle changes the meaning of every stored row.

## Generating identifiers

`GenerationType.IDENTITY` lets the database assign the key, so Hibernate must insert the row immediately to learn the id, and it cannot batch inserts for that entity. `SEQUENCE` reads values from a database sequence in advance and allows batching. `UUID` generates a `java.util.UUID` in the application. `AUTO` lets Hibernate pick: a numeric id becomes a sequence when the database supports it. Whatever you choose must match the schema; lesson 7 creates it with migrations.

## The persistence context

A persistence context is the set of entities one `EntityManager` currently tracks, with one instance per row. With Open Session in View disabled and a transaction-scoped context, it is scoped to the transaction:

```java
@Service
public class CourseRenameService {

    private final EntityManager entityManager;

    public CourseRenameService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional
    public void rename(Long id, String title) {
        Course course = entityManager.find(Course.class, id);
        if (course == null) {
            throw new NoSuchElementException("No course " + id);
        }
        course.rename(title);
    }
}
```

There is no `save` call, yet the title is updated. `find` returns a managed entity; on flush, which happens before the transaction commits (and before a JPQL query by default), Hibernate compares every managed entity with a snapshot taken when it was loaded and issues an `UPDATE` for each difference. This is dirty checking. Asking for the same id twice in one context returns the same Java instance.

An entity is always in one of four states:

- **New**: created with `new`, not known to any context.
- **Managed**: tracked by a context; changes are written at flush.
- **Detached**: has an id but its context is closed, for example after the transaction ended.
- **Removed**: scheduled for deletion at the next flush.

`persist` makes a new entity managed, `remove` schedules deletion, and `merge` copies the state of a detached entity onto a managed instance and returns that instance, leaving your detached object unchanged. Spring Data's `save` calls `persist` for a new entity and `merge` otherwise.

## Schema generation

Hibernate can create tables from your mappings through `spring.jpa.hibernate.ddl-auto` (`none`, `validate`, `update`, `create`, `create-drop`). Boot defaults to `create-drop` only for an embedded database with no migration tool, and to `none` otherwise. Use `validate` with real migrations, as lesson 7 shows.

## Common mistakes

- Changing an entity after the transaction ended and expecting the database to follow. A detached entity is no longer tracked, so no `UPDATE` happens.
- Leaving enums on the default ordinal mapping, so reordering constants corrupts stored data.
- Making an entity a record or a `final` class, or removing its no-argument constructor, which Hibernate needs.
- Using `ddl-auto=update` as a migration tool. It cannot rename columns or remove anything safely.

## In practice

Turn on SQL logging in development with `logging.level.org.hibernate.SQL=debug` and read the statements your code produces. Keep entities inside the persistence layer and hand DTOs to callers, so the rest of the code never touches a detached entity by accident. Put the transaction boundary on the service, as lesson 4 explains.

## Check yourself

1. Why does the `rename` method update the database although it never calls `save`?
2. What is the difference between a managed and a detached entity?
3. Why does `EnumType.STRING` matter for an enum column?
