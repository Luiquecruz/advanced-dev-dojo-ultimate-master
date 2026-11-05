# C# Track — Curriculum

13 modules and 66 lessons, all theory + quiz ([06-content-standards.md](06-content-standards.md)).

| Tier | Modules | Lessons |
| --- | --- | --- |
| **Core**: what a backend job needs | 01–11 | 56 |
| **Deepening** | 12 architecture | 5 |
| **Legacy** | 13 .NET Framework and migration | 5 |

Seven of the lessons are practice projects. Each one closes a module and is done locally with the .NET 10 SDK.

The market percentages below come from the convenience sample of 69 postings in [01-market-research.md](01-market-research.md) §6, as "any mention" across both groups. They show what this sample asked for; they are not market statistics.

## Why this order

- **01–04, the language and the runtime, before any framework.** A PHP developer's main gaps are static typing, value versus reference semantics, LINQ and a long-running async runtime.
- **05–06, ASP.NET Core and APIs.** REST/Web API is named in 64% of postings.
- **07, data.** SQL Server appears in 57%, EF Core in 35% and Dapper in 12%. Data comes after APIs, so that the projects have an API to persist.
- **08–09, security and tests, on the API learners already have.** Unit testing appears in 55% and security in 42%.
- **10, background work and messaging.** Messaging appears in 51% and maps directly to Magento queue consumers and cron.
- **11, delivery: Docker, CI/CD, cloud and observability.** Docker appears in 42%, CI/CD in 54% and cloud in 67%. This module closes the core.
- **12, architecture.** SOLID and patterns appear in 54% and microservices in 38%, but this is judgment learned after the mechanics.
- **13, legacy.** Legacy technology appears in 30% of postings. It is a separate tier because it is needed for maintenance and migration roles, not for new code.

## Prerequisites and effort

**Prerequisites for the track.** You can already build HTTP backends in PHP, have used an ORM, a DI container, SQL, Git and a message queue or cron, and read technical English. No C# is assumed.

**Effort assumptions.** The learner studies 8–10 hours a week.
- A theory lesson takes about 25–35 minutes to read and to answer its quiz.
- A project takes 6–12 hours, depending on its size.
- The balta.io courses are optional companions; their hours come from the course pages ([03-balta-catalog.md](03-balta-catalog.md)).
- A learner who watches every mapped course adds about 75 h to the core. That figure is the course pages' own hours summed, plus an estimate for the backend half of Fullstack .NET.

| Tier | Lessons | Projects | Estimate without courses | Weeks at 8–10 h |
| --- | --- | --- | --- | --- |
| Core 01–11 | 56 (6 of them projects) | P1–P6, ≈ 55 h | ≈ 25 h of lessons + 55 h = **≈ 80 h** | 8–10 |
| Deepening 12 | 5 | none | ≈ 3 h | 0.5 |
| Legacy 13 | 5 (1 project) | P7, ≈ 8 h | ≈ 2 h + 8 h = **≈ 10 h** | 1–1.5 |

## Modules

Each module lists:
- **Outcomes**: what the learner can do after it.
- **Done when**: the completion criteria. Every quiz of the module answered correctly in the app, which is recorded in progress, plus the module project's acceptance criteria, where there is one.
- **Courses**: optional balta.io companions, from [03-balta-catalog.md](03-balta-catalog.md).
- **Official**: Microsoft documentation, from [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md).

### 01-platform — The .NET Platform for PHP Developers (core)

| Lesson | Kind | Outcome | Competency (market) |
| --- | --- | --- | --- |
| 01-csharp-map | theory | Explains how the track works (quiz lessons, local projects with the SDK), the PHP-to-.NET map and the three biggest mindset shifts | orientation |
| 02-runtime-sdk-and-cli | theory | Explains the CLR, JIT, SDK versus runtime, `dotnet new/build/run/test` and the solution/project layout | C# 91% |
| 03-versions-and-support | theory | Picks a target framework: LTS versus STS, .NET 10 as the current LTS and what changed since .NET 6/8 | .NET version named 23% |
| 04-nuget-and-project-files | theory | Reads a `.csproj`, adds packages, uses central package management and checks a package's licence | C#, CI/CD |

- **Courses:** Fundamentos do C# (.NET Core 3.1; the CLI concepts still apply).
- **Official:** .NET support policy, `dotnet` CLI, NuGet `PackageReference`.
- **Done when:** the module quizzes are passed.

