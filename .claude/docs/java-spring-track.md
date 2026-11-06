# Java and Spring Boot track

The `java-spring` track teaches Java and backend API development independently from the Angular track. The owner chose separate Java/Spring and Angular learning paths; a future Full Stack track may connect them. This track uses theory, quizzes and local projects, with no graded browser challenges and no Java engine. The first five modules are merged; the backend-only continuation is being reviewed. See [java-spring-handoff.md](java-spring-handoff.md) for current PRs and evidence.

## Scope and versions

| Decision | Choice |
| --- | --- |
| Track identity | `java-spring`, titled Java and Spring Boot; Java remains its short title |
| Audience | Beginners start at required module 01; no prior language or Angular knowledge is required |
| Versions | Java 25, Spring Boot 4 on Spring Framework 7; projects pin their dependencies |
| Practice | Theory, quizzes and local JDK projects; Maven starts in module 03 |
| Catalog engine | Retain the existing `angular` metadata value; without challenges no browser engine starts |
| Publication | Hidden until its own content, accent and release checks pass; independent from the Angular flag |
| Angular | The existing Angular track owns framework fundamentals, state, forms, routing and frontend tests |
| Future Full Stack | End-to-end client/API contracts, Angular integration, authentication flows and joint delivery; deferred |

The earlier combined draft, inspired in part by the Spring/Angular course-catalog reference material, remains on `archive/java-angular-fullstack`. Its frontend lessons are preserved for future reuse. The backend lessons are authored from scratch and cite official documentation.

## Curriculum

| Module | Focus | Lessons |
| --- | --- | --- |
| 01 Java from Zero | First program, values, control flow, methods, strings and arrays, objects, exceptions and a command-line to-do project | 8 |
| 02 The Java Language | Records, enums, sealed types, generics, collections, streams, exceptions, concurrency, packages and a library project | 8 |
| 03 Build and Tests | Maven, JUnit Jupiter, Mockito, Spring test slices, Testcontainers, quality tools and a tested-service project | 7 |
| 04 Spring Boot Core | Dependency injection, auto-configuration, profiles, REST, Jakarta Validation, Problem Details, OpenAPI and an API project | 8 |
| 05 Persistence | JPA, repositories, relationships, transactions, fetching, paging, migrations, soft delete and persistence project | 8 |
| 06 Security | Authentication and authorization, filter chains, sessions and tokens, JWT resource servers, CSRF/CORS, method security and a secure API project | 7 |
| 07 Quality and Delivery | Backend test strategy, Docker, Compose, CI, observability, caching and rate limiting, operations and API delivery project | 8 |
| 08 Capstone: Course Catalog API | Requirements and API contract, implementation, persistence, security, review and delivery | 5 |

The completed target is eight consecutive required modules and 59 lessons. It contains no Angular-client module, frontend-authentication lesson or Angular capstone stage. API boundaries, HTTP, CORS and consumer contracts remain backend topics; teaching a frontend framework does not.

## Content standards

`src/verify/java-spring.test.ts` enforces the no-challenge decision using the shared [System Design content standards](system-design-track.md). Each lesson contains `theory.md`, `concepts.json`, `quiz.json` and `meta.json`.

- English, American spelling, no dated claims or bridges from other programming languages. State Java and Spring versions when behavior depends on them.
- Theory: one introduction paragraph, an exact-title `You need:` line naming only earlier lessons, concept sections with correct examples, `Common mistakes`, `In practice` and `Check yourself`. Module 01 uses 300–1,000 words; later modules use 500–1,300.
- Quizzes: five or six scenarios, four distinct options, one defensible answer, spread answer indexes and useful explanations. Concepts have four to eight definitions.
- Resources: two to six official first-party links, verified for HTTP 200 without a cross-host redirect.
- Every module closes with a local project. Specify the JDK version and, only when needed, the Maven version. Use fake credentials in examples.
- Add every written lesson as a checked row in CURRICULUM.md and keep README counts accurate. Compile and run representative snippets, including negative cases for the behavior being taught.

## Review and delivery

Keep one reviewable PR per module, below 300 changed files. Research behavior against official docs, validate examples and quiz answers, read all review comments including findings outside the diff, fix valid findings and answer each one. After every fix rerun the four unfiltered content suites, eslint, typecheck and docs sync. Merge bottom-up only after current-commit CI and review complete, with no unresolved findings. Retarget a child to main before merging its parent, retain branches, merge main into the next branch and recheck it.

After the modules, review prerequisites, API contracts, project continuity, links, counts and the handoff together. Publishing the track, changing accent colors or enabling Angular remains a separate owner release decision.
