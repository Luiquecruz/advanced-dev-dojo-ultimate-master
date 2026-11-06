# The N+1 Problem and Fetching

Lazy loading keeps queries small, but it hides a trap: a loop that touches a lazy association runs one extra query per row. The result works in development with five rows and crawls in production with five thousand. This lesson shows how to detect the N+1 problem, the four ways to fix it, the limits of each fix, and why Spring Boot's Open Session in View setting deserves to be turned off.

You need: JPA and Hibernate Basics, Spring Data Repositories, Relationships, Transactions.

## What N+1 looks like

Inside a service transaction, with `Course` and its lazy `lessons` collection from lesson 3:

```java
List<Course> courses = courseRepository.findAll();
for (Course course : courses) {
    System.out.println(course.getTitle() + ": " + course.getLessons().size());
}
```

`findAll` runs one query for the courses. Each `getLessons().size()` initializes one collection and runs one more query. With three courses that is four statements, and with 3,000 courses it is 3,001. The Hibernate documentation calls this the SELECT fetch strategy, generally termed N+1.

## Detecting it

Read the SQL: `logging.level.org.hibernate.SQL=debug` prints every statement, and repeated statements that differ only by a parameter are the signature. For tests, enable `spring.jpa.properties.hibernate.generate_statistics=true` and count statements:

```java
Statistics statistics = entityManager.getEntityManagerFactory()
        .unwrap(SessionFactory.class).getStatistics();
statistics.clear();

// run the code under test

assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
```

A test that pins the count fails when someone adds an association that silently multiplies queries.

## Fix 1: join fetch

A `join fetch` loads the association in the same query:

```java
@Query("select c from Course c left join fetch c.lessons where c.id = :id")
Optional<Course> findWithLessonsById(Long id);
```

The query returns each `Course` once even though the SQL returns one row per lesson, because Hibernate 6 and later de-duplicate the parents. Use `left join fetch` when a course without lessons must still appear.

## Fix 2: entity graph

An entity graph names the attributes to load, without writing JPQL:

```java
@EntityGraph(attributePaths = "lessons")
Optional<Course> findWithLessonsById(Long id);
```

It also works on derived queries and on redeclared methods such as `findAll`.

## Fix 3: batch fetching

Batch fetching keeps lazy loading but loads many collections per query with an `IN` list:

```java
@OneToMany(mappedBy = "course")
@BatchSize(size = 20)
private List<Lesson> lessons = new ArrayList<>();
```

With this setting the loop above runs two statements for up to 20 courses. To apply it everywhere, set `spring.jpa.properties.hibernate.default_batch_fetch_size=20`; by default Hibernate batches only where `@BatchSize` is present. It is the safest fix for lists, because it does not change the shape of the main query.

## Fix 4: project only what you need

If a screen needs a count, not the lessons, do not load them:

```java
public record CourseLessonCount(Long id, String title, long lessons) {
}

@Query("select c.id, c.title, count(l) from Course c left join c.lessons l group by c.id, c.title")
List<CourseLessonCount> countLessons();
```

One aggregate query replaces the whole object graph. Prefer this for read-only lists and API responses.

## Limits of join fetch

- **Pagination**: a join fetch of a collection combined with `setMaxResults` or a `Pageable` makes Hibernate warn with `HHH90003004` and apply the limit in memory, after loading every row. Page the parents first, then load their children with batch fetching or a second query.
- **Two collections**: fetching two bag collections (such as lists without a persistent order column) in one query throws `MultipleBagFetchException`, and fetching a `List` and a `Set` multiplies the rows. Fetch one collection per query.
- **Eager to-one associations**: an eager `@ManyToOne` is also fetched with extra queries when you use JPQL. Make it lazy and fetch it where needed.

## Open Session in View

Spring Boot registers `OpenEntityManagerInViewInterceptor` by default, through `spring.jpa.open-in-view`, which defaults to `true`. It keeps the persistence context open for the whole web request, so a controller or the JSON serializer can still trigger lazy loads long after the service transaction ended. That hides N+1 problems, because they work, and lets queries run during view rendering. Boot logs a warning at startup when you leave it unset. Turn it off:

```properties
spring.jpa.open-in-view=false
```

Then a lazy access outside a transaction throws `LazyInitializationException`. That is the point: load what the use case needs inside the service transaction with one of the fixes above, and return a DTO.

## Common mistakes

- Looping over an entity list and touching a lazy collection, because it works on small test data.
- Fixing N+1 by making the association `EAGER` in the mapping. Every query then loads it, including the ones that do not need it.
- Combining a collection `join fetch` with `Pageable` and ignoring the in-memory pagination warning.
- Keeping Open Session in View on, so the controller silently runs queries.

## In practice

Decide per use case how much of the graph you need, and write that into the query, graph or projection of that use case. Keep a statement-count assertion in the integration tests of list endpoints. With the setting off, a test that reaches a lazy field outside a transaction fails early.

## Check yourself

1. Why does a loop over 500 courses run 501 statements?
2. Why is `join fetch` combined with a `Pageable` a problem?
3. What does turning Open Session in View off change for the controller?
