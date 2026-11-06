# REST Controllers

A REST controller maps HTTP requests to Java methods and turns the return values into JSON responses. Spring MVC does the parsing, routing and serialization; your code decides the resource design, the status codes and the layering. This lesson covers the mapping annotations, request and response bodies as records, `ResponseEntity`, the controller, service and repository split, and API versioning. Facts apply to Spring Boot 4 on Spring Framework 7, with Jackson 3 for JSON.

You need: Inversion of Control and Dependency Injection (constructor injection), Configuration and Profiles (properties), Records, Enums and Sealed Types (records).

## Mapping requests

`@RestController` combines `@Controller` and `@ResponseBody`: every return value is written to the response body. A class-level `@RequestMapping` sets the shared path, and `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping` and `@DeleteMapping` set the method and the rest of the path:

```java
@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseResponse> list(@RequestParam Optional<Level> level) {
        return courseService.list(level).stream().map(CourseResponse::from).toList();
    }

    @GetMapping("/{id}")
    public CourseResponse get(@PathVariable long id) {
        return CourseResponse.from(courseService.get(id));
    }
}
```

`@PathVariable` reads a segment of the path, `@RequestParam` reads a query parameter (`Optional` makes it optional), `@RequestHeader` reads a header and `@RequestBody` reads the body. A value that cannot be converted, such as `/api/courses/abc` for a `long`, produces a 400 response.

## Records as request and response bodies

Use separate records for what comes in and what goes out, so the HTTP contract does not change every time a domain class does:

```java
public record CourseRequest(String title, Level level, Integer durationHours) { }

public record CourseResponse(long id, String title, Level level, int durationHours) {

    static CourseResponse from(Course course) {
        return new CourseResponse(course.id(), course.title(), course.level(), course.durationHours());
    }
}
```

Jackson 3 reads and writes records through their components, and enums as their names. The request has no `id` because the server assigns it; a client that sends one cannot choose it. Never return an internal or persistence class directly: a new field would leak into the API, and a lazy relationship could fail during serialization.

## Status codes with `ResponseEntity`

Returning an object gives 200. When the status or headers matter, return a `ResponseEntity`:

```java
@PostMapping
public ResponseEntity<CourseResponse> create(@RequestBody CourseRequest request) {
    CourseResponse created = CourseResponse.from(courseService.create(request));
    URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.id())
            .toUri();
    return ResponseEntity.created(location).body(created);
}

@DeleteMapping("/{id}")
public ResponseEntity<Void> delete(@PathVariable long id) {
    courseService.delete(id);
    return ResponseEntity.noContent().build();
}
```

The conventional codes:

- 200 OK for reads and updates that return the resource.
- 201 Created for a new resource, with a `Location` header pointing at it.
- 204 No Content when there is nothing to return, such as after a delete.
- 400 for malformed or invalid input, 404 for an unknown resource and 409 for a conflict such as a duplicate. Lessons 5 and 6 produce these without `if` statements in the controller.

## Layering

Keep each layer to one job. The controller handles HTTP: parse the request, call one service method, choose the status. The service holds the rules, such as rejecting a duplicate title, and throws exceptions when a rule fails. The repository stores and finds data and knows nothing about HTTP. The controller never touches the repository, and the service never sees `ResponseEntity` or a request object. This keeps rules testable without a web server and lets the storage change without touching the endpoints.

## Versioning

The simplest scheme is a path prefix, such as `/api/v1/courses`, and a new prefix for a breaking change. Spring Framework 7 also has built-in API versioning: enable one resolution strategy and put `version` on the mapping.

```properties
spring.mvc.apiversion.use.header=X-API-Version
spring.mvc.apiversion.supported=1,2
```

```java
@GetMapping(version = "1")
public GreetingV1 v1() { /* ... */ }

@GetMapping(version = "2+")
public GreetingV2 v2() { /* ... */ }
```

A request with `X-API-Version: 1` reaches the first method, 2 reaches the second, and an unsupported or missing version gets 400. `"2+"` means version 2 and above. A `version` attribute with no strategy configured stops startup with "API version specified, but no ApiVersionStrategy configured". Do not add versions until a breaking change forces them; additive changes, such as a new optional field, need none.

## Common mistakes

- Returning the domain or persistence class from the controller. Any new field becomes part of the public contract by accident.
- Using 200 for everything, including creation and deletion. Clients and caches rely on 201, 204 and 404.
- Putting rules in the controller, such as duplicate checks. The second entry point to the same rule, a scheduled job or a message handler, then has to copy them.
- Catching exceptions in each method to build error responses. One shared handler (lesson 6) is shorter and consistent.

## In practice

A reviewer reads a controller in seconds because each method is three lines: convert input, call the service, convert output. Anything longer usually belongs in the service. The same records feed the OpenAPI document (lesson 7), so the contract is the one the code actually serves.

## Check yourself

1. Which status and header does a successful `POST` that creates a resource return?
2. Why use `CourseRequest` and `CourseResponse` instead of one `Course` class?
3. What belongs in the service rather than the controller?