### 02-language — C# Language Essentials (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-types-and-values | theory | Predicts copy versus reference behavior of structs, classes and strings, and explains boxing | C# |
| 02-nullable-reference-types | theory | Enables and reads nullable warnings and fixes null-state errors | C# |
| 03-classes-records-and-interfaces | theory | Chooses between class, record, struct and interface, and uses properties and access modifiers | C#, SOLID 54% |
| 04-generics-and-delegates | theory | Writes generic types with constraints and uses `Func`/`Action`, lambdas and events | C# |
| 05-pattern-matching-and-modern-csharp | theory | Uses switch expressions, property/list patterns, primary constructors, collection expressions and C# 14 extension members | C# |

- **Courses:**
  - Fundamentos da Orientação a Objetos
  - Aplicando Orientação a Objetos em Projetos Reais com C# 11 e .NET 7 (C# 11; newer syntax in the lessons)
- **Official:** C# language reference and "What's new in C# 14".
- **Done when:** the quizzes are passed.

### 03-collections-linq — Collections and LINQ (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-collections | theory | Chooses `List`, `Dictionary`, `HashSet`, read-only and immutable collections | C# |
| 02-linq-fundamentals | theory | Filters, projects, groups and joins with LINQ method syntax | C#, EF Core 35% |
| 03-deferred-execution-and-iqueryable | theory | Explains deferred execution, multiple enumeration and `IEnumerable` versus `IQueryable` | EF Core |
| 04-project-cli-catalog | project | **P1** console catalog importer | C# |

- **Courses:** Fundamentos do C#. **Gap:** LINQ is not a topic in any balta.io course, so the Microsoft docs are the main material.
- **Official:** LINQ overview, collections.
- **Done when:** the quizzes are passed and P1 is accepted.

### 04-errors-async — Errors, Resources and Async (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-exceptions-and-results | theory | Throws, catches and filters exceptions, and knows when a result type is clearer | C# |
| 02-disposal-and-using | theory | Releases resources with `using`/`await using`, `IDisposable` and `IAsyncDisposable` | async 20% |
| 03-async-await | theory | Writes correct `async` methods and explains `Task` versus `ValueTask` and why `.Result` deadlocks or starves | async 20% |
| 04-cancellation-and-timeouts | theory | Passes a `CancellationToken` through a call chain and sets timeouts | async |
| 05-concurrency-and-the-thread-pool | theory | Avoids sync-over-async and uses `Parallel`, `Channel<T>` and `IAsyncEnumerable` | async, messaging |

- **Courses:** none. **Gap:** async in depth is not covered by balta.io.
- **Official:** asynchronous programming, cancellation, the ASP.NET Core best practices page.
- **Done when:** the quizzes are passed.

### 05-aspnet-core — ASP.NET Core Fundamentals (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-host-and-program | theory | Explains the generic host, `Program.cs` and a long-running process versus PHP-FPM | Web API 64% |
| 02-dependency-injection | theory | Registers services with the right lifetime and spots captive dependencies; compares with `di.xml` | SOLID |
| 03-configuration-and-options | theory | Layers `appsettings` with environment variables and binds validated options; compares with `env.php` | Web API |
| 04-logging | theory | Writes structured logs with `ILogger` and levels | observability 39% |
| 05-middleware-pipeline | theory | Orders middleware and uses endpoint filters; compares with Magento plugins and observers | Web API |

- **Courses:**
  - Fundamentos do ASP.NET 6 (ASP.NET 6; .NET 10 differences in the lessons)
  - Dominando Injeção de Dependência
- **Official:** ASP.NET Core fundamentals, DI, options, logging, middleware.
- **Done when:** the quizzes are passed.

### 06-web-apis — Building Web APIs (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-minimal-apis-and-controllers | theory | Builds endpoints with both styles and picks one (Microsoft recommends minimal APIs for new projects; postings still ask for MVC) | Web API 64%, MVC 23% |
| 02-routing-binding-and-validation | theory | Binds route, query and body data, and validates with .NET 10 minimal-API validation | Web API |
| 03-http-semantics-and-problem-details | theory | Returns correct status codes and RFC 9457 Problem Details, and handles errors globally | Web API |
| 04-openapi-and-versioning | theory | Generates OpenAPI 3.1 with `Microsoft.AspNetCore.OpenApi` and plans API versioning | Web API |
| 05-project-catalog-api | project | **P2** catalog REST API | Web API |

- **Courses:** Fundamentos do ASP.NET 6; Fullstack .NET (.NET 8, backend modules).
- **Official:** minimal APIs, controllers, OpenAPI, error handling.
- **Done when:** the quizzes are passed and P2 is accepted.

