# Spring Data Repositories

Writing `EntityManager` code for every query is repetitive. Spring Data JPA removes it: you declare an interface and Spring generates the implementation at startup. This lesson covers the repository interfaces, queries derived from method names, `@Query`, projections that avoid loading whole entities, and specifications for filters built at run time.

You need: JPA and Hibernate Basics, Interfaces and Generics, Streams and Optional.

## Repository interfaces

A repository extends `JpaRepository<Entity, IdType>`:

```java
public interface CourseRepository extends JpaRepository<Course, Long> {
}
```

Spring Boot detects the interface, so you write no implementation class and no configuration. The interface already offers `save`, `findById` (returning an `Optional`), `findAll` (a `List`), `existsById`, `count`, `deleteById` and paging methods. `JpaRepository` extends `ListCrudRepository` and `ListPagingAndSortingRepository`. When you want to expose fewer operations, extend the smaller `Repository` or `CrudRepository` and redeclare only the methods you need.

## Derived queries

Spring Data reads a method name as a query: `find...By`, then properties joined by `And` or `Or`, with optional keywords:

```java
List<Course> findByLevel(Level level);

List<Course> findByTitleContainingIgnoreCaseOrderByTitleAsc(String text);

List<Course> findFirst3ByLevelOrderByTitleAsc(Level level);

boolean existsByTitleIgnoreCase(String title);

long countByLevel(Level level);
```

The other keywords include `Between`, `GreaterThan`, `In`, `IsNull`, `Top` and `Distinct`. Spring Data checks every method when the application starts, so a name that mentions a property the entity lacks makes startup fail instead of failing on the first call. When a name grows past two or three conditions, switch to `@Query`.

## Writing the query with @Query

`@Query` takes JPQL, which uses entity and field names rather than tables and columns:

```java
@Query("select c from Course c where lower(c.title) like lower(concat('%', :text, '%'))")
List<Course> search(String text);
```

Always bind values with parameters like `:text`, never by concatenating strings, which opens the query to injection. Spring Boot's Maven parent compiles with `-parameters`, so a named parameter matches the Java parameter name and `@Param` is optional. Set `nativeQuery = true` (or use `@NativeQuery`, available in Spring Data JPA 4) for plain SQL, which ties the query to one database.

A query that changes data needs `@Modifying`:

```java
@Modifying(flushAutomatically = true, clearAutomatically = true)
@Query("update Course c set c.level = :replacement where c.level = :current")
int changeLevel(Level current, Level replacement);
```

The statement runs directly in the database. Entities already loaded in the persistence context keep their old values, and lifecycle callbacks do not run. `flushAutomatically = true` flushes pending changes before the statement; otherwise clearing could discard unrelated edits. `clearAutomatically = true` detaches all instances after it, so a new load sees the new rows. Existing references keep their old fields; use `EntityManager.refresh` while an instance is managed when you need that reference updated. The method also needs a transaction, which lesson 4 explains.

## Projections

Loading a whole entity to show a title wastes columns and tracks the entity for dirty checking. A projection returns only what you ask for. The simplest form is a record:

```java
public record CourseSummary(Long id, String title, Level level) {
}

List<CourseSummary> findSummariesByLevel(Level level);

<T> List<T> findByLevel(Level level, Class<T> type);
```

Spring Data selects just the constructor properties, and the text between `find` and `By` (here `Summaries`) is ignored. The second method is a dynamic projection: the caller passes `CourseSummary.class` or `Course.class`. An interface with getters, such as `interface CourseTitle { String getTitle(); }`, also works as a closed projection; records involve no proxies. Projections are not entities, so nothing is tracked and no dirty checking happens.

## Specifications

Filters that depend on optional request parameters would need one method per combination. A specification builds a predicate in code, and predicates compose. Add `JpaSpecificationExecutor`:

```java
public interface CourseRepository
        extends JpaRepository<Course, Long>, JpaSpecificationExecutor<Course> {
}

final class CourseSpecs {

    static PredicateSpecification<Course> hasLevel(Level level) {
        return (from, builder) -> builder.equal(from.get("level"), level);
    }

    static PredicateSpecification<Course> titleContains(String text) {
        return (from, builder) ->
                builder.like(builder.lower(from.get("title")), "%" + text.toLowerCase() + "%");
    }
}

List<Course> found = repository.findAll(
        CourseSpecs.hasLevel(Level.BEGINNER).and(CourseSpecs.titleContains("java")));
```

`PredicateSpecification` was introduced with Spring Data JPA 4.0; the older `Specification` works too and is the type for `findAll(spec, pageable)`. With `PredicateSpecification`, use the fluent query: `repository.findBy(spec, query -> query.page(pageable))`. Field names in `from.get("level")` are strings, so a rename breaks them at run time unless you use the JPA metamodel that `hibernate-processor` generates.

## Common mistakes

- Calling `findAll()` and filtering the list in Java. The whole table is loaded; filter in the database with a derived query or `@Query`.
- Building JPQL by joining request text into the string. Use named parameters.
- Running a `@Modifying` update and then reading an entity loaded earlier in the same transaction, which still shows the old values. Clear the context or reload.
- Writing derived method names so long that nobody can read them. Move them to `@Query`.

## In practice

Keep repositories thin: queries and nothing else, with rules in services. Have one repository for each aggregate root, such as `Course`, not one for every table. Return projections from read paths that feed lists and APIs, and keep entities for code that changes state.

## Check yourself

1. How does Spring Data know what `findByTitleContainingIgnoreCaseOrderByTitleAsc` should do?
2. Why does an entity loaded before a `@Modifying` query still show old values?
3. When would you choose a specification over a derived query?
