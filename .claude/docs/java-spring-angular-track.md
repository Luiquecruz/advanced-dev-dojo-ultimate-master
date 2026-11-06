# Java, Spring Boot and Angular track (plan)

Plan of the `java-spring-angular` track. Nothing is written yet: the track needs the engine decision below before any challenge is written, and it stays hidden (`TRACK_FLAGS`) until its last part ships. The content standards are the ones of [system-design-track.md](system-design-track.md) (theory template, quizzes, official resources, no dates, no language bridges, `You need:` lines, same test names in every language) plus the rules in "Content standards" here.

## Sources

The learning path follows the shape of the Spring Boot plus Angular material of Loiane Groner (her YouTube channel, loiane.training and the `loiane/crud-angular-spring` project) and the official documentation of each piece; lessons are written from scratch and cite official documentation only. The reference project shows the stack a learner meets in practice:

| Piece | In the reference project |
| --- | --- |
| Java | 25 |
| Back end | Spring Boot 4 on Spring Framework 7, Maven, JPA with Hibernate, Jakarta Validation (custom validators), Java records as DTOs, controller, service and repository layers, a has-many relationship, soft delete, transactional services with Open Session in View off, RFC 7807 Problem Details, springdoc OpenAPI |
| Back-end tests | JUnit 5, Mockito, Testcontainers for integration tests, JaCoCo |
| Front end | Angular 22 with Angular Material, standalone components, lazy `loadComponent` routes, signals and `httpResource`, zoneless change detection, built-in control flow, Signal Forms, smart and presentational components |
| Front-end tests | Karma and Jasmine |
| Not covered by that project | security, caching, throttling, profiling, a Docker build |

The track adds what the reference project leaves out (Spring Security, observability, delivery) because a production back end needs it.

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Track id | `java-spring-angular` | Folder and route slug. |
| Audience | Developers who know one language; module 00 teaches Java from zero | Under option B (a Java engine) module 00 is optional like the Python and C# ones: its last lesson is the skip test and one earlier lesson has a challenge (`src/verify/content.test.ts`), and it counts toward progress once a challenge lesson is complete. Under option A it has no challenge, so it cannot be optional by those rules: it is a required first module (numbered 1), unless the owners extend verification and progress tracking to allow an optional quiz-only module. |
| Versions pinned | Java 25 (LTS), Spring Boot 4, Angular 22 | The versions the reference project and the Angular engine share. |
| Angular part | Reuses the Angular engine; fundamentals link to the Angular track and are not repeated | The platform already teaches Angular 22 (zoneless, signals, Signal Forms); this track teaches the integration with a Spring back end. **Release gate:** the Angular track is hidden today (`TRACK_FLAGS`), and a link to a hidden track opens a missing page, so this track stays hidden until the Angular track is shown; if Angular stays hidden, module 05 carries its own short Angular fundamentals instead of links. |
| Java and Spring challenges | **Open: see "Engine decision"** | There is no Java engine in the browser. |

## Engine decision

A real Spring Boot application needs a full JVM, Maven dependencies and a server socket, so it cannot run in a browser. What can run is Java the language, if an engine exists. Options:

| Option | What learners get | Cost and risk |
| --- | --- | --- |
| **A. No Java engine** (recommended start) | Java and Spring Boot lessons are theory and quizzes plus practice projects built locally with the JDK, like the C# track's projects; the Angular lessons have graded challenges on the Angular engine | Nothing to build; Java is not graded in the browser. |
| **B. CheerpJ** (a WebAssembly JVM that can run `javac`) | Graded Java challenges in the browser for the language modules, still no Spring | Proprietary. Its Community licence is free with a "Built with CheerpJ" credit for individuals, one-person companies and non-commercial open-source projects; an organization needs a paid licence (a Small Business plan starts at 100 GBP per developer per month, plus 5,000 GBP a year to self-host). Compilation is slow, the download is large, and the lock-down and verification work of the Python and C# engines would be repeated. |
| **C. TeaVM or a Java-subset interpreter** | A restricted Java | TeaVM compiles ahead of time, so it cannot compile learner code in the browser; an interpreter is a large project and drifts from real Java. |

The licence question for B is a decision for the project owners, because the free terms depend on who runs the site and whether it earns money; the vendor must confirm the case. Until then the plan assumes A, which does not block any lesson: a Java engine can be added later, lesson by lesson, as the C# track did.

## Curriculum

`(c)` marks a lesson with a graded challenge in the first release (Angular engine only under option A); `(q)` is theory and quiz.

| Module | Lessons |
| --- | --- |
| **00 Java from zero** (optional only under option B; a required first module under option A) | values and variables, decisions and loops, methods, text and arrays, classes and objects, errors and exceptions, tests with JUnit; the last lesson is the skip test |
| **01 The Java language** | records, enums and sealed types, interfaces and generics, collections, streams and `Optional`, exceptions in depth, concurrency basics, modules and packages |
| **02 Build and tests** | Maven and the project layout, JUnit 5, Mockito, test slices, Testcontainers |
| **03 Spring Boot core** | inversion of control and dependency injection, auto-configuration, configuration and profiles, REST controllers, Jakarta Validation, error handling with Problem Details, OpenAPI with springdoc |
| **04 Persistence** | JPA and Hibernate, repositories, relationships, transactions, the N+1 problem, pagination, database migrations, soft delete, Open Session in View |
| **05 Angular with a Spring back end** (c) | `HttpClient` and `httpResource`, mapping Problem Details to Signal Forms errors, pagination and sorting, route guards, CORS, a typed client generated from OpenAPI, smart and presentational components |
| **06 Security** | Spring Security filter chain, sessions versus tokens, JWT and OAuth 2 resource servers, CSRF and CORS, method security, Angular interceptors and guards |
| **07 Quality and delivery** | the test pyramid for both ends, Docker and Compose, CI, Actuator and Micrometer, caching, rate limiting, production configuration |
| **08 Capstone** | a full-stack course catalog: Spring API with persistence, security and tests, and an Angular client |

Module 05 is the only graded one under option A. Option B would add Java challenges to modules 00 to 02.

## Content standards

- Same standards as [system-design-track.md](system-design-track.md): no dates, no changelog, no bridges from other languages, official resources only, `You need:` lines naming earlier lessons by exact title, quizzes with scenario questions.
- A fact about Spring Boot 4, Spring Framework 7, Java 25 or Angular 22 is checked against the project's own documentation and states the version it applies to.
- Practice projects are described in the closing lesson of a module and built locally; the lesson says which JDK and Maven versions to install.
- Security lessons never show a real secret; fake credentials appear in code fences only.

## Pipeline

Research, this plan, owner decision on the engine, then module by module: write, independent review (facts against official documentation, wrong implementations for every challenge), final whole-track review, stacked pull requests under 300 files each, CodeRabbit until it has no open comment, merge bottom-up without deleting a base branch before the next pull request is retargeted.