### 07-data — Data Access (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-relational-sql-for-dotnet | theory | Connects with `Microsoft.Data.SqlClient`/Npgsql, writes parameterized SQL and knows that `System.Data.SqlClient` is deprecated | SQL Server 57%, PostgreSQL 20% |
| 02-ef-core-basics | theory | Maps entities with a `DbContext` and queries with LINQ translated to SQL | EF Core 35% |
| 03-ef-core-migrations | theory | Creates, reviews and applies migrations; compares with `db_schema.xml` | EF Core |
| 04-tracking-and-performance | theory | Avoids N+1, uses no-tracking queries, projections and split queries | EF Core, query tuning 29% |
| 05-dapper-and-ado-net | theory | Writes Dapper queries and decides when Dapper beats EF Core | Dapper 12% |
| 06-transactions-and-concurrency | theory | Uses transactions and optimistic concurrency tokens | SQL |
| 07-project-catalog-persistence | project | **P3** persist the catalog | EF Core, SQL |

- **Courses:**
  - Fundamentos do SQL Server
  - Acesso à dados com .NET, C#, Dapper e SQL Server
  - Fundamentos do Entity Framework (EF Core 5; concepts still apply)
  - Postgres para devs .NET
  - Dominando Postgres com Entity Framework
- **Official:** EF Core docs, efficient querying, migrations.
- **Done when:** the quizzes are passed and P3 is accepted.

### 08-security — API Security (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-authentication-concepts | theory | Separates authentication from authorization, cookies from tokens, and knows the OAuth 2.0/OIDC roles | auth 16% |
| 02-jwt-bearer | theory | Configures and validates JWT bearer authentication | auth |
| 03-authorization-policies | theory | Writes role, claim and policy-based and resource-based authorization | auth |
| 04-aspnet-core-identity | theory | Uses Identity for users and passwords, knows the limits of `MapIdentityApi` and the passkey support in .NET 10 | auth |
| 05-api-hardening | theory | Applies HTTPS, CORS, rate limiting, secret management and the OWASP API risks | security 42% |

- **Courses:**
  - Segurança em APIs ASP.NET com JWT e Bearer Authentication (.NET 7)
  - Introdução ao ASP.NET Core Identity (old ASP.NET Core era; concepts only)
- **Official:** ASP.NET Core security, authentication, authorization, rate limiting.
- **Done when:** the quizzes are passed.

### 09-testing — Automated Testing (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-unit-testing-with-xunit | theory | Writes xUnit v3 facts and theories with arrange-act-assert | unit testing 55% |
| 02-test-doubles | theory | Uses fakes and mocks with restraint and knows the Fluent Assertions licence change | unit testing |
| 03-integration-tests-with-webapplicationfactory | theory | Tests the HTTP API in memory with `WebApplicationFactory` | integration 13% |
| 04-database-tests-with-testcontainers | theory | Tests against a real database with Testcontainers instead of the in-memory provider | integration |
| 05-project-secure-and-test-the-api | project | **P4** secure and test the catalog API | security, testing |

- **Courses:** Refatorando para testes de unidade; Modelando Domínios Ricos. **Gap:** integration testing and named frameworks are not covered by balta.io.
- **Official:** testing in .NET, integration tests in ASP.NET Core, the EF Core testing strategy.
- **Done when:** the quizzes are passed and P4 is accepted.

### 10-background-messaging — Background Work and Messaging (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-hosted-services | theory | Writes a `BackgroundService` that creates a scope per unit of work; compares with Magento cron and queue consumers | background jobs 13% |
| 02-scheduling-with-hangfire-and-quartz | theory | Picks between a hosted service, Hangfire and Quartz.NET for scheduled jobs | background jobs |
| 03-message-brokers | theory | Explains queues, topics and partitions in RabbitMQ, Kafka and Azure Service Bus | messaging 51% |
| 04-reliable-messaging | theory | Designs for at-least-once delivery: idempotent consumers, retries, dead letters, the outbox; knows the MassTransit v9 licence | messaging |
| 05-project-order-worker | project | **P5** order processing worker | messaging |

- **Courses:** Fundamentos do Event-Driven Architecture. **Gap:** brokers and background services are not covered in depth by balta.io.
- **Official:** hosted services, Worker Service.
- **Done when:** the quizzes are passed and P5 is accepted.

