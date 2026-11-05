# balta.io catalog for a C#/.NET backend track

Research date: **2026-11-05**. Research only; nothing here is a decision.

## Method and limits

| Item | Status |
| --- | --- |
| Chrome DevTools MCP | Connected to the user's browser, but no balta.io tab was open (open tabs: an unrelated job site, a localhost app, Gmail sign-in, two blank tabs). The browser was not used. |
| How data was collected | Plain HTTP GET of public pages (no cookies, no login): course listing `https://balta.io/courses?page=1..4`, career list `https://balta.io/paths`, formation list `https://balta.io/formations`, each career page with `?tab=content`, and 43 course pages (overview tab and `?tab=content`). |
| Logged-in content | Not accessed. Videos, exercises, quizzes, source repositories and instructor tabs: **not available**. |
| Lesson lists | **Verified**: the `?tab=content` tab is public and lists every module and lesson title with its duration. |
| Dates | **Not available**. No course page shows a publication or update date. The only date on any page is ".NET 8 (Lançado em 14/11/2023)" on the Blazor .NET 8 course. The listing offers "Data de Atualização" in the sort menu, but the only sort links in the HTML are `sort=sort_order`, `sort=title`, `sort=published`; `sort=published` returns the same order as the default listing, so the catalog order below is **relative publication order (newest first)**, not a date. |
| Version per course | Taken from the course page's "Suporte e versões" / "Tecnologias e versões utilizadas" section or the title. When absent: "not shown". Inferences are marked *(inferred)*. |
| Prices | At research date the pages showed a Black Friday banner and "R$ 1.472,28 · Plano Premium Anual" on every course/career/formation page. Not analysed further. |
| Catalog size | 82 courses on 4 listing pages (24+24+24+10), 10 careers, 2 formations. |

Reference for "current vs outdated": .NET support policy, https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core (opened 2026-11-05): .NET 10 LTS (released 2025-11-11, supported to 2028-11-14) is the only generally available supported version after **2026-11-10**, when .NET 8 LTS and .NET 9 STS both reach end of support. On that same date .NET 11 launches: the page lists ".NET 11 RC3" as a go-live release (2026-10-25, support to 2026-11-10) and a banner "Join us November 10-13 to celebrate the launch of .NET 11". The page does not state its support type; by the cadence it describes (odd-numbered releases are STS) it is STS *(inferred)*, and it pairs with C# 15 *(inferred, not on that page)*. .NET 7, 6, 5, Core 3.1, 3.0, 2.x are out of support. So every balta.io backend course is recorded on an out-of-support or about-to-expire version; none shown uses .NET 10 or .NET 11.

## Formations and careers (verified)

Formation page: https://balta.io/formations/formacao-dotnet. Career pages: `https://balta.io/paths/<slug>` (content listed with `?tab=content`).

| Title (exact) | URL slug | Level | Workload | Students shown | Contents (in page order) |
| --- | --- | --- | --- | --- | --- |
| Formação .NET | formations/formacao-dotnet | Intermediário | 146h 31m | 33796 | the 8 careers below: .NET Developer Fundamentals, .NET Data Access, ASP.NET/Blazor Developer, DevOps, Advanced .NET Developer, Software Architecture, Soft Skills, Inteligência Artificial |
| .NET Developer Fundamentals | paths/dotnet-fundamentals | Iniciante | 16h 17m | 25948 | Fundamentos do C#; Fundamentos da Orientação a Objetos |
| .NET Data Access | paths/dotnet-data-access | Iniciante | 17h 10m | 4624 | Fundamentos do SQL Server; Acesso à dados com .NET, C#, Dapper e SQL Server; Fundamentos do Entity Framework; Postgres para devs .NET; Dominando Postgres com Entity Framework; Dominando Repository Pattern |
| ASP.NET/Blazor Developer | paths/aspnet-blazor-developer | Iniciante | 45h 57m | 7670 | Fundamentos do ASP.NET 6; Fundamentos do HTML e CSS; Sites Responsivos; Uma visão geral sobre o ASP.NET Razor Pages; Fundamentos do Blazor Server; Fundamentos do Blazor Web Assembly; Fundamentos do Blazor com .NET 8; Progressive Web Apps com Blazor Web Assembly; Fullstack .NET |
| DevOps | paths/devops | Intermediário | 9h 35m | 2556 | Fundamentos do Azure, Git, GitHub e DevOps; Azure para devs .NET; Docker para devs .NET |
| Advanced .NET Developer | paths/advanced-dotnet-developer | Avançado | 19h 2m | 9496 | Modelando Domínios Ricos; Refatorando para testes de unidade; Aplicando Orientação a Objetos em Projetos Reais com C# 11 e .NET 7; Dominando Injeção de Dependência; Segurança em APIs ASP.NET com JWT e Bearer Authentication; Dominando Mediator |
| Software Architecture | paths/software-archtecture (sic) | Avançado | 14h 13m | 3120 | Fundamentos do Event-Driven Architecture; Aplicações Mult-Tenant com Entity Framework Core; Fundamentos dos Microsserviços; Arquitetura Limpa com .NET; Arquitetura Limpa na prática |
| Inteligência Artificial | paths/ia | Intermediário | 19h 56m | 638 | Uma visão geral da IA Generativa; Fundamentos da IA Generativa para devs .NET; IA Generativa para devs .NET; Fundamentos do Microsoft Agent Framework; Implementando Agentes com Microsoft Agent Framework; Integrando Agentes de IA a sua solução |
| Soft Skills | paths/soft-skills | Iniciante | 4h 21m | not opened | not opened (non-technical) |
| Matemática para IA e Programação / Fundamentos da Computação | paths/matematica-para-ia-e-programacao, paths/fundamentos-da-computacao | Iniciante | 226h 38m / 129h 39m | not opened | interactive books, out of scope |

