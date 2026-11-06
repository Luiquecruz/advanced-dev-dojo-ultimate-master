# Capstone: Requirements and Design

The capstone is one application built in six stages: a course catalog with a Spring Boot 4 API, a PostgreSQL database, token security and an Angular 22 client. This first stage writes no application code. You decide what the system must do, what its data looks like and what its HTTP contract is, so the later stages have a target and a way to tell when they are done.

You need: Project: Course API, Project: Course Catalog Persistence, Project: Course Catalog Front End, Project: Secure Course API, Project: Ship the Course Platform.

## Goal

Produce a folder `course-catalog/docs/` with four short documents: `requirements.md`, `data-model.md`, `openapi.yaml` and `decisions.md`, plus a list of risks. Later stages implement them and the review stage checks the finished system against them. The modules before this one (build and tests, Spring Boot core, persistence, Angular with a Spring back end, security, quality and delivery) are the toolbox, and each later stage names the module it leans on.

## Features

The system manages courses and the people who teach them.

- Anyone can list courses (paged, sorted by title, filterable by level) and open one course.
- An administrator can create a course and delete it. Updating a course is a later stretch goal. Deleted courses disappear from every response but stay in the database.
- Every course has a unique code such as `JAVA-101`, a title, an optional description, a level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) and exactly one instructor.
- Invalid input produces a structured error that names each wrong field.
- Non-functional: reads answer in under 200 ms for 10,000 courses on a laptop, the API holds no session state, and no secret is stored in the repository.

## Acceptance criteria

The fixed test data for the whole capstone: instructors `Ada Lovelace` (id 1) and `Grace Hopper` (id 2); courses `JAVA-101` Java Basics (BEGINNER, Ada), `SPRING-201` Spring Boot in Practice (INTERMEDIATE, Ada) and `NG-201` Angular Signals (INTERMEDIATE, Grace).

1. `requirements.md` has at least eight numbered requirements, each testable by one sentence such as "page 0 with size 2 returns Angular Signals and Java Basics, and `totalElements` is 3".
2. `data-model.md` lists the tables `instructor` and `course`, their columns, the foreign key, the unique constraint on the code and the soft-delete column.
3. `openapi.yaml` is valid YAML and describes `GET` and `POST /api/courses`, `GET` and `DELETE /api/courses/{id}` and `POST /api/auth/login`, including the `400`, `401`, `403`, `404` and `409` responses.
4. `decisions.md` records at least three decisions, each with context, choice and consequence.
5. The risk list names at least five risks, each with a mitigation.

## Suggested steps

1. List the requirements as sentences with one verb each, then mark each as functional or non-functional. Delete any you cannot test.
2. Sketch the tables. Decide now that the schema belongs to migrations, not to Hibernate, and that the course code is unique among non-deleted rows only.
3. Write the contract before the code. The skeleton below is enough to start:

```yaml
openapi: 3.1.0
info:
  title: Course Catalog API
  version: 1.0.0
paths:
  /api/courses:
    get:
      summary: List courses
      parameters:
        - { name: page, in: query, schema: { type: integer, minimum: 0, default: 0 } }
        - { name: size, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
        - { name: level, in: query, schema: { $ref: '#/components/schemas/Level' } }
      responses:
        '200':
          description: One page of courses
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CoursePage' }
components:
  schemas:
    Level:
      type: string
      enum: [BEGINNER, INTERMEDIATE, ADVANCED]
    CoursePage:
      type: object
      required: [content, page, size, totalElements, totalPages]
      properties:
        content: { type: array, items: { type: object } }
        page: { type: integer }
        size: { type: integer }
        totalElements: { type: integer }
        totalPages: { type: integer }
```

4. Write each decision as a short record, for example: "Context: the client needs a token. Choice: the API signs its own tokens for the capstone. Consequence: no external identity provider to run, but the key must come from the environment and the approach is not for production at scale."
5. Choose the error format now: Problem Details (RFC 9457) with an `errors` map from field name to messages, so the client in stage five can show them next to the inputs. This capstone chooses a field-to-messages map; module 06 used an array of field/message objects, so adapt the client guard and mapper to this explicit contract.
6. Create the Maven project and the Angular workspace folders as empty shells so the layout is fixed: `api/`, `client/`, `docs/`.

## Stretch goals

- Add a `Topic` entity with a many-to-many relationship to courses and describe the change in the contract.
- Add an `ETag` or version field requirement to detect concurrent edits.
- Draw the sequence of a login and a protected request.

## Common mistakes

- Starting with code and writing the contract afterward from whatever the code happens to return. The contract is then an accident, and the client team inherits its inconsistencies.
- Listing wishes instead of requirements. "Fast" cannot be checked; "answers in under 200 ms for 10,000 rows" can.
- Letting the database schema be a side effect of entity classes, so nobody reviews it.
- Choosing a technology without writing down the alternative you rejected and why.

## In practice

Teams call this the design stage even when it takes an afternoon. Its value is cheap disagreement: changing a sentence in `openapi.yaml` costs a minute, while changing an endpoint after an Angular client depends on it costs a day. Contract-first work also lets two people build the API and the client in parallel against the same file.

## Check yourself

1. Which of your requirements would you drop first if time ran out, and which one could you not drop without changing the data model?
2. What does the contract promise that the code could later break, and which stage tests that promise?
3. Which decision in `decisions.md` is hardest to reverse, and why?