### 11-delivery — Containers, CI/CD, Cloud and Observability (core)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-docker-for-dotnet | theory | Writes a multi-stage Dockerfile and uses SDK container publish, chiseled images and non-root port 8080 | Docker 42% |
| 02-ci-cd-pipelines | theory | Builds, tests and publishes with the `dotnet` CLI in GitHub Actions and Azure DevOps | CI/CD 54%, Azure DevOps 25% |
| 03-cloud-hosting | theory | Compares Azure App Service and Container Apps with AWS options for a .NET API | cloud 67% |
| 04-observability | theory | Adds OpenTelemetry traces and metrics, structured logs and health checks | observability 39% |
| 05-aspire | theory | Uses Aspire for local orchestration and knows its support model | observability, cloud |
| 06-project-ship-it | project | **P6** containerize, pipeline and observe | Docker, CI/CD |

- **Courses:**
  - Docker para devs .NET
  - Fundamentos do Azure, Git, GitHub e DevOps
  - Fundamentos do Git e Azure DevOps
  - Azure para devs .NET
  - Monitorando Aplicações com Application Insights
- **Official:** containerize a .NET app, OpenTelemetry in .NET, health checks, Aspire.
- **Done when:** the quizzes are passed and P6 is accepted.

### 12-architecture — Application Architecture (deepening)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-layered-and-clean-architecture | theory | Organizes a solution in layers or Clean Architecture and knows its cost | Clean/Hexagonal 12%, SOLID 54% |
| 02-vertical-slices-and-modular-monoliths | theory | Compares feature slices and modules with layers | architecture |
| 03-domain-driven-design-essentials | theory | Uses entities, value objects, aggregates and domain events where they pay off | DDD 10% |
| 04-cqrs-mediator-and-licensing | theory | Applies CQRS without a library and knows the MediatR/AutoMapper licence change | CQRS 13% |
| 05-microservices-trade-offs | theory | Decides between a monolith and microservices using concrete criteria | microservices 38% |

- **Courses:**
  - Arquitetura Limpa com .NET (.NET 9)
  - Arquitetura Limpa na prática
  - Dominando Mediator
  - Modelando Domínios Ricos
  - Fundamentos dos Microsserviços
- **Official:** common web application architectures, the .NET microservices guide (its .NET 7 era is noted).
- **Done when:** the quizzes are passed.

### 13-legacy — Legacy .NET and Migration (legacy)

| Lesson | Kind | Outcome | Competency |
| --- | --- | --- | --- |
| 01-net-framework-landscape | theory | Explains .NET Framework 4.8.x support (it follows the Windows lifecycle) and what "legacy .NET" means in a posting | legacy 30% |
| 02-aspnet-mvc5-and-web-api-2 | theory | Reads `System.Web` code: `Global.asax`, `web.config`, MVC 5 and Web API 2 | legacy |
| 03-web-forms-and-wcf | theory | Reads Web Forms and WCF services and knows CoreWCF and the WCF client on .NET 10 | legacy |
| 04-migration-strategies | theory | Plans an incremental migration with the Strangler Fig pattern (YARP and System.Web adapters), and knows that Upgrade Assistant is deprecated in favor of the Copilot modernization agent | migration 13% |
| 05-project-legacy-migration | project | **P7** migrate one endpoint incrementally | migration |