Career and formation overview tabs carry no prerequisite list; the order of courses on the content tab is the only sequencing signal.

## Course catalog (backend-relevant, verified on the page)

URL = `https://balta.io/courses/<slug>`. "Pub. rank" = position in the newest-first listing (1 = newest, 82 = oldest). Lessons = count of lesson titles on the content tab. "Legacy banner" = the page shows "⚠ Este é um curso legado ⚠" and names a replacement.

### Current-generation courses (no legacy banner)

| # | Title (exact) | Slug | Level | Workload | Lessons | Pub. rank | Version on page | Prerequisites on page | Modules (lesson count) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fundamentos do C# | fundamentos-csharp | Iniciante | 12h 9m | 148 | 48 | ".NET Core 3.1 LTS", VS Code | for beginners and devs from other languages | Linguagens e Compiladores (7); C# (6); Frameworks (9); .NET (9); Linguagem de Programação com C# (45); 4 "Mão na massa" console projects (35); Strings (10); Datas (10); Moedas (4); Arrays (5); Exceptions (7) |
| 2 | Fundamentos da Orientação a Objetos | fundamentos-orientacao-objetos | Iniciante | 4h 8m | 44 | 45 | "C#" (no version) | beginners; devs from Java/TypeScript | Fundamentos (27: encapsulation, abstraction, inheritance, polymorphism, interfaces, abstract classes, upcast/downcast, delegates, events, generics, lists/IEnumerable/IList); Mão na massa (17) |
| 3 | Aplicando Orientação a Objetos em Projetos Reais com C# 11 e .NET 7 | aplicando-orientacao-a-objetos-em-projetos-reais-com-csharp-11-e-dotnet-7 | Intermediário | 2h 15m | 36 | 31 | ".NET 7 e C# 11" | "já tem conhecimento em .NET" | Modelando o Domínio (23: value objects, nullables, source generators, implicit operators, extension methods, exceptions); Testes de Unidade (11: DataRow, Expected Exception); Exercícios e Avaliação (2) |
| 4 | Migrando para o .NET 7 e C# 11 | migrando-dotnet-7-csharp-11 | Intermediário | 2h 29m | 38 | 34 | ".NET 7 e C# 11", migration from .NET 5/6, .NET Core 1–3, ".NET Framework (3.5, 4.0, 4.5 e 4.8)" | "um certo pré-requisito" (not detailed) | Instalação e versões (9: quando/por que migrar, estratégias, planos de migração); Novidades do C# 11 (12); Novidades do .NET 7 (10); Novidades do ASP.NET 7 (7: Output Cache, Minimal APIs description) |
| 5 | Dominando Injeção de Dependência | dominando-injecao-de-dependencia | Intermediário | 2h 31m | 44 | 35 | not shown | not shown | Fundamentos (15: DI, IoC, DIP); DI, IoC e DIP na prática (6); Resolvendo Dependências (20: AddTransient/AddScoped/AddSingleton, Program.cs, HttpContext); Perguntas e Exercícios (3) |
| 6 | Fundamentos do ASP.NET 6 | fundamentos-aspnet | Intermediário | 7h 44m | 90 | 38 | title: ASP.NET 6 (no "Suporte e versões" section); contains a module "ASP.NET 5 (Migração)" | not shown | Introdução e Minimal APIs (11); MVC (12); CRUD e Entity Framework (20: versioning, async/await); Autenticação e Autorização (16: JWT, claims, DI lifetimes, password storage); Configuração (9: appsettings, e-mail, upload); Performance (7: paginação, cache, compressão); ASP.NET 5 (Migração) (5); Ambientes e Documentação (10: launchSettings, HTTPS, OpenAPI) |
| 7 | Segurança em APIs ASP.NET com JWT e Bearer Authentication | seguranca-apis-aspnet-jwt-bearer | Intermediário | 4h 50m | 67 | 27 | ".NET 7 e 11 do C#" | "conhecimentos sólidos em ASP.NET, .NET e C#" | Conceitos de Segurança (8: token storage, JWT, refresh token); JWT e Bearer na Prática (16: claims, policies, "Hackeando o Token"); Criando um Sistema de Login (43: use cases, Mediator, repository, roles) |
| 8 | Fundamentos do Entity Framework | fundamentos-entity-framework | Iniciante | 4h 29m | 52 | 39 | ".NET 5", "Entity Framework Core 5.0.9", SQL Server via Docker | "É importante ter alguma experiência com C# e SQL ou fazer estes cursos da nossa carreira Backend .NET antes de prosseguir" | Introdução (17: DbContext, DbSet, CRUD, AsNoTracking); Operações Básicas (11: DataAnnotations, FluentMapping, Include); Mapeamento (11: 1-N, N-N, índices); Migrações (5); Performance e Outros (8: async/await, eager vs lazy, paginação, raw queries/views) |
| 9 | Acesso à dados com .NET, C#, Dapper e SQL Server | acesso-dados-csharp-net-dapper-sql-server | Iniciante | 5h 9m | 54 | 43 | not shown (uses Microsoft.Data.SqlClient) | not shown | Introdução (8: ADO.NET, SqlConnection/SqlCommand/SqlDataReader); Dapper (7: SQL injection, SqlParameter); Imersão (13: procedures, views, 1-1, 1-N, QueryMultiple, transactions); Mão na massa (20: Dapper.Contrib, repositories); Desafio (6) |
| 10 | Fundamentos do SQL Server | fundamentos-sql-server | Iniciante | 2h 58m | 40 | 44 | not shown | not shown | Introdução e Fundamentos (29: DDL, constraints, keys, indexes, joins, group by); Mão na Massa (11: backup/restore, queries) |
| 11 | Postgres para devs .NET | postgres-para-devs-dotnet | Iniciante | 1h 10m | 11 | 9 | not shown | not shown | event recording (11: install, ASP.NET Identity tables, indexes/constraints, functions, triggers, procedures, views) |
| 12 | Dominando Postgres com Entity Framework | dominando-postgres-com-entity-framework | Iniciante | 1h 39m | 15 | 8 | not shown ("EF Core (Npgsql)") | not shown | event recording (15: migrations, advanced mapping, value objects, JSON/JSONB, localization, Identity mapping, Docker Compose) |
| 13 | Dominando Repository Pattern | dominando-repository-pattern | Intermediário | 1h 45m | 18 | 19 | "versão 90 do .NET e 13 do C#" (sic; C# 13 ships with .NET 9 *(inferred: .NET 9)*) | not shown | Implementação (11: EF, migrations); Arquitetura Limpa (7) |
| 14 | Dominando Mediator | dominando-mediator | Intermediário | 2h 55m | 29 | 17 | "versão 90 do .NET e 13 do C#" (sic, *(inferred: .NET 9)*) | not shown | Fundamentos (9: design patterns, CQS/CQRS); Implementação (8: own Mediator implementation); Publicação (12: includes GitHub Actions) |
| 15 | Modelando Domínios Ricos | modelando-dominios-ricos | Iniciante | 4h 29m | 22 | 37 | "C#" (no version) | not shown | Introdução (22: SOLID, entities/VOs, commands, handlers, repository, tests) — payment gateway domain with OOP, DDD, CQRS |
| 16 | Refatorando para testes de unidade | refatorando-para-testes-de-unidade | Intermediário | 2h 2m | 40 | 68 | "C#" (no version) | not shown | Modelando o Domínio (7); Validações (3); Testando as Entidades (14); Testando Queries (6); Commands (4); Handlers (5: mocking repositories) — legacy order system refactored to testable code |
| 17 | Arquitetura Limpa com .NET | arquitetura-limpa | Avançado | 6h 56m | 92 | 21 | ".NET 9 e 13 do C#" | "conhecimentos sólidos em .NET" | Arquitetura de Software (9: Clean, Vertical Slice, DDD); SOLID (16); Domain Driven Design (18: bounded contexts, ACL, aggregates, domain events); Arquitetura Limpa (7); CQS e CQRS (4); Context Map do Projeto (4); Modelando Domínios Ricos (33: tests, Mediator, repository) |
| 18 | Arquitetura Limpa na prática | arquitetura-limpa-na-pratica | Avançado | 2h 7m | 23 | 15 | ".NET 9 e 13 do C#" | "conhecimentos sólidos em .NET" | Gravação (23: domain events, use cases, CQRS, Result Pattern, FluentValidation, specification pattern) |
| 19 | Fundamentos dos Microsserviços | fundamentos-microsservicos | Intermediário | 2h | 24 | 42 | not shown (conceptual) | not shown | Fundamentos (24: size, culture, monolith, DDD, storage, transactions, communication, contracts, circuit breaker/retry, gateway, security, scale, monitoring) |
| 20 | Fundamentos do Event-Driven Architecture | fundamentos-event-driven-architecture | Intermediário | 1h 56m | 23 | 40 | not shown | not shown | Event-Driven Architecture (15: messages/events/commands, event storming); Kafka e EDA (8: broker, Zookeeper, Kafka via Docker, Confluent Cloud, produce/consume) |
| 21 | Aplicações Mult-Tenant com Entity Framework Core | aplicacoes-mult-tenant-entity-framework-core | Avançado | 1h 14m | 12 | 41 | not shown | not shown | Imersão (12: database-per-tenant, dynamic connection string, multi-tenant with EF Core) |
| 22 | Docker para devs .NET | docker-para-devs-dotnet | Iniciante | 1h 12m | 6 | 11 | not shown | ".NET developers" learning Docker from zero | event recording (6: concepts, components, images, Docker Compose, publication) |
| 23 | Azure para devs .NET | fundamentos-azure-devs-dotnet | Iniciante | 1h 23m | 17 | 13 | not shown | not shown | event recording (17: service models, regions, Azure CLI, resource groups, App Services, Static Web Apps, scale up/out) |
| 24 | Fundamentos do Azure, Git, GitHub e DevOps | fundamentos-azure-git-github-devops | Intermediário | 7h | 101 | 36 | not shown | not shown | Git e Github (26); Nuget e GitHub Packages (25: CI/CD, GitHub Actions, secrets, NuGet push); Azure (32: hosting, domains, SSL, connection strings); Real-World (17) |
| 25 | Fundamentos do Git e Azure DevOps | fundamentos-git-azure-devops | Iniciante | 1h 14m | 10 | 47 | "VS Code, Git" + Azure account | Azure portal account | Controle de versão (4); Pipeline (3: build and release pipelines); Azure Boards (1); Integração (1) |
| 26 | Fullstack .NET | fullstack-dotnet | Intermediário | 22h 45m | 234 | 23 | ".NET 8 e 12 do C#" plus a final module "Migração para .NET 9 e MudBlazor 7" | "conhecimentos sólidos em ASP.NET, .NET e C#" | 20 modules incl. Fundamentos dos Minimal APIs (6); Documentação da API (3); Entity Framework (13); Handlers (12); Endpoints (5); ASP.NET Identity (10); Organizando o Minimal API (5); Identity no Blazor (24); Área de Pedidos - Backend (34); Integração com Stripe (14); Migração para .NET 9 e MudBlazor 7 (6) |
| 27 | Uma visão geral sobre o ASP.NET Razor Pages | uma-visao-geral-do-aspnet-razor-pages | Iniciante | 1h 46m | 31 | 30 | ".NET 7 e C# 11" | not shown | Visão Geral (31) — server-rendered pages, not API |
| 28 | Introdução ao ASP.NET Core Identity | introducao-ao-aspnet-core-identity | Iniciante | 6h 4m | 34 | 71 | not shown; a lesson is "Criando Projeto Visual Studio 2017" *(inferred: ASP.NET Core 1.x/2.x era)* | not shown | Introdução (6); Imersão (28: IdentityOptions lockout/password/tokens, EF setup, login/logout, 2FA, Identity with Dapper) |
| 29 | Monitorando Aplicações com Application Insights | monitorando-aplicacoes-com-application-insights | Iniciante | 48m | 11 | 61 | not shown | not shown | Application Insights (10 lessons titled "Parte 1…10"); content per lesson not described |
| 30 | Todo App: API com ASP.NET Core, CQRS e EF Core | todo-app-api-com-aspnet-core-cqrs-e-ef-core | Intermediário | 4h 20m | 58 | 54 | "ASP.NET Core 3.1", EF Core, SQL Server via Docker, Firebase | not shown | Criação da API (57: commands, handlers, repository, unit tests, Google auth via Firebase token) |
| 31 | Criando um TodoApp com ASP.NET Core, Firebase, Angular e Flutter | criando-um-todo-app-com-aspnet-core-firebase-angular-flutter | Intermediário | 9h 30m | 134 | 51 | not shown (its API module repeats course 30) | not shown | Criação da API (57); Criação do App Web (33); Criação do App Mobile (43) |
| 32 | Criando aplicações escaláveis com arquiteturas modernas | criando-aplicacoes-escalaveis-com-arquiteturas-modernas | Intermediário | 5h 13m | 16 | 77 | not shown | not shown | 7 short modules: specs, shared kernel, domain events, repository, Unit of Work, application services, deployment |
| 33 | Modern Web Apps 2017 | modern-web-apps-2017 | Avançado | 21h 34m | 41 | 75 | title/description: "ASP.NET Core, Angular 2 e Ionic 2" (2017) | not shown | Backend (18: CQRS, EF, repository, Dapper reads, signup/login); Frontend (15); Mobile (8) |

### AI courses on .NET (current, outside the backend core)

| Title (exact) | Slug | Level | Workload | Lessons | Pub. rank | Version on page | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Integrando Agentes de IA a sua solução | integrando-agentes-a-sua-solucao | Intermediário | 2h | 32 | 1 | not shown | Core/Infra/IA/Interface modules; GitHub API service |
| Fundamentos do Microsoft Agent Framework | fundamentos-do-microsoft-agent-framework | Iniciante | 11h 25m | 61 | 4 | not shown | Microsoft.Extensions.AI, local AI setup, agents, tools, memory, middleware, hosting on Azure with ASP.NET |
| Fundamentos da IA Generativa para devs .NET | fundamentos-ia-generativa-devs-dotnet | Iniciante | 2h 34m | 26 | 7 | not shown | RAG, vector search, Postgres, EF, Semantic Kernel, Ollama |

Opened but not tabled (Blazor front-end, outside the backend scope): "Fundamentos do Blazor com .NET 8" (`fundamentos-blazor-dotnet-8`, in the ASP.NET/Blazor Developer career); its "Suporte e versões" section reads ".NET 8 (Lançado em 14/11/2023)", "C# 12", Visual Studio 2022, JetBrains Rider, SQL Server.

Not opened (listing data only): "Implementando Agentes com Microsoft Agent Framework" (Intermediário, 1h 14m), "IA Generativa para devs .NET" (Iniciante, 1h 39m), "Uma visão geral da IA Generativa" (Iniciante, 1h 4m), all Blazor/MAUI/Flutter/Angular/React/Node/Nest/front-end courses.

### Legacy courses (page shows the legacy banner)

| Title (exact) | Slug | Level | Workload | Lessons | Pub. rank | Version on page | Replacement named on page |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Criando APIs com ASP.NET Core 2.0 e Dapper | criando-apis-com-aspnetcore-2-e-dapper | Intermediário | 11h 23m | 61 | 72 | "ASP.NET Core 2.0", Dapper, Swagger, ELMAH, Application Insights, Azure | Fundamentos do ASP.NET 6 |
| Criando APIs Data Driven com ASP.NET Core 3 e EF Core 3 | criando-apis-data-driven-com-aspnet-core-3-e-ef-core-3 | Iniciante | 3h 32m | 45 | 56 | "ASP.NET Core 3.0 SDK", "Entity Framework Core 3.0", Docker for SQL Server | Fundamentos do ASP.NET 6 |
| Uma visão completa do ASP.NET MVC | uma-visao-completa-do-aspnet-mvc | Iniciante | 8h | 28 | 78 | not shown *(inferred: classic ASP.NET MVC on .NET Framework, lesson "Publicando a aplicação no Azure", Identity)* | Fundamentos do ASP.NET 6 |
| APIs Web com ASP.NET MVC | apis-web-com-aspnet-mvc | Iniciante | 5h 58m | 21 | 80 | not shown *(inferred: ASP.NET Web API on .NET Framework; lessons "Deploy para Windows Azure (Cloud Service)", "APIs Web com ASP.NET MVC no vNext")* | Fundamentos do ASP.NET 6 |
| Criando Backends Robustos com WebAPI | criando-backends-robustos-com-webapi | Avançado | 3h 56m | 10 | 82 (oldest) | not shown | Fundamentos do ASP.NET 6 |
| Acesso à dados com EF e Repository Pattern | acesso-a-dados-com-ef-e-repository-pattern | Intermediário | 5h 20m | 10 | 81 | not shown *(inferred: Entity Framework 6 era)* | Fundamentos do Entity Framework |

## Competency map

Legend: **M** = a whole module or the course focus; **p** = some lessons only (from lesson titles); blank = no lesson title on the topic. Based on lesson titles only, not on video content.

| Course (short) | C# fund. | OOP | Coll./LINQ | Async | Web API | Minimal API | Auth JWT/Identity | EF Core | Dapper/SQL | Testing | Msg/bg jobs | Docker | Cloud | Observ. | CI/CD | Arch. | Legacy/migration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fundamentos do C# | M | p (structs, value/reference types) | p (arrays only) | | | | | | | | | | | | | | p (.NET Framework vs Core history) |
| Fund. Orientação a Objetos | | M | p (generics, lists, IEnumerable/IList; no LINQ) | | | | | | | | | | | | | | |
| Aplicando OOP C# 11/.NET 7 | p | M | p | | | | | | | p (MSTest-style DataRow *(inferred)*) | | | | | | p (VOs) | |
| Migrando .NET 7/C# 11 | p (C# 11 features) | | p (list patterns) | | p | p | | | | | | p | | | | | M (from .NET Framework 3.5–4.8 and Core 1–3) |
| Dominando Injeção de Dependência | | p | | | p | | | p (AddDbContext) | | | | | | | | M (DI/IoC/DIP) | |
| Fundamentos do ASP.NET 6 | | | | p | M | M | M (JWT) | M | | | | | | | | | p (ASP.NET 5 migration) |
| Segurança APIs JWT/Bearer | | | | | p | | M (JWT, refresh, roles, policies) | | | p | | | | | | p (use cases, Mediator) | |
| Introdução ao ASP.NET Core Identity | | | | | | | M (Identity, 2FA) | p | p (Identity with Dapper) | | | | | | | | outdated version |
| Fundamentos do Entity Framework | | | p (ToList, Skip/Take) | p | | | | M | | | | p | | | | | |
| Dapper + SQL Server | | | | | | | | | M | | | | | | | p (repository) | p (ADO.NET) |
| Fundamentos do SQL Server | | | | | | | | | M (SQL) | | | | | | | | |
| Postgres para devs .NET | | | | | | | p (Identity tables) | | M (SQL/Postgres) | | | | | | | | |
| Dominando Postgres com EF | | | p (LINQ projections, per overview) | | p | | p (Identity) | M | | | | p (Compose) | | | | p (VOs) | |
| Dominando Repository Pattern | | | | | | | | p | | | | | | | | M | |
| Dominando Mediator | | | | | | | | | | | | | | | p (GitHub Actions) | M (CQRS, Mediator) | |
| Modelando Domínios Ricos | | M | | | | | | | | p | | | | | | M (DDD, CQRS) | |
| Refatorando para testes de unidade | | | | | | | | | | M (mocks) | | | | | | p | M (legacy refactoring) |
| Arquitetura Limpa com .NET | | p | | | | | | | | p | | | | | | M (SOLID, DDD, Clean, CQRS, Vertical Slice) | |
| Arquitetura Limpa na prática | | | | | | | | | | | | | | | | M (Result, Specification, FluentValidation) | |
| Fundamentos dos Microsserviços | | | | | | | | | | | p (communication) | | | p (monitoring) | | M (microservices, circuit breaker) | |
| Fund. Event-Driven Architecture | | | | | | | | | | | M (Kafka) | p | p (Confluent Cloud) | | | M (EDA, event storming) | |
| Mult-Tenant com EF Core | | | | | | | | M | | | | | | | | M (multi-tenancy) | |
| Docker para devs .NET | | | | | | | | | | | | M | | | | | |
| Azure para devs .NET | | | | | | | | | | | | | M (App Service, CLI) | | | | |
| Azure, Git, GitHub e DevOps | | | | | | | | | | | | | M | | M (Actions, NuGet, GitHub Packages) | | |
| Git e Azure DevOps | | | | | | | | | | | | | p | | M (Azure Pipelines) | | |
| Application Insights | | | | | | | | | | | | | p | M (lesson content not described) | | | |
| Fullstack .NET | | | | | M | M | M (Identity API, cookies) | M | | | | p | | | | p | p (.NET 8 → 9 migration) |
| Todo App API (Core 3.1) | | | | | M | | p (Firebase/Google token) | M | | M | | p | | | | M (CQRS) | outdated version |
| Legacy: APIs Core 2.0 + Dapper | | p | p (collections) | | M | | | | M | M (mocks) | | | p | p (ELMAH, App Insights) | | M (DDD, CQRS) | M (Core 2.0) |
| Legacy: APIs Data Driven Core 3 | | | | p | M | | M (JWT) | M | | | | p | p | | | | M (Core 3.0) |
| Legacy: ASP.NET MVC / Web API / WebAPI / EF+Repository | | | | p | M | | p | p (EF classic) | | | | | p | | | | M (.NET Framework era) |

### Versions: current vs outdated (needs context)

| Version on page | Courses | Status on 2026-11-05 (support policy URL above) |
| --- | --- | --- |
| .NET 10 / C# 14, .NET 11 / C# 15 | none | .NET 10 LTS is supported to 2028-11-14; .NET 11 (STS *(inferred)*) launches 2026-11-10, RC3 go-live until then. No balta.io page mentions either. |
| .NET 9 / C# 13 | Arquitetura Limpa com .NET, Arquitetura Limpa na prática, Dominando Mediator, Dominando Repository Pattern ("90", sic) | Newest shown; STS, out of support 2026-11-10. Concepts transfer to .NET 10 with little change *(inference)*. |
| .NET 8 / C# 12 (+ .NET 9 migration module) | Fullstack .NET, Fundamentos do Blazor com .NET 8 (front-end, note under the AI table) | LTS, out of support 2026-11-10. Minimal APIs and Identity API are the current hosting model *(inference)*. |
| .NET 7 / C# 11 | Aplicando OOP, Migrando para o .NET 7, Segurança em APIs JWT, Razor Pages | Out of support since 2024-05-14. JWT/OOP concepts still valid; syntax mostly still compiles *(inference, not verified)*. |
| ASP.NET 6 (title) | Fundamentos do ASP.NET 6 (the replacement every legacy API course points to) | Out of support since 2024-11-12. Still the only full "API fundamentals" course. |
| .NET 5 / EF Core 5.0.9 | Fundamentos do Entity Framework | Out of support since 2022-05-10. EF Core 5 → 10 changed defaults and APIs *(not verified per feature)*. |
| .NET Core 3.1 | Fundamentos do C#, Todo App API | Out of support since 2022-12-13. Language basics still valid; C# 9–14 features (records, top-level statements, pattern matching additions, primary constructors…) are absent from lesson titles. |
| .NET Core 2.0 / 3.0 | legacy API courses | Out of support since 2018/2020. |
| not shown | DI, Dapper, SQL Server, Postgres x2, Docker, Azure x2, Git/DevOps x2, Microservices, EDA, Multi-tenant, Domínios Ricos, Refatorando para testes, App Insights, Identity | Cannot be judged from the page. |

### Overlaps

| Topic | Courses that overlap |
| --- | --- |
| ASP.NET Core API + EF + JWT | Fundamentos do ASP.NET 6 ≈ Criando APIs Data Driven (Core 3, legacy) ≈ Fullstack .NET (backend half) ≈ Todo App API |
| JWT/auth | Fundamentos do ASP.NET 6 (module) ⊂ Segurança em APIs JWT (deep); Identity: Introdução ao Identity, Fullstack .NET, Dominando Postgres com EF |
| DDD / CQRS / rich domain | Modelando Domínios Ricos ⊂ Arquitetura Limpa com .NET (module "Modelando Domínios Ricos", 33 lessons) ≈ Arquitetura Limpa na prática; also Criando APIs Core 2.0 + Dapper, Todo App API, Criando aplicações escaláveis |
| Mediator / Repository | Dominando Mediator, Dominando Repository Pattern, Arquitetura Limpa com .NET, Segurança em APIs JWT (login system uses Mediator) |
| Unit testing | Refatorando para testes de unidade, Aplicando OOP (module), Arquitetura Limpa com .NET (tests inside modeling), Modelando Domínios Ricos, Todo App API |
| Todo App API | course 30 and the API module of course 31 have identical lesson titles |
| Azure | Azure para devs .NET (overview) ⊂ Fundamentos do Azure, Git, GitHub e DevOps (hosting module) |
| Postgres | Postgres para devs .NET (SQL side) + Dominando Postgres com EF (EF side); also Fundamentos da IA Generativa (vector search) |

### Gaps (no lesson title in any opened course covers it)

| Competency | Evidence |
| --- | --- |
| LINQ as a topic | Only occurrence is "projeções LINQ" in the Dominando Postgres com EF overview; no lesson titled LINQ. Collections stop at arrays, lists, generics, IEnumerable/IList. |
| Modern C# (records, pattern matching beyond C# 11 list patterns, primary constructors, collection expressions, nullable reference types in depth) | C# fundamentals course is on .NET Core 3.1; newer features appear only as isolated lessons in the C# 11 courses. |
| Async in depth (Task, cancellation, IAsyncEnumerable, parallelism) | Only single lessons "Async e Await" (ASP.NET 6, EF) and "Utilizando ASYNC" (legacy). |
| Integration testing (WebApplicationFactory, Testcontainers), test frameworks by name (xUnit/NUnit/MSTest), mocking libraries | Not found in lesson titles; testing courses focus on domain unit tests. |
| Messaging and background work: RabbitMQ, Azure Service Bus, MassTransit, BackgroundService/IHostedService, Hangfire, Quartz, outbox | Not found; only Kafka in the EDA course. |
| Caching with Redis / distributed cache | Only "Cache" / "Output Cache" lessons; no Redis. |
| Observability: OpenTelemetry, structured logging (Serilog/ILogger), health checks, metrics | Only Application Insights (10 untitled parts, rank 61) and "Monitoramento" lessons in Microservices. |
| Resilience libraries (Polly, Microsoft.Extensions.Http.Resilience), HttpClientFactory | Only conceptual "Circuit Breaker e Retry Pattern". |
| AWS, Kubernetes, gRPC, SignalR, GraphQL on .NET | Not found in any .NET course lesson title (GraphQL appears only in the Nest/Node course title). The Formação .NET overview nevertheless promises "DevOps — Docker, CI/CD com GitHub Actions, deploy em nuvem (Azure/AWS), monitoramento e observabilidade"; no lesson title in the opened courses supports the AWS claim (cloud lessons are Azure only). |
| Legacy maintenance: WCF, Web Forms, .NET Framework 4.8 → .NET upgrade tooling (Upgrade Assistant), System.Web adapters | Not found; Migrando para o .NET 7 lists .NET Framework 3.5–4.8 as migration sources (strategy lessons), legacy MVC/Web API courses exist but teach the old stack, not migration off it. |
| .NET 10 / C# 14, .NET 11 / C# 15 | No course page mentions them. |
| Security beyond auth (OWASP for APIs, rate limiting, CORS in Core, data protection) | Only "Hackeando o Token" and legacy "CORS". |

## Suggested sequence for a PHP/Magento backend developer (balta.io only)

Rationale: the learner already knows HTTP, MVC, DI containers (Magento `di.xml`), repositories, SQL and service contracts, so the beginner C# course can be skimmed and the jump to ASP.NET Core is fast. Workloads are from the pages; the sequence is a proposal, not balta.io's.

| Step | Course | Workload | Why for this profile |
| --- | --- | --- | --- |
| 1 | Fundamentos do C# | 12h 9m | Type system, value vs reference types, structs, enums, exceptions; skim control flow. Version is .NET Core 3.1: supplement modern C# elsewhere. |
| 2 | Fundamentos da Orientação a Objetos | 4h 8m | Interfaces, abstract classes, generics, delegates/events: maps to PHP interfaces/traits; delegates/events have no direct PHP equivalent. |
| 3 | Dominando Injeção de Dependência | 2h 31m | Transient/Scoped/Singleton vs Magento shared/non-shared objects. |
| 4 | Fundamentos do SQL Server (skim) → Acesso à dados com .NET, C#, Dapper e SQL Server | 2h 58m + 5h 9m | Dapper is closest to Magento resource-model SQL. |
| 5 | Fundamentos do Entity Framework | 4h 29m | ORM, migrations (vs declarative schema), tracking, eager/lazy loading. EF Core 5 version. |
| 6 | Fundamentos do ASP.NET 6 | 7h 44m | Minimal APIs, controllers, JWT, configuration, OpenAPI: core of the track. |
| 7 | Segurança em APIs ASP.NET com JWT e Bearer Authentication | 4h 50m | Claims, policies, refresh tokens (Magento uses integration/admin tokens). |
| 8 | Fullstack .NET (backend modules: Minimal APIs, EF, Handlers, Endpoints, Identity, Pedidos Backend, Stripe) | 8h 31m of 22h 45m (38m + 58m + 1h 06m + 33m + 1h 01m + 2h 44m + 1h 31m, module sums of the content tab) | Most recent end-to-end API on .NET 8 with a .NET 9 migration module; e-commerce-like orders and payment integration. |
| 9 | Refatorando para testes de unidade → Aplicando OOP C# 11/.NET 7 | 2h 2m + 2h 15m | Unit tests on an order domain; legacy refactoring mirrors Magento customisation work. |
| 10 | Docker para devs .NET → Fundamentos do Azure, Git, GitHub e DevOps | 1h 12m + 7h | Containers and CI/CD with GitHub Actions, Azure hosting. |
| 11 | Dominando Repository Pattern → Dominando Mediator → Arquitetura Limpa com .NET | 1h 45m + 2h 55m + 6h 56m | Newest courses (.NET 9); DDD/CQRS/Clean Architecture. |
| 12 (optional) | Fundamentos dos Microsserviços, Fundamentos do Event-Driven Architecture, Aplicações Mult-Tenant com EF Core | 2h + 1h 56m + 1h 14m | Conceptual; Kafka only. |
| 13 (only for legacy jobs) | Migrando para o .NET 7 e C# 11 (strategy module), Uma visão completa do ASP.NET MVC, APIs Web com ASP.NET MVC | 2h 29m + 8h + 5h 58m | Legacy banner on the MVC courses; no WCF/Web Forms anywhere. |

Total of steps 1–11 is **76h 34m** of video: 68h 03m for the listed workloads of steps 1–7 and 9–11, plus 8h 31m for the seven Fullstack .NET modules named in step 8 (lesson durations summed per module on its content tab). Counting every backend module of Fullstack .NET (adding Estruturando o Projeto, Documentação da API, Padronização, API de Transações, Organizando o Minimal API and the .NET 9 migration module, 2h 34m) gives 79h 08m.

## Sources (all opened 2026-11-05)

- https://balta.io/courses (pages `?page=1..4`, `?sort=published`)
- https://balta.io/paths and each `https://balta.io/paths/<slug>?tab=content` listed above
- https://balta.io/formations and https://balta.io/formations/formacao-dotnet (`?tab=content`)
- `https://balta.io/courses/<slug>` and `https://balta.io/courses/<slug>?tab=content` for the 43 courses in the tables (slugs given in each row)
- https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
