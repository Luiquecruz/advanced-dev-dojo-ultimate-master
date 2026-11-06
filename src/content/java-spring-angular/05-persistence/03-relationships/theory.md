# Relationships

A course has many lessons, and a course can carry many tags that other courses share. JPA maps these links between entities with association annotations, and the details you choose decide which SQL runs, who owns the foreign key and what is deleted along with a parent. This lesson covers one-to-many, many-to-one and many-to-many mappings, the owning side, cascade, orphan removal, fetch types and `equals` and `hashCode` for entities.

You need: JPA and Hibernate Basics, Spring Data Repositories, Collections.

## Many-to-one and one-to-many

A lesson belongs to one course, and the lesson table holds the foreign key. Map that side with `@ManyToOne`:

```java
@Entity
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false)
    private int position;

    protected Lesson() {
    }

    Lesson(Course course, String title, int position) {
        this.course = course;
        this.title = title;
        this.position = position;
    }
}
```

The course can list its lessons with `@OneToMany(mappedBy = "course")`. That makes the association bidirectional. The side with the foreign key is the owning side: only changes to `Lesson.course` are written to `course_id`, and `mappedBy` marks the other side as inverse, so it is read-only for the database. The specification does not allow `mappedBy` on `@ManyToOne`. Because Hibernate ignores the inverse side when writing, keep both sides in sync with a method on the parent:

```java
@OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("position")
private List<Lesson> lessons = new ArrayList<>();

public Lesson addLesson(String lessonTitle) {
    Lesson lesson = new Lesson(this, lessonTitle, lessons.size() + 1);
    lessons.add(lesson);
    return lesson;
}

public List<Lesson> getLessons() {
    return Collections.unmodifiableList(lessons);
}
```

The getter returns an unmodifiable view, so callers must use `addLesson`, and the view does not initialize a lazy collection the way `List.copyOf` would.

## Cascade and orphan removal

Without cascade you would call `persist` on every lesson. `cascade = CascadeType.ALL` passes persist, merge, remove, refresh and detach from the course to its lessons, so saving a course saves its new lessons. `orphanRemoval = true` deletes a lesson when you remove it from the collection:

```java
course.getLessons().stream()
        .filter(lesson -> lesson.getPosition() == 1)
        .findFirst()
        .ifPresent(course::removeLesson);
```

where `removeLesson` calls `lessons.remove(lesson)`. The delete runs at flush. Use both options only for children the parent owns completely, as the specification says. Never cascade removal from a lesson to its course, and never cascade `REMOVE` on a many-to-many: deleting one course must not delete tags other courses use.

## Many-to-many

A course has many tags and a tag has many courses, so the database needs a join table:

```java
@ManyToMany
@JoinTable(name = "course_tag",
        joinColumns = @JoinColumn(name = "course_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
private Set<Tag> tags = new LinkedHashSet<>();
```

Use a `Set`: for unidirectional collections, the Hibernate documentation names sets as the best choice. In a bidirectional many-to-many either side may own the association, and the other side uses `mappedBy`. When the link carries its own data, such as an enrollment date, or changes often, map the join table as a third entity with two `@ManyToOne` fields instead.

## Fetch types

`@ManyToOne` and `@OneToOne` are eager by default, so Hibernate loads the target with the owner. `@OneToMany` and `@ManyToMany` are lazy: the collection loads on first access, inside an open persistence context. Declare `fetch = FetchType.LAZY` on every `@ManyToOne`, and fetch what you need per query. Lesson 5 shows how.

## equals and hashCode

Hibernate guarantees one Java instance per row inside a context, so the default identity `equals` often suffices, and the Hibernate documentation suggests not overriding it without a reason. You need it when entities sit in a `Set`, or when detached instances are compared.

```java
// Tag: a natural key that never changes
@Override
public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof Tag that)) return false;
    return name.equals(that.getName());
}

@Override
public int hashCode() {
    return name.hashCode();
}
```

When no natural key exists, compare the generated id only when it is set, and return a constant hash code, as `Lesson` does with `id != null && id.equals(that.getId())` and `Lesson.class.hashCode()`. A hash code built from a generated id changes when the entity is saved, which breaks it inside a `HashSet`. Call the getters on `that`, because a lazy proxy has empty fields.

## Common mistakes

- Setting only the inverse side, such as `course.getLessons().add(lesson)` without `lesson.setCourse(course)`. The foreign key stays null. Use the helper method.
- Adding `cascade = REMOVE` to a many-to-many or a `@ManyToOne`, which deletes shared rows.
- Leaving `@ManyToOne` eager, so every load pulls in a graph.
- Writing `equals` over every field or over the generated id with a matching `hashCode`.

## In practice

Prefer bidirectional links only when you really navigate both ways, and expose a method on the owner that keeps both sides consistent. Keep entities out of JSON and out of `toString`: a bidirectional link loops, and a lazy field can trigger queries.

## Check yourself

1. Which side of a bidirectional one-to-many writes the foreign key, and how does `mappedBy` express that?
2. When is `orphanRemoval` appropriate, and when is it dangerous?
3. Why can an `equals` based on a generated id break a `HashSet`?