- **Courses:**
  - Migrando para o .NET 7 e C# 11 (migration concepts)
  - Uma visão completa do ASP.NET MVC and APIs Web com ASP.NET MVC (both carry balta.io's legacy banner; for reading classic code)
- **Gap:** WCF and Web Forms have no course.
- **Official:** porting from .NET Framework, incremental ASP.NET migration, CoreWCF.
- **Done when:** the quizzes are passed and P7 is accepted.

## Practice projects

Each project builds on the previous one, without extra architecture. Acceptance is checked by the learner on their own machine.

| # | Lesson | Builds | Features | Acceptance criteria | Effort |
| --- | --- | --- | --- | --- | --- |
| P1 | 03/04 | Console catalog importer | Read a CSV of products (SKU, name, price, stock), validate rows, report with LINQ (totals, top 5 by stock value, invalid rows) | `dotnet run -- products.csv` prints the report; invalid rows are listed with line numbers and do not stop the import; `dotnet test` covers the parser | 6 h |
| P2 | 06/05 | Catalog REST API | CRUD over products in memory, filtering and paging, validation, Problem Details, OpenAPI | `GET /products?page=2` returns paged JSON; an invalid body returns 400 with field errors; an unknown SKU returns 404 Problem Details; `/openapi/v1.json` documents every endpoint | 8 h |
| P3 | 07/07 | Persistence | EF Core with PostgreSQL or SQL Server, migrations, a Dapper read query for the report, optimistic concurrency on stock | `dotnet ef database update` creates the schema; concurrent stock updates return 409 for the loser; the report query issues one SQL statement | 10 h |
| P4 | 09/05 | Secured and tested API | JWT bearer auth, an `admin` policy for writes, rate limiting; unit tests, `WebApplicationFactory` tests, a Testcontainers database test | Anonymous writes return 401, a non-admin gets 403; `dotnet test` runs all three test kinds; nothing uses the EF in-memory provider | 10 h |
| P5 | 10/05 | Order processing worker | The API publishes an `OrderPlaced` message to RabbitMQ (or Service Bus); a worker consumes it idempotently and reserves stock | Publishing the same message twice reserves stock once; a poison message lands in the dead-letter queue after N retries; the worker uses one DI scope per message | 12 h |
| P6 | 11/06 | Ship it | A container image for the API and the worker, a CI pipeline (build, test, publish image), OpenTelemetry traces across API → broker → worker, health checks | The pipeline is green on a pull request; `docker compose up` starts everything; one trace shows the HTTP request and the worker span; `/health` reports the database | 9 h |
| P7 | 13/05 | Legacy migration kata | Starting from a small ASP.NET MVC 5 or Web API 2 sample, route one endpoint to a new ASP.NET Core app behind YARP, sharing session or auth where needed | Clients call one host; the migrated endpoint is served by the ASP.NET Core app and the rest by the old app; a test proves both answer | 8 h |

## Traceability: competency → content → check

| Competency (sample share) | Lessons | balta.io companion | Check |
| --- | --- | --- | --- |
| C# language (91%) | 01/02–04, 02/*, 03/01–03 | Fundamentos do C#; Fundamentos da Orientação a Objetos | quizzes 01–03, P1 |
| Web API/REST (64%), MVC (23%) | 05/*, 06/01–04 | Fundamentos do ASP.NET 6; Fullstack .NET | quizzes 05–06, P2 |
| SQL Server (57%), PostgreSQL (20%) | 07/01, 07/06 | Fundamentos do SQL Server; Postgres para devs .NET | quiz 07, P3 |
| EF Core (35%), Dapper (12%) | 03/03, 07/02–05 | Fundamentos do Entity Framework; Acesso à dados … Dapper | quiz 07, P3 |
| Unit testing (55%), integration testing (13%) | 09/* | Refatorando para testes de unidade | quiz 09, P4 |
| Security/auth (42% / 16%) | 08/* | Segurança em APIs … JWT | quiz 08, P4 |
| Async/concurrency (20%) | 04/02–05 | none (gap) | quiz 04, P5 |
| Messaging (51%), background jobs (13%) | 10/* | Fundamentos do Event-Driven Architecture | quiz 10, P5 |
| Docker (42%), Kubernetes (22%) | 11/01, 11/03 | Docker para devs .NET | quiz 11, P6 |
| Cloud (67%: Azure 42%, AWS 35%) | 11/03, 11/05 | Azure para devs .NET | quiz 11 |
| CI/CD (54%), Azure DevOps (25%) | 11/02 | Fundamentos do Azure, Git, GitHub e DevOps; Fundamentos do Git e Azure DevOps | quiz 11, P6 |
| Observability (39%) | 05/04, 11/04 | Monitorando Aplicações com Application Insights | quiz 11, P6 |
| SOLID/patterns (54%), Clean Architecture (12%), DDD (10%), CQRS (13%) | 02/03, 12/01–04 | Arquitetura Limpa com .NET; Modelando Domínios Ricos; Dominando Mediator | quiz 12 |
| Microservices (38%) | 12/05 | Fundamentos dos Microsserviços | quiz 12 |
| Legacy .NET (30%), migration (13%) | 13/* | Migrando para o .NET 7 e C# 11; Uma visão completa do ASP.NET MVC | quiz 13, P7 |
| .NET versions and support (23%) | 01/03 | Migrando para o .NET 7 e C# 11 | quiz 01 |
| English (20%; 34% international) | Every lesson is in English, and 01/01 says so | none | not graded |

Not covered on purpose: frontend frameworks (Angular/React, 22% each) and Blazor (0% in the sample). These are other tracks or are not backend. AI-assisted development (29%) is the subject of the AI Engineering track.
