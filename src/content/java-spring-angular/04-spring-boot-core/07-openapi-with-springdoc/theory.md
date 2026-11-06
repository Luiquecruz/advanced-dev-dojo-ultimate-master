# OpenAPI with springdoc

A REST API is only useful to a client that knows its paths, bodies and errors. OpenAPI is the standard machine-readable description of those, and the springdoc library generates it from the controllers and records you already wrote. This lesson covers adding springdoc to a Spring Boot 4 project, reading the generated document, enriching it with annotations, documenting errors, and treating the file as the contract that the Angular client is generated from.

You need: REST Controllers (mappings and records), Validation with Jakarta (constraints), Error Handling with Problem Details (the error format).

## Adding springdoc

springdoc is a community project, not part of Spring Boot, so Boot's dependency management does not cover it and the version is explicit. Its 3.x line targets Spring Boot 4: versions 3.1.x and 3.2.x are built against Boot 4.1, and 3.0.x against Boot 4.0.

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>3.2.0</version>
</dependency>
```

The `-ui` artifact serves both the document and Swagger UI. If you only need the document, use `springdoc-openapi-starter-webmvc-api`. With no further configuration the running application serves:

- `/v3/api-docs`: the OpenAPI document as JSON, and `/v3/api-docs.yaml` as YAML.
- `/swagger-ui.html`: an interactive page where you can read and try the endpoints.

The generated document declares OpenAPI 3.1.0 by default; the property `springdoc.api-docs.version` can select 3.0 for tools that need it.

## What is generated

springdoc reads the mappings, parameter types, return types and the Jakarta Validation annotations. For the `CourseRequest` record, the schema in the document is:

```json
"CourseRequest": {
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "Display title", "example": "Java Basics", "maxLength": 80, "minLength": 0 },
    "level": { "type": "string", "enum": ["BEGINNER", "INTERMEDIATE", "ADVANCED"] },
    "durationHours": { "type": "integer", "format": "int32", "maximum": 200, "minimum": 1 }
  },
  "required": ["durationHours", "level", "title"]
}
```

`@NotNull` and `@NotBlank` became `required`, `@Size` became `maxLength`, and `@Min` and `@Max` became `minimum` and `maximum`. The rules written once for the server now also describe the client's obligations.

## Enriching the document

Annotations from `io.swagger.v3.oas.annotations` add the human parts. A bean of type `OpenAPI` sets the document header:

```java
@Bean
OpenAPI courseApi() {
    return new OpenAPI().info(new Info()
            .title("Course API")
            .version("1.0.0")
            .description("Courses with levels and durations."));
}
```

On the controller, `@Tag` groups operations and `@Operation` names one. Give every operation an explicit `operationId`, because generated clients use it as the method name; the default is the Java method name, so two controllers with a `get` method collide.

```java
@RestController
@RequestMapping(path = "/api/courses", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Courses")
public class CourseController {

    @GetMapping("/{id}")
    @Operation(operationId = "getCourse", summary = "Find a course by id")
    @ApiResponse(responseCode = "200", description = "The course")
    @ApiResponse(responseCode = "404", description = "No course with this id",
            content = @Content(mediaType = "application/problem+json",
                               schema = @Schema(implementation = ProblemDetail.class)))
    public CourseResponse get(@PathVariable long id) { /* ... */ }
}
```

`produces` makes the documented response type `application/json` instead of `*/*`; an error still comes back as `application/problem+json`. `@Schema` on a record component adds `description` and `example`. Documenting the 400, 404 and 409 problem responses tells client authors what to expect, which is the point of lesson 6.

## The document as the contract

The document is the boundary between back end and front end. With the application running, save it and commit it next to the code:

```bash
curl http://localhost:8080/v3/api-docs.yaml -o openapi.yaml
```

A change to a controller or record then shows up as a diff in `openapi.yaml` during review, so a breaking change is visible before release. Module 06 generates the typed Angular client from this file instead of writing request types by hand, which keeps both ends from drifting apart.

## Production

An API description and an interactive console are information an attacker can use. Switch them off where the API is not public, or protect them with security rules (module 07):

```properties
springdoc.api-docs.enabled=false
springdoc.swagger-ui.enabled=false
```

Put those lines in a production profile so local development keeps Swagger UI.

## Common mistakes

- Leaving the default `operationId`. Two `get` methods become `get` and `get_1`, and a generated client gets unclear names.
- Documenting by hand what springdoc already reads from the code. Add annotations only for what the code cannot say, such as descriptions, examples and error responses.
- Using a springdoc version from an older tutorial. Match the line to the Boot version: 3.x for Boot 4.
- Exposing Swagger UI and the document on a production host with no protection.

## In practice

Teams treat the OpenAPI file as a reviewed artifact: it is committed, diffed in pull requests and used to generate clients and mocks. Because the document comes from the code, keeping controllers honest keeps the contract honest, and the constraints written for validation double as client documentation.

## Check yourself

1. Which artifact serves the document, and at which paths?
2. Why set an explicit `operationId` on each operation?
3. How does a `@NotBlank` constraint on a record appear in the document?
