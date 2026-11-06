# Validation with Jakarta

Every request body is untrusted input. Jakarta Bean Validation lets you state the rules as annotations on the data (this title must not be blank, that number must be between 1 and 200) and has the framework enforce them before your code runs. This lesson covers constraints on records, `@Valid` and `@Validated`, constraints on parameters, custom validators and a first look at validation groups. Facts apply to Spring Boot 4, which manages Jakarta Validation 3.1 and Hibernate Validator 9.

You need: REST Controllers (request bodies), Records, Enums and Sealed Types (records and compact constructors), Exceptions in Depth (unchecked exceptions).

## Constraints on records

Add `spring-boot-starter-validation`, then annotate the record components from `jakarta.validation.constraints`:

```java
public record CourseRequest(
        @NotBlank @Size(max = 80) String title,
        @NotNull Level level,
        @NotNull @Min(1) @Max(200) Integer durationHours) {
}
```

The common constraints:

- `@NotNull`: the value is present. `@NotBlank`: a string with at least one non-space character. `@NotEmpty`: a string, collection or map that is not empty.
- `@Size(min, max)`: the length of a string or collection. `@Min`, `@Max`, `@Positive`, `@PositiveOrZero`: numbers.
- `@Email`, `@Pattern(regexp)`: text formats. `@Past`, `@Future`: dates.

Most constraints treat `null` as valid, so a field that is required needs `@NotNull` or `@NotBlank` as well. Use `Integer` rather than `int` for a number the client must send: a missing `int` silently becomes 0, while a missing `Integer` is `null` and `@NotNull` can reject it.

## Triggering validation

Annotations do nothing until something asks for validation. On a request body, add `@Valid`:

```java
@PostMapping
public ResponseEntity<CourseResponse> create(@Valid @RequestBody CourseRequest request) { /* ... */ }
```

A violation makes Spring MVC throw `MethodArgumentNotValidException` before the method runs, and the response is a 400. For nested data, put `@Valid` on the nested component, including inside a collection, so each element is checked:

```java
public record CohortRequest(
        @NotBlank String name,
        @NotEmpty List<@Valid Seat> seats) {

    public record Seat(@NotBlank String learner) { }
}
```

## Constraints on parameters

Constraints can sit directly on controller parameters, which is how you validate path variables and query parameters:

```java
@GetMapping("/{id}")
String get(@PathVariable @Positive long id, @RequestParam(defaultValue = "1") @Min(1) int page) { /* ... */ }
```

Since Spring Framework 6.1, MVC validates such methods itself and throws `HandlerMethodValidationException`, also a 400. A handler for validation errors should therefore cover both exception types. Do not put `@Validated` on the controller class: that switches to proxy-based validation and a different exception.

On a service, `@Validated` on the class enables the proxy-based kind: a violated constraint on a parameter throws `jakarta.validation.ConstraintViolationException`. Use it to guard service methods that more than one caller reaches.

## Custom constraints

When no built-in annotation fits, write an annotation and a validator. This one checks two fields together, so it sits on the record:

```java
@Constraint(validatedBy = EndsAfterStartValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface EndsAfterStart {
    String message() default "must end after it starts";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class EndsAfterStartValidator implements ConstraintValidator<EndsAfterStart, CohortRequest> {

    @Override
    public boolean isValid(CohortRequest cohort, ConstraintValidatorContext context) {
        if (cohort == null || cohort.startsOn() == null || cohort.endsOn() == null) {
            return true;
        }
        return cohort.endsOn().isAfter(cohort.startsOn());
    }
}
```

The three attributes `message`, `groups` and `payload` are required on every constraint annotation. The validator returns `true` for missing values so that `@NotNull` reports those, and each rule has one job. Spring creates validators through its own factory, so a validator can take beans such as a repository in its constructor. A violation of a class-level constraint is a global error on the object, not a field error.

## Validation groups

A group selects which constraints apply, so one record can serve two operations. Declare marker interfaces, tag constraints with them, and choose a group with Spring's `@Validated` (the standard `@Valid` cannot choose one):

```java
public interface OnCreate { }
public interface OnUpdate { }

public record CohortChange(
        @Null(groups = OnCreate.class) @NotNull(groups = OnUpdate.class) Long id,
        @NotBlank(groups = { OnCreate.class, OnUpdate.class }) String name) { }

@PostMapping
ResponseEntity<Void> create(@Validated(OnCreate.class) @RequestBody CohortChange change) { /* ... */ }
```

Constraints without a group belong to the default group, which a call with `OnCreate` does not run, so tag every constraint you want checked. At an introductory level, separate request records for create and update are often simpler than groups.

## Common mistakes

- Annotating a record and forgetting `@Valid` on the parameter. The rules never run and bad data reaches the service.
- Using `@NotNull` on a string and expecting it to reject `""` or spaces. Use `@NotBlank`.
- Declaring a required number as `int`. A missing field becomes 0 and may even pass `@Min(0)`.
- Putting business rules, such as "the title is unique", in a constraint. They need data access and belong in the service.

## In practice

Validation checks the shape of one request in isolation: presence, size, range, format and simple cross-field rules. Rules that need stored data stay in the service. Because the constraints are on the record, the OpenAPI document (lesson 7) can read them and show the same limits to API clients.

## Check yourself

1. Which two things must be present for a request body record to be validated?
2. Why use `Integer` instead of `int` for a required number?
3. Which exception does a violated `@Positive` on a `@PathVariable` raise in Spring MVC?
