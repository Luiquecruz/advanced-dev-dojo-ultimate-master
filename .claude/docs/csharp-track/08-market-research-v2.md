# C#/.NET backend job market: research sample, round 2

Research date: **2026-11-05**. This round widens the sample of [01-market-research.md](01-market-research.md) (round 1: 69 postings), measures vocabulary round 1 did not, and adds adoption data from surveys and NuGet. The result is a **convenience sample of 198 unique postings**: the 69 from round 1 plus **129 new** ones. It is not a statistic of the market.

Two kinds of evidence are kept apart in this document:
- **Demand**: what job postings ask for (sections 1 to 6).
- **Adoption**: what developers use, according to surveys and package downloads (section 7). High adoption does not mean postings ask for it, and the reverse is also true.

## 1. Sources and access status

| Source | How it was read | Status on 2026-11-05 | New postings used |
| --- | --- | --- | --- |
| LinkedIn Jobs | Same guest endpoints as round 1 (`linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search`, `f_TPR=r2592000` = last 30 days, `f_WT=2` = remote filter where noted; detail `linkedin.com/jobs-guest/jobs/api/jobPosting/<id>`). The public URL `https://www.linkedin.com/jobs/view/<id>` is cited. One HTTP 429 (rate limit), retried. | Verified | 119 |
| InfoJobs BR | Search `https://www.infojobs.com.br/vagas-de-emprego-desenvolvedor+.net.aspx`; each job page has a JSON-LD `JobPosting` with `datePosted` and, for some jobs, `baseSalary` | Verified | 7 |
| Vagas.com | Search `https://www.vagas.com.br/vagas-de-.net` and `https://www.vagas.com.br/vagas-de-c%23`; job pages show "Publicada em". Most results are unrelated jobs (health care, sales, operations), and several job pages returned HTTP 504 before a retry succeeded | Verified, low yield | 2 |
| Programathor | `https://programathor.com.br/jobs-c-sharp`, new IDs only | Verified; publication date not shown | 1 |
| Catho | `https://www.catho.com.br/vagas/desenvolvedor-net/` and `/vagas/analista-programador-net/` | **Not usable**: HTTP 200, but the page says "Ops! não encontramos nenhuma vaga", with curl and with a headless browser | 0 |
| Glassdoor BR / Glassdoor US | `glassdoor.com.br/Vaga/brasil-desenvolvedor-net-vagas-...`, `glassdoor.com/Job/remote-net-developer-jobs-...` | **Blocked**: HTTP 403 | 0 |
| Indeed BR / Indeed US | `br.indeed.com/jobs?q=.net`, `www.indeed.com/jobs?q=c%23+.net` | **Blocked**: HTTP 403 | 0 |
| Arc.dev | `https://arc.dev/remote-jobs/dotnet` and its two job pages | Verified. Both .NET jobs hide the employer: one is an "Arc Exclusive" Senior Full-Stack Software Engineer (Angular/TypeScript, C#/.NET), remote anywhere, US$70K - 90K, "Posted 10 days ago"; the other is a permanent role in India, "Posted a month ago". Both were excluded under round 1's hidden-employer rule | 0 |
| Turing | `https://www.turing.com/jobs` and `/jobs/remote-net-developer-jobs` | **Blocked**: bot-protection page (Incapsula), no listings | 0 |
| Himalayas | `https://himalayas.app/jobs/api?q=.net&limit=20`; `https://himalayas.app/jobs/c-sharp` | API verified, 20 results, none .NET; the category page returned HTTP 403 | 0 |
| Remotive | `https://remotive.com/api/remote-jobs?search=c%23` | Verified; 10 results, none .NET-primary | 0 |
| Wellfound | `https://wellfound.com/role/r/dotnet-developer`, `https://wellfound.com/jobs?q=.net` | **Not usable**: both return a generic page ("Remote Tech & Startup Jobs") with no .NET listing | 0 |
| Remote OK | `https://remoteok.com/api?tag=dotnet` (0 jobs) and the full feed `https://remoteok.com/api` (99 jobs, 6 mention .NET/C#, none .NET-primary: Klardaten, Lemon.io and others) | Verified, no usable posting | 0 |
| We Work Remotely | `https://weworkremotely.com/remote-jobs/search?term=.net` and `term=c%23` | Page loads; no .NET listing found | 0 |
| Company career pages | Not searched as a separate source. Postings reached company pages only through LinkedIn | Not tried | 0 |
| Gupy | Not queried again this round (round 1 source) | - | 0 |

New LinkedIn queries (in addition to round 1's): `desenvolvedor .NET junior`, `estagio C#`, `desenvolvedor C# remoto` (remote filter), `desenvolvedor .NET senior`, `engenheiro de software C#`, `analista desenvolvedor .NET`, `.NET developer` (Brazil); `junior C# developer` (United States); `.NET developer` (United Kingdom); `C# backend developer` and `junior .NET developer` (European Union); `.NET engineer` (Canada); `.NET developer` (Portugal); `.NET developer remote` (Latin America, remote filter); `C# developer` (Worldwide, remote filter). The search returned 270 cards and 150 job IDs not seen in round 1.

## 2. Selection, deduplication and grouping

Round 1's rules were reused unchanged:
- **Included**: C# or .NET in the title or the requirements as the main stack; posted 2026-10-06 to 2026-11-05 where a date is shown; full description readable.
- **Excluded**: .NET as one option among several; reposts that hide the employer.
- **Deduplication**: same company plus the same title or text counts once.

New postings were deduplicated against each other and against round 1. Text similarity was measured as 3-word shingle Jaccard over the description, and every pair above 0.5 was reviewed by hand. The table lists every reviewed pair, dropped or kept.

| Decision | Postings |
| --- | --- |
| **Hidden employer (excluded)** | Jobgether 4486334094, 4485430588, 4485137472, 4485125522, 4485146433; LinkedIn 4481107856 (no company shown); the two Arc.dev jobs |
| **.NET is one option among several (excluded)** | Sifra Group 4486315705 ("C# .NET ou Python"), FGR 4483189405 ("C#, Node.js ou React"), Conecta RH 4479668540 (C# "e/ou outras linguagens"), AVEVA intern 4469613907, Extra Space Storage 4487708810 ("at least two of" C#, VB.NET, Apex, PHP...), Identity Digital 4478492921, Consumer Direct Care Network 4471378689, HStern on Vagas.com v2841827 ("Python, JavaScript, C#, Java") |
| **Other exclusions** | Jobbol 4482876676 (internship text never names C# or .NET); Tess Projetos 4476653814 (a "Banco de Talentos" talent pool, not an opening); InfoJobs 12069559 (posted 2026-09-30, outside the window) |
| **Same text as a round 1 posting (dropped)** | Luxoft Poland Warsaw 4487050833 = INT-30 (Jaccard 1.0); Jobbol Manaus 4478361903 = BR-18 (0.87); Webmotors "Back-end Pl" 4469059971 = BR-29 "Back-end Jr" (0.93) |
| **Reviewed above 0.5, kept (different opening)** | Stone "SENIOR SOFTWARE ENGINEER .NET" 4473917399 against round 1 BR-24 "SOFTWARE ENGINEER I .NET" (0.62: different title and seniority, shared company blurb); Netcompany "Junior .NET Developer for Netcompany Banking Services" 4460473197 against "Junior .Net Developer" 4435906571 (0.56: different title and team); Client Server "Senior Software Engineer C# .Net" 4484062264 against round 1 INT-24 "Software Engineer C# .Net - FinTech" (0.53: different title and seniority, shared recruiter template). Webmotors above is dropped and these are kept because the rule is "same title or same text": Webmotors repeats the text almost word for word (0.93), while these pairs share only a blurb or template |
| **Same text or template within the new set (one kept)** | Stone 4483352501 = 4473917399; BairesDev 4487030203 = 4487012559; B3 8391 4485603151 = 8392 4485386901; Isio 4486375445 = 4485086265; Noir 4487290561 = 4484972018; Pinewood.AI Solihull 4485306782 = London 4487273611; Version 1 Belfast 4483479460 = Edinburgh 4483480433; Biller Genie 4486193611 = 4482155650; Betsson senior 4483540255 = 4483530901; Perform Santiago 4415711218 = São Paulo 4415712184; ENTERSOFTONE 4484679237 = 4486845612; PharmaLex Cracow 4474455339 = Lublin 4474454416; Medpace Warsaw 4332274669 = Leuven 4431490525; Vagas.com Talent Group 11381 = 11380 |

**Result: 129 new unique postings, 198 in total.**

Groups follow round 1:
- **BR**: roles in Brazil for Brazilian employers, posted in Portuguese.
- **INT**: roles outside Brazil, plus **"INT (from BR)"**: roles open to Brazil residents for foreign clients, posted in English. This round's INT (from BR) postings are BairesDev x3, CI&T "Mid Level .NET Developer, Brazil", Nortal "Staff C# Engineer" (LATAM remote team) and Perform (English posting, São Paulo).

## 3. Sample composition

| | Round 1 BR | Round 1 INT | New BR | New INT | **Full BR (n=77)** | **Full INT (n=121)** |
| --- | --- | --- | --- | --- | --- | --- |
| Postings | 37 | 32 | 40 | 89 (6 from BR) | **77** | **121** (12 from BR) |
| Sources | LinkedIn 21, Gupy 8, Programathor 8 | LinkedIn 31, Programathor 1 | LinkedIn 30, InfoJobs 7, Vagas.com 2, Programathor 1 | LinkedIn 89 | LinkedIn 51, Gupy 8, Programathor 9, InfoJobs 7, Vagas.com 2 | LinkedIn 120, Programathor 1 |
| Seniority (title/text) | senior 18, mid-senior 1, mid 6, junior 7, not stated 5 | senior 22, mid 3, junior 4, multi-level 1, not stated 2 | senior 15, mid 10, mid/senior 1, junior 3, intern 2, not stated 9 | senior 35, mid 2, junior 20, not stated 32 | **junior or intern 12** | **junior 24** |
| Dates shown | 2026-10-09 to 2026-11-05 | 2026-10-06 to 2026-11-04 | 2026-10-06 to 2026-11-04 (39 dated) | 2026-10-06 to 2026-11-05 (89 dated) | | |

Locations of the 83 new INT postings outside Brazil: United Kingdom 14, United States 13, Portugal 8, Canada 7, Italy 4, Colombia, Greece, Poland and Spain 3 each, Belgium, Estonia, Germany, Indonesia, Lithuania, Malta, Mexico and the Netherlands 2 each, and one each in Argentina, Australia, Austria, Bangladesh, Croatia, Czechia, France, India and Sweden.

**Junior roles.** The sample now has **36 junior or intern postings** (round 1: 11). Of the new juniors, 20 are INT: US entry-level roles (EAi Technologies, CACI, UNCOMN, Andromeda, Encore, Urban Science, Prometheus Group) and European ones (Netcompany x2, Vitec Autonet, Copeland, Starapple, European Dynamics, Medpace, WTW, Lottomatica, FERCHAU, CARBON IT, Auctane, PharmaLex). Brazilian junior supply remained thin on the boards that could be read: 3 junior roles (TOTVS, Target Sistemas, Seatrium) and 2 internships (AGX Software on InfoJobs, Blueintra on Programathor).

**Remote policy.** The LinkedIn guest detail still has no workplace field, so modality for new postings was taken from the words in the text (remote/remoto/home office, hybrid/híbrido, on-site/presencial). "Remote" appears in **41 of the 129** (BR 11, INT 30), 57 contain none of the words, and many contain several (for example "remote onboarding" plus "office"). The modality column in section 5 lists the words found. It is not a verified policy. Together with round 1's 23 postings that stated remote, **64 of 198 mention a remote option**. That is more postings in absolute terms, but not a reliable share.

## 4. Coding method

**Automated rows.** Each description was split into "required" (requirements plus duties) and "nice-to-have" with the round 1 markers (*Diferencial*, *Desejável*, *Nice to have*, *Preferred*, *Desirable*, *Bonus*, *is a plus*...). Benefits, "about us" and company-description blocks were cut off. A keyword dictionary with round 1's vocabulary was then applied.

**Header-based splitting can drop the role itself.** Some postings put the role under a header that the cut rules read as a company block ("About Us", "About The Project", or a benefits header placed first), so a "Tech Stack" or duties block was dropped with it. A first pass lost almost all of Trainline R2-INT-34 (no codes at all, although it lists C# (.NET 6–10), PostgreSQL, DynamoDB, AWS, Docker and GitHub Actions) and Nortal R2-INT-02 (C# named 4 times, not coded). The split now keeps any cut block that names C# or .NET, in the section it was cut from. This changed the codes of 11 new postings (Nortal, Trainline, Tata Consultancy Services, Avenue, B3, TRG Screen, Leon Recruitment, TD, Copeland, UST, Alfa Laval) and, for example, "C# named" in the new postings from 116 to 118. The restored blocks can also carry some company text, which adds to the noise listed below. Round 1's re-coded column was not re-run with this fix, so it keeps the calibration it was checked with; a few round 1 texts have the same problem, so that column is slightly low.

**Calibration.** The same dictionary was run on the full texts of round 1's 69 postings (LinkedIn texts re-fetched, Gupy and Programathor pages re-read) and compared with round 1's hand-checked codes:
- Agreement per posting is 91–100% for every row except observability (88%).
- Web API/REST (96%) and background jobs (97%) reached that range only after their patterns were tightened; SOLID/patterns is at the bottom of it (91%).
- Section 6 shows round 1's published counts next to the re-coded ones, so the drift caused by method alone is visible.

**Verified rows.** The new vocabulary is rare, so its keywords produce many false positives. For example:
- "real-time" in a business sense;
- "Lambda Architecture";
- "agentic" in a company blurb;
- Elasticsearch used only for logs.

Every match of these rows was therefore read in context across all 198 postings, and only the real ones were kept (section 6.2). "AI features in the product" means building model or LLM features into the product. It is kept apart from "AI-assisted development", which means using Copilot, Claude or similar tools to write code.

**Known noise in automated rows.**
- `\bai\b` also matches company blurbs, so "AI-assisted development" is over-counted.
- "English" matches any explicit mention of the language.
- Generic "performance" wording appears in most postings.
- Round 1's "legacy system work" row is not reproducible with keywords: Portuguese "manutenção" matches almost every BR posting. It is replaced by a strict "legacy/legado" row.

## 5. New postings (129)

Three employers in this table are education and training companies. Their names are withheld under the project rule that no training provider is named; the posting links are kept so that the rows can be checked.

Columns as in round 1:
- *Modality words* are the keywords found, not a verified policy.
- *Seniority* comes from the title. Where the title gives none, LinkedIn's own field is shown in brackets.
- The two competency columns are automated, except the tokens from verified rows (external APIs, resilience (HTTP), message retries, gRPC, SignalR/WebSockets, serverless, Native AOT, perf/memory, AI in product, search, OpenTelemetry, MassTransit, minimal APIs, Blazor, quality tool), which were checked by hand.

| # | Group | Title | Company | Source | Posted | Location | Modality words | Seniority | Salary stated | Required / in duties (automated + verified rows) | Nice-to-have |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R2-BR-01 | BR | [Desenvolvedor Full-Stack Estágio](https://programathor.com.br/jobs/33860-desenvolvedor-full-stack-estagio) | Blueintra | Programathor | not shown | Vinhedo, SP | not shown | intern | - | C#, SQL Server, NoSQL, Angular, React, JS/TS/HTML | - |
| R2-BR-02 | BR | [DESENVOLVEDOR PLENO .NET](https://www.linkedin.com/jobs/view/4476327011) | CAST | LinkedIn | 2026-10-06 | Brazil | remote | mid | - | C#, REST API, JWT/OAuth, SQL Server, SPs/query tuning, unit tests, Azure DevOps, Git, SOLID/patterns, LEGACY-TECH, Angular, JS/TS/HTML, Agile, security, Oracle | - |
| R2-BR-03 | BR | [Engenharia de Software Júnior - .NET/Angular](https://www.linkedin.com/jobs/view/4474805882) | TOTVS | LinkedIn | 2026-10-08 | Belo Horizonte, Minas Gerais, Brazil | not shown | junior | - | C#, REST API, SQL Server, unit tests, Angular, Oracle | MVC, DDD, JS/TS/HTML, Agile |
| R2-BR-04 | BR | [[Tech] Pessoa Desenvolvedora Pleno C# (Vaga afirmativa para Pessoas com Deficiência)](https://www.linkedin.com/jobs/view/4474853621) | TOTVS | LinkedIn | 2026-10-08 | São Paulo, São Paulo, Brazil | not shown | mid | - | C#, REST API, MVC, Docker, CI/CD, GH Actions, Git, SOLID/patterns, Agile | - |
| R2-BR-05 | BR | [11380 - Desenvolvedor Fullstack .net e Angular](https://www.vagas.com.br/vagas/v2838704/11380-desenvolvedor-fullstack-net-e-angular) | Talent Group | Vagas.com | 2026-10-08 | Rio de Janeiro, RJ | on-site | mid | - | modernization, Angular, JS/TS/HTML, AI tools | LEGACY-TECH |
| R2-BR-06 | BR | [Desenvolvedor .NET Sênior](https://www.linkedin.com/jobs/view/4475230910) | Performa_IT | LinkedIn | 2026-10-09 | São Paulo, São Paulo, Brazil | remote + hybrid + on-site | senior | - | C#, REST API, messaging, RabbitMQ, Docker, observability, Git, LEGACY-TECH, security | - |
| R2-BR-07 | BR | [Desenvolvedor C](https://www.infojobs.com.br/vaga-de-desenvolvedor-c-em-minas-gerais__12112447.aspx) | Alterosa Mk | InfoJobs | 2026-10-13 | Contagem, MG | not shown | not stated | - | C#, Angular, JS/TS/HTML | - |
| R2-BR-08 | BR | [Desenvolvedor(a) Full-Stack .NET Sênior](https://www.linkedin.com/jobs/view/4476477421) | Nava / Tech for Business | LinkedIn | 2026-10-13 | São Paulo, São Paulo, Brazil | remote | senior | - | C#, ASP.NET Core, REST API, JWT/OAuth, EF, Dapper, SQL Server, NoSQL, unit tests, messaging, RabbitMQ, Azure, observability, CI/CD, Azure DevOps, Git, SOLID/patterns, Clean Arch, DDD, microservices, CQRS/ES, Vue, JS/TS/HTML, OpenAPI, quality tool | Docker, K8s, AI tools |
| R2-BR-09 | BR | [11384 - Desenvolvedor Fullstack .net + Angular](https://www.vagas.com.br/vagas/v2839125/11384-desenvolvedor-fullstack-net-angular) | Talent Group | Vagas.com | 2026-10-13 | São Paulo, SP | remote + on-site | not stated | - | C#, REST API, MVC, SPs/query tuning, messaging, RabbitMQ, Docker, K8s, Azure, CI/CD, Azure DevOps, Git, LEGACY-TECH, Oracle | - |
| R2-BR-10 | BR | [Desenvolvedor de .NET sênior](https://www.linkedin.com/jobs/view/4476758767) | FOURSYS | LinkedIn | 2026-10-14 | Greater São Paulo Area | on-site | senior | - | unit tests, Git, Agile, security, AI tools | - |
| R2-BR-11 | BR | [Analista de Desenvolvimento Web C# Sênior / Fáciltech](https://www.linkedin.com/jobs/view/4475245857) | Matera | LinkedIn | 2026-10-16 | Belo Horizonte, Minas Gerais, Brazil | remote + hybrid + on-site | senior | - | C#, REST API, EF, SQL Server, PostgreSQL, Docker, AWS, LEGACY-TECH, React, JS/TS/HTML, AI tools, Oracle | - |
| R2-BR-12 | BR | [Desenvolvedor .NET/C# Sênior](https://www.linkedin.com/jobs/view/4479614908) | Sevenred | LinkedIn | 2026-10-16 | Brazil | not shown | senior | - | C#, messaging, RabbitMQ, Azure, LEGACY-TECH, modernization | - |
| R2-BR-13 | BR | [Back-End Developer (.Net)](https://www.linkedin.com/jobs/view/4480581317) | Aliare | LinkedIn | 2026-10-17 | Brazil | remote | not stated | - | C#, REST API, EF, SQL Server, SPs/query tuning, async, unit tests, messaging, RabbitMQ, observability, Git, SOLID/patterns, Clean Arch, DDD, modernization, security | Docker, Azure, CI/CD, Azure DevOps |
| R2-BR-14 | BR | [Desenvolvedor(a) .NET](https://www.linkedin.com/jobs/view/4463673926) | Education company (name withheld, see note) | LinkedIn | 2026-10-18 | Brazil | remote | not stated | - | C#, ASP.NET Core, REST API, MVC, EF, Dapper, SQL Server, SPs/query tuning, unit tests, CI/CD, Git, SOLID/patterns, LEGACY-TECH, modernization, JS/TS/HTML, security, AI tools, OpenAPI, external APIs | workers/jobs, Docker, observability, minimal APIs |
| R2-BR-15 | BR | [Desenvolvedor .NET](https://www.infojobs.com.br/vaga-de-desenvolvedor-net-fullstack-sr-em-parana__12130721.aspx) | ILHASERVICE TECNOLOGIA | InfoJobs | 2026-10-19 | Curitiba, PR | hybrid + on-site | senior | - | C#, REST API, MVC, SQL Server, SPs/query tuning, Azure, CI/CD, Azure DevOps, SOLID/patterns, LEGACY-TECH, Angular, React, JS/TS/HTML, security | - |
| R2-BR-16 | BR | [ANALISTA DE DESENVOLVIMENTO .NET SÊNIOR](https://www.linkedin.com/jobs/view/4480275377) | levva | LinkedIn | 2026-10-19 | Campinas, São Paulo, Brazil | not shown | senior | - | C#, REST API, SQL Server, PostgreSQL, NoSQL, Redis/cache, unit tests, messaging, Docker, observability, CI/CD, SOLID/patterns, microservices, modernization, Agile | Service Bus, K8s, Azure, Azure DevOps, CQRS/ES |
| R2-BR-17 | BR | [Analista de Desenvolvimento de Software Sênior (.Net) (Fullstack) / Holding](https://www.linkedin.com/jobs/view/4478672720) | Grupo Iter | LinkedIn | 2026-10-20 | Rio de Janeiro, Rio de Janeiro, Brazil | not shown | senior | - | C#, CI/CD, Git, Agile, security, AI tools | - |
| R2-BR-18 | BR | [Estagiário de Desenvolvimento C](https://www.infojobs.com.br/vaga-de-estagio-desenvolvimentonet-em-sao-paulo__12139929.aspx) | AGX Software | InfoJobs | 2026-10-21 | Sorocaba, SP | on-site | intern | BRL 1,100-1,540 / month (internship) | - | C#, ASP.NET Core, REST API, EF, SQL Server, unit tests, Docker, Git, React, Agile, English, external APIs |
| R2-BR-19 | BR | [Desenvolvedor .Net](https://www.linkedin.com/jobs/view/4479421491) | DQR Tech | LinkedIn | 2026-10-21 | São Paulo, Brazil | not shown | not stated (LinkedIn: Mid-Senior level) | - | C#, SQL Server, PostgreSQL, NoSQL, messaging, RabbitMQ, Kafka, Docker, K8s, AWS, observability, CI/CD, LEGACY-TECH, serverless, MySQL | Git, quality tool |
| R2-BR-20 | BR | [Programador .NET](https://www.infojobs.com.br/vaga-de-programador-cnet-full-stack-em-sao-paulo__12140775.aspx) | Empresa confidencial | InfoJobs | 2026-10-21 | São Paulo, SP | remote + hybrid | mid/senior | - | C#, MVC, SQL Server, unit tests, LEGACY-TECH | - |
| R2-BR-21 | BR | [Desenvolvedor Fullstack Sênior (.NET + Angular) - Uberlandia/MG](https://www.linkedin.com/jobs/view/4482151820) | HelenaCRM | LinkedIn | 2026-10-21 | Uberlândia, Minas Gerais, Brazil | on-site | senior | - | C#, REST API, async, messaging, AWS, Angular, JS/TS/HTML, serverless, external APIs | NoSQL, AI tools, SignalR/WebSockets, AI in product |
| R2-BR-22 | BR | [SENIOR SOFTWARE ENGINEER .NET](https://www.linkedin.com/jobs/view/4473917399) | Stone | LinkedIn | 2026-10-22 | Brazil | remote + hybrid | senior | - | C#, NoSQL, unit tests, Docker, observability, Git, SOLID/patterns, Agile | messaging, RabbitMQ, Kafka, Service Bus, Azure, GCP, CI/CD, Azure DevOps, Clean Arch, CQRS/ES |
| R2-BR-23 | BR | [Software Engineer C# Sênior](https://www.linkedin.com/jobs/view/4477820792) | Mottu | LinkedIn | 2026-10-23 | São Paulo, São Paulo, Brazil | not shown | senior | - | C#, REST API, SQL Server, PostgreSQL, SPs/query tuning, NoSQL, Redis/cache, async, unit tests, messaging, RabbitMQ, Docker, K8s, GCP, observability, CI/CD, Git, SOLID/patterns, microservices, LEGACY-TECH, Agile, AI tools, OpenAPI | - |
| R2-BR-24 | BR | [Engenheiro(a) de Software (.NET) / BTG Empresas](https://www.linkedin.com/jobs/view/4467240771) | BTG Pactual | LinkedIn | 2026-10-27 | São Paulo, São Paulo, Brazil | hybrid | not stated (LinkedIn: Mid-Senior level) | - | C#, EF, async, unit tests, SOLID/patterns | PostgreSQL, messaging, Kafka, Docker, observability, CI/CD, modernization, React, JS/TS/HTML, English |
| R2-BR-25 | BR | [Desenvolvedor(a) .Net Sênior](https://www.linkedin.com/jobs/view/4475592897) | SOUTH SYSTEM | LinkedIn | 2026-10-27 | Brazil | remote | senior | - | C#, REST API, async, unit tests, messaging, observability, CI/CD, Git, microservices, security, external APIs | SPs/query tuning, Docker |
| R2-BR-26 | BR | [ANALISTA SISTEMA DESENV. JR F](https://www.linkedin.com/jobs/view/4431161980) | Seatrium | LinkedIn | 2026-10-27 | Aracruz, Espírito Santo, Brazil | not shown | junior | - | C#, MVC, SQL Server, observability, JS/TS/HTML, security | Agile, English |
| R2-BR-27 | BR | [Analista de Engenharia de Software Pleno - Dynamics](https://www.linkedin.com/jobs/view/4484297073) | Porto | LinkedIn | 2026-10-28 | São Paulo, São Paulo, Brazil | hybrid | mid | - | C#, REST API, unit tests, messaging, Service Bus, Azure, observability, CI/CD, Git, SOLID/patterns, React, JS/TS/HTML, Agile, security, serverless | Azure DevOps |
| R2-BR-28 | BR | [[Tech] Engenharia de Software Backend Sênior - .NET](https://www.linkedin.com/jobs/view/4482536719) | TOTVS | LinkedIn | 2026-10-28 | Belo Horizonte, Minas Gerais, Brazil | not shown | senior | - | C#, REST API, NoSQL, async, unit tests, messaging, RabbitMQ, observability, CI/CD, Git, SOLID/patterns, DDD, microservices, CQRS/ES, Agile | - |
| R2-BR-29 | BR | [Senior .NET Full Stack Developer](https://www.linkedin.com/jobs/view/4484734238) | Tata Consultancy Services | LinkedIn | 2026-10-28 | São Paulo, Brazil | not shown | senior | - | C#, ASP.NET Core, REST API, EF, SQL Server, async, unit tests, observability, CI/CD, Git, SOLID/patterns, Angular, React, JS/TS/HTML, security | Redis/cache, messaging, Service Bus, Docker, K8s, Azure, microservices, GraphQL, English, Blazor |
| R2-BR-30 | BR | [Analista Pleno Desenvolvedor .NET/SQL](https://www.linkedin.com/jobs/view/4484164003) | Accenture Brasil | LinkedIn | 2026-10-29 | São Paulo, São Paulo, Brazil | not shown | mid | - | C#, Azure, CI/CD, Azure DevOps, Git, Agile | AI tools |
| R2-BR-31 | BR | [.NET Engineer Pleno](https://www.linkedin.com/jobs/view/4475970454) | Avenue | LinkedIn | 2026-10-29 | Brazil | not shown | mid | - | NoSQL, async, messaging, RabbitMQ, observability, SOLID/patterns, MySQL | microservices, modernization |
| R2-BR-32 | BR | [Desenvolvedor Full Stack](https://www.infojobs.com.br/vaga-de-desenvolvedor-full-stack-junior-em-sao-paulo__12171007.aspx) | Education company (name withheld, see note) | InfoJobs | 2026-10-29 | Barueri, SP | hybrid + on-site | not stated | - | C#, Git, JS/TS/HTML | - |
| R2-BR-33 | BR | [Desenvolvedor de automação .Net - [K2-574]](https://www.linkedin.com/jobs/view/4484975155) | K2 Solutions | LinkedIn | 2026-10-29 | São Paulo, São Paulo, Brazil | remote | not stated (LinkedIn: Mid-Senior level) | - | C#, Agile | - |
| R2-BR-34 | BR | [Desenvolvedor C# Pleno](https://www.linkedin.com/jobs/view/4485243970) | abler Vagas | LinkedIn | 2026-10-29 | Santo André, São Paulo, Brazil | on-site | mid | - | C#, JS/TS/HTML | - |
| R2-BR-35 | BR | [8392 - Analista de Engenharia de Software .NET II](https://www.linkedin.com/jobs/view/4485386901) | B3 | LinkedIn | 2026-10-30 | São Paulo, São Paulo, Brazil | hybrid | mid | - | C#, ASP.NET Core, REST API, SQL Server, SPs/query tuning, unit tests, Azure, CI/CD, Agile, security, quality tool | messaging, Service Bus, observability, Azure DevOps, Git, serverless |
| R2-BR-36 | BR | [Engenheiro de Software Sênior (.NET)](https://www.linkedin.com/jobs/view/4483486278) | Fits 450 | LinkedIn | 2026-10-30 | Fortaleza, Ceará, Brazil | not shown | senior | - | C#, REST API, SQL Server, unit tests, CI/CD, Git, SOLID/patterns, microservices, modernization, security | - |
| R2-BR-37 | BR | [Desenvolvedor de Sistemas Jr. - São Paulo (Plantão)](https://www.linkedin.com/jobs/view/4484698606) | Target Sistemas | LinkedIn | 2026-11-03 | Brazil | not shown | junior | - | C#, SQL Server, Agile | REST API, Git, Angular, JS/TS/HTML, Node.js |
| R2-BR-38 | BR | [Desenvolvedor .NET](https://www.infojobs.com.br/vaga-de-desenvolvedor-net-em-sao-paulo__12183126.aspx) | Detsoft | InfoJobs | 2026-11-04 | São Paulo, SP | hybrid | not stated | BRL 2,300-4,640 / month | Agile | - |
| R2-BR-39 | BR | [Desenvolvedor .NET](https://www.infojobs.com.br/vaga-de-desenvolvedor-net-pleno-tryevo-em-sao-paulo__12186583.aspx) | TRAYYEVO | InfoJobs | 2026-11-04 | Campinas, SP | not shown | mid | BRL 7,000-9,000 / month | C#, REST API, SQL Server, Git, Agile | - |
| R2-BR-40 | BR | [Analista Desenvolvedor .NET Pleno](https://www.linkedin.com/jobs/view/4487534781) | Unisys | LinkedIn | 2026-11-04 | Rio de Janeiro, Rio de Janeiro, Brazil | not shown | mid | - | REST API, MVC, messaging, Git, Angular, JS/TS/HTML, security, AI tools | Agile |
| R2-INT-01 | INT (from BR) | [NET Developer)](https://www.linkedin.com/jobs/view/4415712184) | Perform | LinkedIn | 2026-10-17 | São Paulo, São Paulo, Brazil | remote | not stated (LinkedIn: Mid-Senior level) | - | C#, ASP.NET Core, REST API, EF, SQL Server, SPs/query tuning, Azure, Git, Angular, React, Vue, JS/TS/HTML, Agile, security, AI tools, English | - |
| R2-INT-02 | INT (from BR) | [(1403) Staff C# Engineer](https://www.linkedin.com/jobs/view/4420442919) | Nortal | LinkedIn | 2026-10-21 | São Paulo, São Paulo, Brazil | remote | senior | - | C#, REST API, PostgreSQL, SPs/query tuning, NoSQL, messaging, Kafka, Azure, AWS, observability, microservices, modernization, AI tools, English | - |
| R2-INT-03 | INT (from BR) | [Mid Level .NET Developer, Brazil](https://www.linkedin.com/jobs/view/4484969368) | CI&T | LinkedIn | 2026-10-29 | Brazil | not shown | mid | - | C#, ASP.NET Core, SQL Server, NoSQL, async, unit tests, integration tests, messaging, Service Bus, Docker, K8s, Azure, observability, CI/CD, Azure DevOps, GH Actions, Git, SOLID/patterns, microservices, modernization, security, AI tools, English | DDD, CQRS/ES, OpenTelemetry |
| R2-INT-04 | INT (from BR) | [Desenvolvedor Sênior .NET / P + D - Trabalho Remoto / REF#307378](https://www.linkedin.com/jobs/view/4487027100) | BairesDev | LinkedIn | 2026-11-03 | Brazil | not shown | senior | - | C#, MVC, SQL Server, SOLID/patterns, JS/TS/HTML, security, English | - |
| R2-INT-05 | INT (from BR) | [Senior .NET Developer - Remote Work / REF#307791](https://www.linkedin.com/jobs/view/4487010747) | BairesDev | LinkedIn | 2026-11-03 | São Paulo, São Paulo, Brazil | remote | senior | - | C#, unit tests, integration tests, CI/CD, SOLID/patterns, English | - |
| R2-INT-06 | INT (from BR) | [Engenheiro de Software .NET - Trabalho Remoto / REF#308182](https://www.linkedin.com/jobs/view/4487012559) | BairesDev | LinkedIn | 2026-11-03 | Greater Recife | not shown | not stated (LinkedIn: Associate) | - | C#, SOLID/patterns, security, English, external APIs | - |
| R2-INT-07 | INT | [Entry Level .NET Software Developer](https://www.linkedin.com/jobs/view/4476360569) | EAi Technologies | LinkedIn | 2026-10-06 | Vienna, VA | hybrid | junior | - | C#, SQL Server | - |
| R2-INT-08 | INT | [Senior Full-Stack Developer (.NET)](https://www.linkedin.com/jobs/view/4474968638) | EPAM Systems | LinkedIn | 2026-10-06 | Colombia | not shown | senior | - | C#, MVC, SPs/query tuning, SOLID/patterns, JS/TS/HTML, English | SQL Server, LEGACY-TECH, modernization |
| R2-INT-09 | INT | [Software Engineer - REST API Development, Officer](https://www.linkedin.com/jobs/view/4470208187) | State Street | LinkedIn | 2026-10-06 | Burlington, MA | not shown | not stated | $70,000-118,750 / year | C#, REST API, JWT/OAuth, Docker, K8s, Azure, observability, CI/CD, Git, SOLID/patterns, Agile, security, external APIs | unit tests, messaging, RabbitMQ, Kafka, Service Bus |
| R2-INT-10 | INT | [Senior Software Engineer, Full Stack (C# (.NET))](https://www.linkedin.com/jobs/view/4474415266) | TRG Screen | LinkedIn | 2026-10-06 | Belfast, Northern Ireland, United Kingdom | not shown | senior | - | C#, unit tests, Docker, Azure, AWS, observability, Git, SOLID/patterns, Angular, React, JS/TS/HTML, security, AI tools | SQL Server, PostgreSQL, messaging, RabbitMQ, Kafka, CI/CD, microservices |
| R2-INT-11 | INT | [Senior .NET Developer (Lisbon or Porto)](https://www.linkedin.com/jobs/view/4475401776) | KCS iT | LinkedIn | 2026-10-07 | Porto, Portugal | remote + hybrid + on-site | senior | - | C#, REST API, integration tests, Azure, CI/CD, Azure DevOps, GH Actions, Git, SOLID/patterns, microservices, Agile, English | Docker, K8s |
| R2-INT-12 | INT | [Senior .Net Developer](https://www.linkedin.com/jobs/view/4474825013) | Arvato | LinkedIn | 2026-10-08 | Mississauga, Ontario, Canada | not shown | senior | - | C#, REST API, SQL Server, SPs/query tuning, Docker, K8s, CI/CD, Git, SOLID/patterns, microservices, LEGACY-TECH, modernization, Angular, React, JS/TS/HTML, Agile, security, Blazor | Azure, AWS |
| R2-INT-13 | INT | [Senior .NET Software Engineer](https://www.linkedin.com/jobs/view/4474815771) | Closer Consulting | LinkedIn | 2026-10-08 | Lisbon Metropolitan Area | remote | senior | - | C#, ASP.NET Core, REST API, EF, async, unit tests, observability, CI/CD, Git, SOLID/patterns, AI tools, English | - |
| R2-INT-14 | INT | [C# .NET Developer (French Speaker)](https://www.linkedin.com/jobs/view/4477191028) | Dellent | LinkedIn | 2026-10-08 | Porto, Porto, Portugal | remote + hybrid | not stated | - | C#, REST API, MVC, NoSQL, async, unit tests, messaging, RabbitMQ, observability, SOLID/patterns, microservices, Agile, English, search, quality tool | - |
| R2-INT-15 | INT | [.NET Core Senior Developer](https://www.linkedin.com/jobs/view/4475963634) | ITSector | LinkedIn | 2026-10-08 | Braga, Braga, Portugal | remote + hybrid | senior | - | SQL Server, SOLID/patterns, microservices, JS/TS/HTML, English | Azure, Agile |
| R2-INT-16 | INT | [SENIOR .NET SOFTWARE ENGINEER (M/F)](https://www.linkedin.com/jobs/view/4476842417) | Aircash | LinkedIn | 2026-10-09 | Split, Split-Dalmatia, Croatia | not shown | senior | - | REST API, EF, SQL Server, SPs/query tuning, NoSQL, async, messaging, Service Bus, Azure, observability, microservices, LEGACY-TECH, search | Angular |
| R2-INT-17 | INT | [Senior Full-Stack .NET Developer](https://www.linkedin.com/jobs/view/4476239981) | EPAM Systems | LinkedIn | 2026-10-09 | Colombia | not shown | senior | - | C#, REST API, MVC, JWT/OAuth, SQL Server, CI/CD, Azure DevOps, LEGACY-TECH, modernization, JS/TS/HTML, security, English | - |
| R2-INT-18 | INT | [Software Developer](https://www.linkedin.com/jobs/view/4476829725) | FUNDVIEW | LinkedIn | 2026-10-09 | Lubbock, TX | on-site | not stated | $50,000-60,000 / year | C#, Angular, JS/TS/HTML, AI tools | - |
| R2-INT-19 | INT | [Backend C# Developer (.NET + AI-Assisted Development)](https://www.linkedin.com/jobs/view/4486887222) | Smart Apartment Data | LinkedIn | 2026-10-09 | Estonia | remote | not stated (LinkedIn: Mid-Senior level) | USD 3,000-3,500 / month | C#, REST API, EF, SQL Server, NoSQL, Docker, Azure, CI/CD, Git, SOLID/patterns, AI tools, English, AI in product, external APIs | - |
| R2-INT-20 | INT | [Software Engineer](https://www.linkedin.com/jobs/view/4478066503) | Leon Recruitment | LinkedIn | 2026-10-10 | Miami, FL | on-site | not stated (LinkedIn: Entry level) | $90,000-110,000 (period not stated) | C#, SQL Server, SPs/query tuning, Azure, SOLID/patterns, security, AI tools | REST API, CI/CD, Git, Agile |
| R2-INT-21 | INT | [Développeur(se) .NET Junior – H/F](https://www.linkedin.com/jobs/view/4478760896) | CARBON IT | LinkedIn | 2026-10-13 | Neuilly-sur-Seine, Île-de-France, France | not shown | junior | - | C#, CI/CD, Git, SOLID/patterns, Agile | REST API, Azure |
| R2-INT-22 | INT | [software developer .NET Sr.](https://www.linkedin.com/jobs/view/4478182999) | Acciona IT | LinkedIn | 2026-10-14 | Buenos Aires, Buenos Aires Province, Argentina | remote | senior | - | C#, ASP.NET Core, REST API, Git, JS/TS/HTML, Agile, Oracle | - |
| R2-INT-23 | INT | [Senior C#.Net Developer](https://www.linkedin.com/jobs/view/4478404857) | HFM | LinkedIn | 2026-10-14 | Athens, Attiki, Greece | hybrid | senior | - | C#, REST API, messaging, SOLID/patterns, English | PostgreSQL, NoSQL, Redis/cache, RabbitMQ |
| R2-INT-24 | INT | [Junior Software Engineer (C#)](https://www.linkedin.com/jobs/view/4479508748) | Starapple | LinkedIn | 2026-10-14 | Breda, North Brabant, Netherlands | not shown | junior | EUR 3,000-3,500 gross / month | C#, Angular | - |
| R2-INT-25 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4477326212) | Barings | LinkedIn | 2026-10-15 | London, England, United Kingdom | not shown | senior | - | C#, ASP.NET Core, SPs/query tuning, Azure, CI/CD, SOLID/patterns, Agile, AI tools, AI in product, external APIs | - |
| R2-INT-26 | INT | [C#/.NET Software Engineer](https://www.linkedin.com/jobs/view/4479120135) | MCA Italy | LinkedIn | 2026-10-15 | Rome, Latium, Italy | not shown | not stated | EUR 30,000-34,000 (period not stated) | C#, SQL Server, PostgreSQL, NoSQL, SOLID/patterns, security, AI tools | - |
| R2-INT-27 | INT | [Junior .NET Developer for Netcompany Banking Services (f/m)](https://www.linkedin.com/jobs/view/4460473197) | Netcompany | LinkedIn | 2026-10-15 | Warsaw, Mazowieckie, Poland | not shown | junior | - | C#, EF, Docker, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, Agile, English, quality tool | - |
| R2-INT-28 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4479799743) | WebBeds | LinkedIn | 2026-10-15 | Palma, Balearic Islands, Spain | not shown | senior | - | C#, async, unit tests, K8s, observability, CI/CD, SOLID/patterns, microservices, security, AI tools, perf/memory | NoSQL, Redis/cache, AWS, modernization, English, resilience, OpenTelemetry |
| R2-INT-29 | INT | [Senior Dotnet Developer](https://www.linkedin.com/jobs/view/4479359388) | Capgemini | LinkedIn | 2026-10-16 | Manchester Area, United Kingdom | hybrid | senior | - | C#, ASP.NET Core, REST API, JWT/OAuth, SPs/query tuning, Redis/cache, async, unit tests, messaging, RabbitMQ, Kafka, Service Bus, Azure, observability, CI/CD, SOLID/patterns, Clean Arch, microservices, Agile, security, AI tools, gRPC | AWS, Angular |
| R2-INT-30 | INT | [Senior Backend Engineer – .NET / Azure](https://www.linkedin.com/jobs/view/4480539989) | ORBYTA | LinkedIn | 2026-10-16 | Turin, Piedmont, Italy | not shown | senior | EUR 45,000-50,000 RAL (gross / year) | C#, ASP.NET Core, EF, SPs/query tuning, NoSQL, Redis/cache, messaging, Kafka, Service Bus, Docker, K8s, Azure, CI/CD, Azure DevOps, GH Actions, Git, SOLID/patterns, microservices, CQRS/ES, Agile, AI tools, gRPC, SignalR/WebSockets | - |
| R2-INT-31 | INT | [Professional C# Backend Entwickler (m/w/d) - Plattformservices](https://www.linkedin.com/jobs/view/4434648636) | PKE | LinkedIn | 2026-10-16 | Vienna, Vienna, Austria | remote | mid | from EUR 3,449.08 gross / month (collective agreement) | C#, ASP.NET Core, REST API, JWT/OAuth, EF, PostgreSQL, observability, CI/CD, SOLID/patterns, Clean Arch, Agile, English, SignalR/WebSockets | Azure, Git |
| R2-INT-32 | INT | [Entry Level C# Software Engineer](https://www.linkedin.com/jobs/view/4474836193) | CACI International Inc | LinkedIn | 2026-10-17 | Virginia Beach, VA | not shown | junior | $58,000-115,900 (period not stated) | C#, Agile, security, Oracle | - |
| R2-INT-33 | INT | [Senior .NET Software Engineer](https://www.linkedin.com/jobs/view/4368325638) | Inetum | LinkedIn | 2026-10-19 | Lisboa, Lisbon, Portugal | not shown | senior | - | C#, Redis/cache, unit tests, observability, CI/CD, Git, SOLID/patterns, LEGACY-TECH, modernization, Agile, security, English, OpenTelemetry | SQL Server, messaging, Oracle |
| R2-INT-34 | INT | [Senior Backend Engineer - .Net](https://www.linkedin.com/jobs/view/4409024490) | Trainline | LinkedIn | 2026-10-19 | London, England, United Kingdom | hybrid | senior | - | C#, REST API, JWT/OAuth, PostgreSQL, NoSQL, async, messaging, Docker, Azure, AWS, GCP, observability, CI/CD, GH Actions, Git, SOLID/patterns, microservices, security, AI tools | - |
| R2-INT-35 | INT | [Full Stack .NET Engineer](https://www.linkedin.com/jobs/view/4482155650) | Biller Genie | LinkedIn | 2026-10-21 | Belfast, Northern Ireland, United Kingdom | hybrid + on-site | not stated (LinkedIn: Mid-Senior level) | - | C#, REST API, MVC, EF, messaging, Azure, AWS, GCP, CI/CD, Azure DevOps, Git, SOLID/patterns, modernization, JS/TS/HTML, AI tools | serverless |
| R2-INT-36 | INT | [.NET Developer](https://www.linkedin.com/jobs/view/4482131717) | CONKORD | LinkedIn | 2026-10-21 | Lisbon, Lisbon, Portugal | remote + hybrid + on-site | not stated | - | C#, REST API, SQL Server, unit tests, Docker, K8s, Azure, AWS, CI/CD, Git, microservices, Agile, security, AI tools | - |
| R2-INT-37 | INT | [Software Engineer 1](https://www.linkedin.com/jobs/view/4474454416) | PharmaLex | LinkedIn | 2026-10-22 | Lublin, Lubelskie, Poland | remote + on-site | junior | - | C#, Git, security, AI tools | - |
| R2-INT-38 | INT | [Développeur C#.NET (Senior)](https://www.linkedin.com/jobs/view/4472387137) | SII Canada | LinkedIn | 2026-10-22 | Montreal, Quebec, Canada | not shown | senior | - | C#, NoSQL, async, Docker, K8s, Azure, observability, CI/CD, Git, SOLID/patterns, Angular, React, Agile | search |
| R2-INT-39 | INT | [Software Developer (Junior)](https://www.linkedin.com/jobs/view/4482423054) | UNCOMN | LinkedIn | 2026-10-22 | Maryland Heights, MO | not shown | junior | - | unit tests, security | C#, REST API |
| R2-INT-40 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4459767933) | Computershare Australia | LinkedIn | 2026-10-23 | Melbourne, Victoria, Australia | remote + hybrid | senior | - | C#, Docker, K8s, Azure, CI/CD, SOLID/patterns, microservices, React, Agile, AI tools | - |
| R2-INT-41 | INT | [Developer C# / .NET – X ONE Pricing](https://www.linkedin.com/jobs/view/4474330660) | Societe Generale | LinkedIn | 2026-10-23 | Montreal, Quebec, Canada | not shown | not stated | - | C#, REST API, NoSQL, unit tests, messaging, RabbitMQ, observability, CI/CD, Git, SOLID/patterns, modernization, security, AI tools, search, quality tool, MySQL | - |
| R2-INT-42 | INT | [.NET/C# Engineer, TD Securities](https://www.linkedin.com/jobs/view/4483144896) | TD | LinkedIn | 2026-10-23 | Toronto, Ontario, Canada | on-site | not stated | CAD 102,200-125,000 (period not stated) | C#, SQL Server, Redis/cache, integration tests, Azure, GCP, observability, CI/CD, Git, SOLID/patterns, Agile, security | - |
| R2-INT-43 | INT | [Junior .NET Developer bij Autonet](https://www.linkedin.com/jobs/view/4482838646) | Vitec Autonet | LinkedIn | 2026-10-23 | Dordrecht, South Holland, Netherlands | remote + hybrid | junior | - | C#, ASP.NET Core, MVC, SQL Server, PostgreSQL, JS/TS/HTML, AI tools | CI/CD, SOLID/patterns, microservices, LEGACY-TECH, Agile |
| R2-INT-44 | INT | [Senior C# / .NET Core Developer](https://www.linkedin.com/jobs/view/4480663413) | nextjobz | LinkedIn | 2026-10-23 | Dhaka, Dhaka, Bangladesh | remote + on-site | senior | - | C#, ASP.NET Core, REST API, JWT/OAuth, EF, SQL Server, NoSQL, Redis/cache, unit tests, messaging, Kafka, Docker, K8s, observability, SOLID/patterns, DDD, microservices, modernization, Agile, English, gRPC, SignalR/WebSockets, search | SPs/query tuning, CI/CD, security, external APIs |
| R2-INT-45 | INT | [Back-end .net Developer](https://www.linkedin.com/jobs/view/4473373457) | EY | LinkedIn | 2026-10-24 | Toronto, Ontario, Canada | not shown | not stated (LinkedIn: Mid-Senior level) | $65,500-99,000 (currency and period not stated) | C#, ASP.NET Core, REST API, Git, LEGACY-TECH, JS/TS/HTML | - |
| R2-INT-46 | INT | [(Junior) Softwareentwickler C# / .Net (m/w/d)](https://www.linkedin.com/jobs/view/4438581367) | FERCHAU | LinkedIn | 2026-10-25 | Karlsruhe, Baden-Württemberg, Germany | not shown | junior | - | C#, CI/CD, LEGACY-TECH, Agile, English | - |
| R2-INT-47 | INT | [Junior .Net Developer (f/m)](https://www.linkedin.com/jobs/view/4435906571) | Netcompany | LinkedIn | 2026-10-25 | Warsaw, Mazowieckie, Poland | not shown | junior | - | C#, EF, Docker, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, Agile, English, quality tool | - |
| R2-INT-48 | INT | [Backend .NET Software Engineer - Payments](https://www.linkedin.com/jobs/view/4483530901) | Betsson Group | LinkedIn | 2026-10-26 | Ta' Xbiex, Ta' Xbiex, Malta | remote + hybrid | not stated | - | C#, REST API, SQL Server, PostgreSQL, NoSQL, Redis/cache, Docker, K8s, Azure, AWS, Git, SOLID/patterns, microservices, LEGACY-TECH, JS/TS/HTML, security, English | messaging, RabbitMQ, Kafka, gRPC |
| R2-INT-49 | INT | [.NET systemutvecklare](https://www.linkedin.com/jobs/view/4483532862) | CANEA Partner Group AB | LinkedIn | 2026-10-26 | Gothenburg, Västra Götaland County, Sweden | not shown | not stated | - | C#, SQL Server, Angular, JS/TS/HTML, Agile, AI tools | - |
| R2-INT-50 | INT | [Senior Dotnet Developer](https://www.linkedin.com/jobs/view/4483225005) | Tata Consultancy Services | LinkedIn | 2026-10-26 | Belfast, Northern Ireland, United Kingdom | hybrid | senior | - | C#, REST API, SQL Server, SPs/query tuning, messaging, Kafka, Docker, K8s, Git, microservices, React, JS/TS/HTML, security, AI tools | CI/CD, Agile |
| R2-INT-51 | INT | [Senior Software Engineer C# .Net](https://www.linkedin.com/jobs/view/4484062264) | Client Server | LinkedIn | 2026-10-27 | Newcastle Upon Tyne, England, United Kingdom | on-site | senior | up to £120k (period not stated) | C# | - |
| R2-INT-52 | INT | [Senior C# Developer .Net Core - FinTech](https://www.linkedin.com/jobs/view/4484038198) | Client Server | LinkedIn | 2026-10-27 | Newcastle Upon Tyne, England, United Kingdom | on-site | senior | up to £110k+ (period not stated) | C#, SOLID/patterns | - |
| R2-INT-53 | INT | [Junior .NET Developer](https://www.linkedin.com/jobs/view/4436607723) | Copeland | LinkedIn | 2026-10-27 | Mikulov, South Moravia, Czechia | on-site | junior | - | SQL Server, observability, English | - |
| R2-INT-54 | INT | [.NET Developer](https://www.linkedin.com/jobs/view/4458261349) | Inetum | LinkedIn | 2026-10-27 | Lisboa, Lisbon, Portugal | not shown | not stated (LinkedIn: Executive) | - | C#, ASP.NET Core, REST API, MVC, EF, SQL Server, unit tests, Azure, CI/CD, Git, SOLID/patterns, modernization, JS/TS/HTML, Agile, security, English, external APIs | - |
| R2-INT-55 | INT | [Developer .Net](https://www.linkedin.com/jobs/view/4483223705) | TeamSystem | LinkedIn | 2026-10-27 | Madrid, Community of Madrid, Spain | not shown | not stated | - | C#, SQL Server, PostgreSQL, Git, SOLID/patterns, LEGACY-TECH, modernization, Angular, React, JS/TS/HTML, Node.js, Agile, AI tools | - |
| R2-INT-56 | INT | [Associate Application Developer](https://www.linkedin.com/jobs/view/4484119136) | Encore | LinkedIn | 2026-10-28 | Schiller Park, IL | not shown | junior | $64,506-83,858 (period not stated) | C#, SQL Server, LEGACY-TECH | MVC, CI/CD, Angular, JS/TS/HTML, Oracle |
| R2-INT-57 | INT | [.net Full Stack Developer](https://www.linkedin.com/jobs/view/4466921889) | Education company (name withheld, see note) | LinkedIn | 2026-10-28 | Torreon Metropolitan Area | remote | not stated | - | PostgreSQL, AWS, Git, React, JS/TS/HTML, MySQL | REST API, microservices, GraphQL |
| R2-INT-58 | INT | [Senior Software Engineer (.NET/C#)](https://www.linkedin.com/jobs/view/4483846868) | Ripple | LinkedIn | 2026-10-28 | London, England, United Kingdom | on-site | senior | - | C#, SQL Server, unit tests, Azure, observability, LEGACY-TECH, React, JS/TS/HTML, AI tools | - |
| R2-INT-59 | INT | [.NET Cloud Native API Developer (Banking/ Financial Services)](https://www.linkedin.com/jobs/view/4429908096) | CGI | LinkedIn | 2026-10-29 | Vancouver, British Columbia, Canada | not shown | not stated (LinkedIn: Entry level) | $75,000-125,000 (currency and period not stated) | C#, REST API, MVC, JWT/OAuth, Docker, K8s, Azure, microservices, modernization, Agile, security, AI tools | - |
| R2-INT-60 | INT | [.NET Developer - Newcastle upon Tyne](https://www.linkedin.com/jobs/view/4484972018) | Noir | LinkedIn | 2026-10-29 | Newcastle Upon Tyne, England, United Kingdom | remote | not stated (LinkedIn: Mid-Senior level) | £45,000-85,000 (period not stated) | C#, ASP.NET Core, EF, NoSQL, Azure, CI/CD, Azure DevOps, SOLID/patterns, JS/TS/HTML, Agile | - |
| R2-INT-61 | INT | [Associate Web Developer](https://www.linkedin.com/jobs/view/4381470221) | Prometheus Group | LinkedIn | 2026-10-29 | Raleigh, NC | on-site | junior | - | C#, ASP.NET Core, EF, SQL Server, unit tests, observability, SOLID/patterns, LEGACY-TECH, Angular, React, Agile, AI tools, MySQL | - |
| R2-INT-62 | INT | [BackEnd Developer](https://www.linkedin.com/jobs/view/4484555989) | SE Independent Delivery Services, Inc. | LinkedIn | 2026-10-29 | Seffner, FL | not shown | not stated (LinkedIn: Entry level) | - | C#, REST API, SQL Server, SPs/query tuning, unit tests, integration tests, Azure, Git, SOLID/patterns, Clean Arch, security | EF, Docker, CI/CD, Azure DevOps, Agile, serverless |
| R2-INT-63 | INT | [C# & .Net Developer](https://www.linkedin.com/jobs/view/4483093382) | UST | LinkedIn | 2026-10-29 | Guadalajara, Jalisco, Mexico | remote | not stated | - | C#, REST API, SPs/query tuning, async, unit tests, Azure, observability, CI/CD, security | - |
| R2-INT-64 | INT | [C# .NET Senior Developer](https://www.linkedin.com/jobs/view/4477822656) | Thales | LinkedIn | 2026-10-30 | Gambir, Jakarta, Indonesia | not shown | senior | - | C#, SQL Server, SPs/query tuning, CI/CD, Git, Agile, security, AI tools, English, quality tool | Azure, AWS |
| R2-INT-65 | INT | [Associate Software Engineer](https://www.linkedin.com/jobs/view/4485100022) | Urban Science | LinkedIn | 2026-10-30 | Detroit, MI | remote + hybrid | junior | - | C#, SQL Server, async, unit tests, integration tests, Azure, observability, CI/CD, Azure DevOps, Git, SOLID/patterns, microservices, LEGACY-TECH, modernization, Angular, JS/TS/HTML, Agile | - |
| R2-INT-66 | INT | [Senior .Net Developer](https://www.linkedin.com/jobs/view/4483480433) | Version 1 | LinkedIn | 2026-10-30 | Edinburgh, Scotland, United Kingdom | remote | senior | - | C#, MVC, EF, unit tests, messaging, Service Bus, Azure, CI/CD, Azure DevOps, Git, microservices, LEGACY-TECH, AI tools | SQL Server, Clean Arch, JS/TS/HTML |
| R2-INT-67 | INT | [Junior-Softwareentwickler Microsoft.NET (m/w/d)](https://www.linkedin.com/jobs/view/4477847003) | WTW | LinkedIn | 2026-10-31 | Wiesbaden, Hesse, Germany | remote + hybrid | junior | - | C#, REST API, JWT/OAuth, Azure, CI/CD, Azure DevOps, Git, microservices, LEGACY-TECH, AI tools | - |
| R2-INT-68 | INT | [Junior Software Engineer](https://www.linkedin.com/jobs/view/4431490525) | Medpace | LinkedIn | 2026-11-01 | Leuven, Flemish Region, Belgium | on-site | junior | - | C#, EF, SPs/query tuning, Azure, CI/CD, Azure DevOps, Git, Angular, GraphQL, English | modernization |
| R2-INT-69 | INT | [Staff Software Engineer, C#.NET](https://www.linkedin.com/jobs/view/4414760037) | Omnissa | LinkedIn | 2026-11-01 | Vancouver, British Columbia, Canada | hybrid | senior | CAD 285,000-323,050 / year (base) | C#, REST API, async, unit tests, integration tests, observability, CI/CD, LEGACY-TECH, security, AI tools, English | - |
| R2-INT-70 | INT | [Junior Software Developer](https://www.linkedin.com/jobs/view/4485420926) | Andromeda Systems Incorporated | LinkedIn | 2026-11-02 | Jacksonville, FL | not shown | junior | $30-35 / hour; $62,400-72,800 / year | C#, REST API, SQL Server, CI/CD, Git, microservices, LEGACY-TECH, Angular, JS/TS/HTML, Agile, security, AI tools | EF, unit tests, Azure, Azure DevOps |
| R2-INT-71 | INT | [Junior .NET Web Developer](https://www.linkedin.com/jobs/view/4486131605) | EUROPEAN DYNAMICS | LinkedIn | 2026-11-02 | Athens, Attiki, Greece | remote | junior | - | English | REST API, MVC, EF, Azure DevOps, Git, Angular, React |
| R2-INT-72 | INT | [Back End Developer](https://www.linkedin.com/jobs/view/4486171087) | Konnekt | LinkedIn | 2026-11-02 | Hamrun, Malta | not shown | not stated (LinkedIn: Entry level) | - | C#, ASP.NET Core, REST API, EF, SQL Server, PostgreSQL, Azure DevOps, Git, SOLID/patterns, LEGACY-TECH, security, SignalR/WebSockets, MySQL | - |
| R2-INT-73 | INT | [Associate Software Engineer .NET (Madrid)](https://www.linkedin.com/jobs/view/4486849345) | Auctane | LinkedIn | 2026-11-03 | Madrid, Community of Madrid, Spain | remote + hybrid | junior | - | C#, AWS, CI/CD, SOLID/patterns, microservices, JS/TS/HTML, Agile, English | - |
| R2-INT-74 | INT | [Software Developer (.NET) / AI-Driven Development](https://www.linkedin.com/jobs/view/4486845612) | ENTERSOFTONE | LinkedIn | 2026-11-03 | Athens Metropolitan Area | hybrid | not stated (LinkedIn: Associate) | - | C#, Git, AI tools | - |
| R2-INT-75 | INT | [Senior Software Engineer, C# .NET](https://www.linkedin.com/jobs/view/4485011076) | Enterprise Recruitment Ltd | LinkedIn | 2026-11-03 | Wokingham, England, United Kingdom | remote | senior | - | C#, ASP.NET Core, REST API, MVC, Docker, observability, LEGACY-TECH, Agile, security, Blazor | - |
| R2-INT-76 | INT | [.Net Developer](https://www.linkedin.com/jobs/view/4486066476) | KCS iT | LinkedIn | 2026-11-03 | Lisbon, Portugal | remote + hybrid + on-site | not stated (LinkedIn: Mid-Senior level) | - | C#, ASP.NET Core, REST API, JWT/OAuth, EF, SQL Server, PostgreSQL, unit tests, Docker, K8s, Azure, CI/CD, Git, SOLID/patterns, microservices, security, English, SignalR/WebSockets | - |
| R2-INT-77 | INT | [Back End Developer C# .NET](https://www.linkedin.com/jobs/view/4486871723) | Keytrade Bank | LinkedIn | 2026-11-03 | Brussels Metropolitan Area | remote + hybrid | not stated (LinkedIn: Mid-Senior level) | - | C#, REST API, EF, SQL Server, async, unit tests, messaging, RabbitMQ, Service Bus, AWS, CI/CD, Git, SOLID/patterns, DDD, Agile, English, OpenAPI, gRPC, MySQL | - |
| R2-INT-78 | INT | [.NET Developer Junior](https://www.linkedin.com/jobs/view/4484688394) | Lottomatica | LinkedIn | 2026-11-03 | Rome, Latium, Italy | hybrid | junior | - | C#, Dapper, SQL Server, NoSQL, Redis/cache, messaging, RabbitMQ, CI/CD, Git, microservices, LEGACY-TECH, AI tools, English, MassTransit | - |
| R2-INT-79 | INT | [Software Engineer .NET Senior](https://www.linkedin.com/jobs/view/4485028265) | Softtek | LinkedIn | 2026-11-03 | Bogota, D.C., Capital District, Colombia | remote | senior | - | SQL Server, CI/CD, Git, SOLID/patterns, LEGACY-TECH, React, AI tools, English | - |
| R2-INT-80 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4487247462) | Alfa Laval | LinkedIn | 2026-11-04 | Pune City, Maharashtra, India | not shown | senior | - | C#, REST API, integration tests, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, microservices, Agile, English, serverless | React, JS/TS/HTML |
| R2-INT-81 | INT | [Senior .Net Developer](https://www.linkedin.com/jobs/view/4485086265) | Isio | LinkedIn | 2026-11-04 | Manchester Area, United Kingdom | hybrid | senior | - | C#, ASP.NET Core, REST API, SQL Server, PostgreSQL, SPs/query tuning, async, unit tests, integration tests, messaging, workers/jobs, Docker, Azure, AWS, observability, Git, SOLID/patterns, security, GraphQL, AI tools, message retries | Redis/cache, K8s, CI/CD |
| R2-INT-82 | INT | [.NET Software Engineer](https://www.linkedin.com/jobs/view/4487256214) | OAG | LinkedIn | 2026-11-04 | Vilnius, Vilniaus, Lithuania | remote | not stated (LinkedIn: Mid-Senior level) | EUR 4,000-5,667 gross / month | C#, async, messaging, Docker, AWS, observability, CI/CD, SOLID/patterns, Agile, AI tools, English, serverless, AI in product, external APIs | - |
| R2-INT-83 | INT | [Senior Software Developer - C#/.NET - London, Hybrid](https://www.linkedin.com/jobs/view/4487273611) | Pinewood.AI | LinkedIn | 2026-11-04 | London, England, United Kingdom | hybrid + on-site | senior | - | C#, REST API, MVC, SQL Server, SPs/query tuning, Azure, CI/CD, Azure DevOps, SOLID/patterns, JS/TS/HTML, Agile, security, external APIs | - |
| R2-INT-84 | INT | [Application Developer](https://www.linkedin.com/jobs/view/4486389051) | Spearhead Labs, Inc | LinkedIn | 2026-11-04 | Cincinnati, OH | remote + hybrid | not stated (LinkedIn: Entry level) | - | C#, ASP.NET Core, REST API, SQL Server, SPs/query tuning, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, modernization, JS/TS/HTML, Blazor | - |
| R2-INT-85 | INT | [Senior Backend Engineer (.NET / Azure)](https://www.linkedin.com/jobs/view/4487232476) | Stanhope Financial | LinkedIn | 2026-11-04 | Vilnius, Vilniaus, Lithuania | not shown | senior | EUR 5,000-6,000 gross / month | C#, REST API, messaging, Azure, CI/CD, Azure DevOps, microservices, MySQL | Blazor |
| R2-INT-86 | INT | [Dotnet Developer](https://www.linkedin.com/jobs/view/4486561360) | Celerates | LinkedIn | 2026-11-05 | Jakarta, Indonesia | not shown | not stated (LinkedIn: Entry level) | - | C#, ASP.NET Core, REST API, SQL Server, PostgreSQL, SPs/query tuning, NoSQL, Redis/cache, SignalR/WebSockets | - |
| R2-INT-87 | INT | [Software Engineer .NET (ASP .NET MVC / .NET Core)](https://www.linkedin.com/jobs/view/4468905336) | Gruppo Euris Spa | LinkedIn | 2026-11-05 | Bologna, Emilia-Romagna, Italy | not shown | not stated (LinkedIn: Mid-Senior level) | - | C#, MVC, EF, SQL Server, unit tests, LEGACY-TECH, Agile, Oracle | Azure, AWS, CI/CD, AI tools, English |
| R2-INT-88 | INT | [Software Engineer- Semiconductor Technology (C#/.NET)](https://www.linkedin.com/jobs/view/4485590171) | Keysight Technologies | LinkedIn | 2026-11-05 | Santa Rosa, CA | not shown | not stated | $127,109-164,580 (Santa Rosa; period not stated) | C#, observability, CI/CD, Git, SOLID/patterns, LEGACY-TECH, AI tools | SQL Server |
| R2-INT-89 | INT | [.NET Developer (C# / Microservices)](https://www.linkedin.com/jobs/view/4486593178) | OlyBet Group | LinkedIn | 2026-11-05 | Tallinn, Harjumaa, Estonia | not shown | not stated (LinkedIn: Mid-Senior level) | - | C#, ASP.NET Core, REST API, EF, Docker, Git, microservices, English, Blazor | - |

## 6. Competency frequency

### 6.1 Round 1 vocabulary (automated, both rounds re-coded with one dictionary)

"R1 published" is round 1's own count (section 6 of round 1, "All any"). "R1 re-coded" is this round's dictionary applied to the same 69 texts. "New" covers the 129 new postings. The other columns cover the full 198. "req" means required or named in the duties; "any" means required or nice-to-have.

| Competency | R1 published (n=69) | R1 re-coded (n=69) | New (n=129) | BR any (n=77) | INT any (n=121) | All req (n=198) | All any (n=198) |
|---|---|---|---|---|---|---|---|
| C# named | 63 (91%) | 58 (84%) | 118 (91%) | 66 (86%) | 110 (91%) | 174 (88%) | 176 (89%) |
| .NET modern version named (6/7/8/9/10) | 16 (23%) | 15 (22%) | 14 (11%) | 15 (19%) | 14 (12%) | 28 (14%) | 29 (15%) |
| ASP.NET Core named | 15 (22%) | 12 (17%) | 26 (20%) | 10 (13%) | 28 (23%) | 36 (18%) | 38 (19%) |
| Web API / REST (any) | 44 (64%) | 41 (59%) | 68 (53%) | 43 (56%) | 66 (55%) | 102 (52%) | 109 (55%) |
| MVC / Razor | 16 (23%) | 17 (25%) | 22 (17%) | 16 (21%) | 23 (19%) | 35 (18%) | 39 (20%) |
| AuthN/AuthZ protocol named (JWT/OAuth2/OIDC/Identity) | 6 (9%) | 6 (9%) | 11 (9%) | 5 (6%) | 12 (10%) | 17 (9%) | 17 (9%) |
| EF Core / Entity Framework | 24 (35%) | 24 (35%) | 30 (23%) | 18 (23%) | 36 (30%) | 47 (24%) | 54 (27%) |
| Dapper | 8 (12%) | 8 (12%) | 3 (2%) | 7 (9%) | 4 (3%) | 11 (6%) | 11 (6%) |
| SQL Server / T-SQL | 39 (57%) | 36 (52%) | 62 (48%) | 36 (47%) | 62 (51%) | 89 (45%) | 98 (49%) |
| PostgreSQL | 14 (20%) | 13 (19%) | 19 (15%) | 13 (17%) | 19 (16%) | 28 (14%) | 32 (16%) |
| Stored procedures / query tuning | 20 (29%) | 17 (25%) | 27 (21%) | 14 (18%) | 30 (25%) | 40 (20%) | 44 (22%) |
| NoSQL (MongoDB/Redis/Cosmos/Dynamo/Elastic) | 23 (33%) | 21 (30%) | 26 (20%) | 17 (22%) | 30 (25%) | 39 (20%) | 47 (24%) |
| Redis / caching | 10 (14%) | 10 (14%) | 14 (11%) | 7 (9%) | 17 (14%) | 18 (9%) | 24 (12%) |
| Async / concurrency | 14 (20%) | 13 (19%) | 22 (17%) | 14 (18%) | 21 (17%) | 35 (18%) | 35 (18%) |
| Unit testing | 38 (55%) | 35 (51%) | 44 (34%) | 39 (51%) | 40 (33%) | 75 (38%) | 79 (40%) |
| Test framework named (xUnit/NUnit/MSTest) | 8 (12%) | 8 (12%) | 5 (4%) | 7 (9%) | 6 (5%) | 10 (5%) | 13 (7%) |
| Integration testing | 9 (13%) | 5 (7%) | 9 (7%) | 1 (1%) | 13 (11%) | 14 (7%) | 14 (7%) |
| Messaging (any: queues, events, brokers) | 35 (51%) | 34 (49%) | 40 (31%) | 36 (47%) | 38 (31%) | 58 (29%) | 74 (37%) |
| RabbitMQ | 14 (20%) | 14 (20%) | 19 (15%) | 18 (23%) | 15 (12%) | 24 (12%) | 33 (17%) |
| Kafka | 10 (14%) | 10 (14%) | 11 (9%) | 8 (10%) | 13 (11%) | 14 (7%) | 21 (11%) |
| Azure Service Bus | 10 (14%) | 10 (14%) | 12 (9%) | 7 (9%) | 15 (12%) | 15 (8%) | 22 (11%) |
| Background jobs / workers | 9 (13%) | 9 (13%) | 2 (2%) | 7 (9%) | 4 (3%) | 10 (5%) | 11 (6%) |
| Docker / containers | 29 (42%) | 26 (38%) | 38 (29%) | 27 (35%) | 37 (31%) | 48 (24%) | 64 (32%) |
| Kubernetes | 15 (22%) | 13 (19%) | 21 (16%) | 12 (16%) | 22 (18%) | 25 (13%) | 34 (17%) |
| Azure | 29 (42%) | 32 (46%) | 55 (43%) | 24 (31%) | 63 (52%) | 69 (35%) | 87 (44%) |
| AWS | 24 (35%) | 24 (35%) | 19 (15%) | 12 (16%) | 31 (26%) | 35 (18%) | 43 (22%) |
| GCP | 7 (10%) | 6 (9%) | 5 (4%) | 4 (5%) | 7 (6%) | 8 (4%) | 11 (6%) |
| Cloud (any) | 46 (67%) | 47 (68%) | 74 (57%) | 38 (49%) | 83 (69%) | 106 (54%) | 121 (61%) |
| Observability (any mention) | 27 (39%) | 31 (45%) | 42 (33%) | 31 (40%) | 42 (35%) | 66 (33%) | 73 (37%) |
| Observability tool named | 9 (13%) | 8 (12%) | 19 (15%) | 12 (16%) | 15 (12%) | 21 (11%) | 27 (14%) |
| CI/CD (any) | 37 (54%) | 39 (57%) | 74 (57%) | 38 (49%) | 75 (62%) | 97 (49%) | 113 (57%) |
| Azure DevOps | 17 (25%) | 19 (28%) | 30 (23%) | 22 (29%) | 27 (22%) | 37 (19%) | 49 (25%) |
| GitHub Actions | 5 (7%) | 4 (6%) | 5 (4%) | 1 (1%) | 8 (7%) | 7 (4%) | 9 (5%) |
| Git | 40 (58%) | 36 (52%) | 72 (56%) | 46 (60%) | 62 (51%) | 98 (49%) | 108 (55%) |
| SOLID / design patterns / clean code | 37 (54%) | 35 (51%) | 67 (52%) | 29 (38%) | 73 (60%) | 99 (50%) | 102 (52%) |
| Clean / Hexagonal Architecture | 8 (12%) | 8 (12%) | 7 (5%) | 10 (13%) | 5 (4%) | 12 (6%) | 15 (8%) |
| DDD | 7 (10%) | 7 (10%) | 7 (5%) | 9 (12%) | 5 (4%) | 12 (6%) | 14 (7%) |
| Microservices | 26 (38%) | 25 (36%) | 38 (29%) | 19 (25%) | 44 (36%) | 55 (28%) | 63 (32%) |
| CQRS / Event Sourcing / MediatR | 9 (13%) | 7 (10%) | 6 (5%) | 9 (12%) | 4 (3%) | 9 (5%) | 13 (7%) |
| Legacy .NET tech named | 21 (30%) | 21 (30%) | 35 (27%) | 21 (27%) | 35 (29%) | 50 (25%) | 56 (28%) |
| Migration / modernization | 9 (13%) | 11 (16%) | 24 (19%) | 14 (18%) | 21 (17%) | 28 (14%) | 35 (18%) |
| Angular | 16 (23%) | 16 (23%) | 26 (20%) | 21 (27%) | 21 (17%) | 34 (17%) | 42 (21%) |
| React | 15 (22%) | 16 (23%) | 20 (16%) | 15 (19%) | 21 (17%) | 28 (14%) | 36 (18%) |
| Vue | 4 (6%) | 4 (6%) | 2 (2%) | 3 (4%) | 3 (2%) | 6 (3%) | 6 (3%) |
| JS/TS/HTML/CSS | 21 (30%) | 24 (35%) | 46 (36%) | 31 (40%) | 39 (32%) | 61 (31%) | 70 (35%) |
| Node.js | 4 (6%) | 4 (6%) | 2 (2%) | 4 (5%) | 2 (2%) | 5 (3%) | 6 (3%) |
| Agile / Scrum | 31 (45%) | 30 (43%) | 61 (47%) | 37 (48%) | 54 (45%) | 79 (40%) | 91 (46%) |
| Security (any mention) | 29 (42%) | 30 (43%) | 49 (38%) | 27 (35%) | 52 (43%) | 76 (38%) | 79 (40%) |
| GraphQL | not measured | 3 (4%) | 4 (3%) | 2 (3%) | 5 (4%) | 4 (2%) | 7 (4%) |
| AI-assisted development / LLM | 20 (29%) | 25 (36%) | 48 (37%) | 23 (30%) | 50 (41%) | 64 (32%) | 73 (37%) |
| English (language requirement) | 14 (20%) | 14 (20%) | 41 (32%) | 8 (10%) | 47 (39%) | 48 (24%) | 55 (28%) |
| Performance / scalability (any mention) | not measured | 47 (68%) | 77 (60%) | 49 (64%) | 75 (62%) | 122 (62%) | 124 (63%) |
| Oracle | not measured | 5 (7%) | 9 (7%) | 8 (10%) | 6 (5%) | 11 (6%) | 14 (7%) |
| MySQL / MariaDB | not measured | 3 (4%) | 8 (6%) | 2 (3%) | 9 (7%) | 11 (6%) | 11 (6%) |
| Swagger / OpenAPI | not measured | 3 (4%) | 4 (3%) | 5 (6%) | 2 (2%) | 7 (4%) | 7 (4%) |
| Code review wording (code review, pull requests, revisão de código) | not measured | 36 (52%) | 41 (32%) | 37 (48%) | 40 (33%) | 74 (37%) | 77 (39%) |
| Legacy wording, strict ("legacy", "legado") | not measured (round 1's broader row: 18, 26%) | 10 (14%) | 13 (10%) | 10 (13%) | 13 (11%) | 21 (11%) | 23 (12%) |

Round 1 measured "Oracle / MySQL" as one row (8, 12%). Here the two are split.

### 6.2 New vocabulary (every match read in context)

| Competency (verified by reading each match) | R1 postings | New postings | BR | INT | All req | All any (n=198) |
|---|---|---|---|---|---|---|
| gRPC | 1 | 5 | 0 | 6 | 5 | 6 (3%) |
| SignalR / WebSockets named | 0 | 7 | 1 | 6 | 6 | 7 (4%) |
| SignalR by name | 0 | 4 | 1 | 3 | 3 | 4 (2%) |
| Serverless (Azure Functions / AWS Lambda) | 6 | 8 | 7 | 7 | 9 | 14 (7%) |
| Native AOT | 2 | 0 | 0 | 2 | 1 | 2 (1%) |
| Performance / memory named (profiling, GC, benchmarks) | 0 | 1 | 0 | 1 | 1 | 1 (1%) |
| AI features in the product (LLM/model integration) | 4 | 4 | 3 | 5 | 6 | 8 (4%) |
| Search engine (Elasticsearch / OpenSearch as a product data store) | 1 | 5 | 0 | 6 | 5 | 6 (3%) |
| HTTP resilience named (Polly / HTTP retry / timeout policy) | 2 | 1 | 1 | 2 | 2 | 3 (2%) |
| Retries for messages or workflows (not HTTP) | 2 | 1 | 0 | 3 | 2 | 3 (2%) |
| Polly by name | 1 | 1 | 0 | 2 | 1 | 2 (1%) |
| OpenTelemetry | 3 | 3 | 0 | 6 | 2 | 6 (3%) |
| MassTransit | 1 | 1 | 0 | 2 | 2 | 2 (1%) |
| Minimal APIs | 0 | 1 | 1 | 0 | 0 | 1 (1%) |
| .NET 10 named | 0 | 2 | 1 | 1 | 2 | 2 (1%) |
| Blazor | 0 | 6 | 1 | 5 | 4 | 6 (3%) |
| Code-quality tool named (SonarQube, ReSharper, Veracode, Checkmarx) | 3 | 8 | 5 | 6 | 9 | 11 (6%) |
| External HTTP API integration (consuming third-party or partner APIs) | 16 | 12 | 13 | 15 | 26 | 28 (14%) |

What the verified rows contain:
- **External HTTP API integration** (28, 14%): duties such as "third-party API integrations (payments, banking, credit)" (OTR Solutions INT-01), "Integração com APIs internas e externas" (Newbacon BR-15), "integrações com APIs de mensageria, como a WhatsApp Cloud API" (HelenaCRM R2-BR-21), "Integrar sistemas internos do banco com parceiros" (South System), "Experience integrating AI or third-party APIs" (Smart Apartment Data). Consuming REST APIs counts; integration with a database or broker does not.
- **HTTP resilience** (3, 2%): Polly is named only by ALTEN Mexico ("resiliencia (ej. Polly)", next to "manejo de HttpClient") and WebBeds (nice-to-have). Grupo Mooven lists "HTTP/REST: ... timeout, retry e tratamento de erros". **Retries for messages or workflows** are a separate row (3, 2%): BlackStone eIT (RabbitMQ "retries, acknowledgements, dead-letter queues"), Isio ("message delivery, retries, idempotency") and N-iX ("long-running workflows ... retries"). They are about brokers and workflows, not HTTP calls. `Microsoft.Extensions.Http.Resilience` and `IHttpClientFactory` are named by no posting.
- **gRPC** (6, all INT): Vivaticket, Capgemini UK, Keytrade Bank, ORBYTA, nextjobz, and Betsson (nice-to-have).
- **SignalR** by name (4): HelenaCRM (nice), ORBYTA, nextjobz, Konnekt. WebSockets is named by 3 more (PKE, KCS iT, Celerates).
- **Serverless** (14): AWS Lambda (Webmotors x2, b2egroup, CoStar, DQR Tech, HelenaCRM), Azure Functions (N-iX x2, B3, Porto, SE Independent Delivery Services, Biller Genie, Alfa Laval), "serverless patterns" (OAG).
- **Native AOT** (2): both N-iX, the company round 1 already noted.
- **Performance and memory** by name (1): WebBeds ("Benchmark and profile in production"). Generic "performance/scalability" wording appears in 124 postings (63%), so this is a skill that postings claim to want but almost never describe.
- **Code quality**: a tool is named in 11 (SonarQube in 9, ReSharper in StoneX, Veracode in B3, Checkmarx in Dellent); "code review" wording is in 77 (39%). No posting names .NET analyzers, `.editorconfig` or StyleCop.
- **AI features in the product** (8): integrating LLM APIs (Vetta nice, Blite: "LLMs (OpenAI, Azure OpenAI, Anthropic, Hugging Face)"), HelenaCRM ("Funcionalidades baseadas em LLMs", nice), CoStar ("Build and integrate AI skills, agents, tools"), Avalara ("agentic property tax workflows"), Barings ("embed AI capabilities into existing systems"), OAG ("embedding AI throughout our intelligence layer"), Smart Apartment Data. Stone round 1 BR-24 is not counted: it asks for "interesse/conhecimento no ecossistema de LLMs (Agentes, MCP, RAG)" next to AI coding tools, which is knowledge of LLMs, not building product features. **Semantic Kernel** is named once (Blite, round 1, in its list of AI tools); **Microsoft.Extensions.AI** is named by none.
- **Search** (6): Elasticsearch as a product data store or search engine (Vivaticket, Aircash, Societe Generale, Dellent, nextjobz, SII Canada as an asset). Stone and Inetum name Elastic or OpenSearch only for observability, and those are not counted here.
- **Oracle** 14 (7%) and **MySQL/MariaDB** 11 (6%) (automated, 6.1). Several Oracle mentions in BR are PL/SQL (Talent Group 11384: "Domínio em PL/SQL (procedures, functions, triggers, packages) – Oracle").
- **.NET 10** is named by 2 of 198: R2-BR-14 ("C# e .NET 8, .NET 9 ou .NET 10") and Noir ("NET 10.0, ASP.NET Core, C# 14, .NET Aspire"). Minimal APIs are named once (R2-BR-14, nice-to-have). Blazor is named 6 times (5 INT), but 2 of those list it only as one front-end option among others.

Named libraries across all 198 postings (full-text search):

| Library | Postings |
| --- | --- |
| Entity Framework | 54 |
| NUnit | 12 |
| xUnit | 11 |
| Dapper | 11 |
| MSTest | 6 |
| Moq | 5 |
| Polly | 2 |
| MassTransit | 2 |
| MediatR | 2 |
| Hangfire | 1 |
| Quartz | 1 |
| AutoMapper | 1 |
| FluentValidation | 1 |
| .NET Aspire | 1 |
| Serilog | 0 |
| Testcontainers | 0 |

## 7. Adoption data (surveys and package downloads, not postings)

### 7.1 Stack Overflow Developer Survey 2026

Sources:
- https://survey.stackoverflow.co/2026 (overview: 30,903 responses, 169 countries);
- https://survey.stackoverflow.co/2026/methodology (fielded 2026-06-23 to 2026-08-05);
- https://survey.stackoverflow.co/2026/technology/data (tables below; markdown at `technology/data.md`).

The questions ask about "extensive development work in the past year", and the base is all respondents who answered that question. It is not limited to professional developers or to .NET users.

| Item | Used | Admired | Base (n) |
| --- | --- | --- | --- |
| C# | 27.1% (8th; Java 27.6%, PHP 17.7%) | 50.0% (desired 16.5%) | 14,099 |
| Visual Basic (.NET) | 4.0% | 25.5% | 14,099 |
| ASP.NET Core | 19.9% (4th among web frameworks) | 58.0% (desired 13.8%) | 10,281 |
| ASP.NET (classic) | 13.9% | 31.7% | 10,281 |
| Blazor | 6.7% | 47.4% | 10,281 |
| NuGet | 18.6% | - | 10,889 |
| Microsoft Azure | 25.1% (AWS 41.8%, Google Cloud 24.5%) | 43.2% (AWS 45.8%) | 10,889 |
| Docker / Docker Compose | 59.1% | - | 10,889 |
| Kubernetes | 26.0% | - | 10,889 |
| xUnit.net | 10.7% | 52.9% | 10,604 |
| NUnit | 8.7% | 40.5% | 10,604 |
| MSTest | 0.4% | 63.8% | 10,604 |
| Testcontainers | 7.8% | 54.5% | 10,604 |
| SonarQube / SonarCloud | 18.8% | 40.2% | 10,604 |
| PostgreSQL | 57.9% | - | 12,061 |
| MySQL | 35.1% | - | 12,061 |
| Redis | 28.3% | - | 12,061 |
| Microsoft SQL Server | 27.1% | - | 12,061 |
| Elasticsearch | 14.8% | - | 12,061 |
| Oracle | 9.4% | - | 12,061 |

### 7.2 JetBrains State of Developer Ecosystem 2025

Sources: https://devecosystem-2025.jetbrains.com/ (24,534 respondents after data cleaning, survey run April to June 2025, weighted by geography, employment, languages and JetBrains product use) and https://devecosystem-2025.jetbrains.com/tools-and-trends (values read from the rendered page). No 2026 edition existed on the research date: `https://www.jetbrains.com/lp/devecosystem-2026/` returned 404.

- "Primary programming languages": C# **12%** (Python 35%, Java 33%, JavaScript 26%, TypeScript 22%, HTML/CSS 16%, SQL 16%, C++ 11%, PHP 9%, Kotlin 8%).
- "Programming languages" usage chart, 2017–2025, with these 2025 values in the legend: C# **21%** (JavaScript 61%, Python 57%, Java 49%, TypeScript 42%, C++ 25%, Go 20%, PHP 17%).
- The same page says PHP is in "long-term decline". C# is not in its top five "languages developers want to adopt next" (Go, Rust, Python, Kotlin, TypeScript).

### 7.3 NuGet total downloads

Source: the NuGet search service, `https://azuresearch-usnc.nuget.org/query?q=packageid:<id>&prerelease=true` (field `totalDownloads`), read on 2026-11-05.

These totals:
- are cumulative since the first version;
- count every restore, including CI builds;
- count a package again each time another package pulls it in as a dependency.

They favor old and transitive packages, so they measure footprint, not hiring demand.

| Package | Latest version listed | Total downloads |
| --- | --- | --- |
| Serilog | 4.4.1-dev-02453 | 3,540,500,912 |
| Microsoft.EntityFrameworkCore | 10.0.14 | 2,696,272,041 |
| Polly | 8.9.0 | 1,770,745,839 |
| Microsoft.Data.SqlClient | 7.1.1 | 1,725,814,518 |
| StackExchange.Redis | 4.0.155-alpha | 1,313,016,000 |
| Swashbuckle.AspNetCore | 10.3.1 | 1,292,709,737 |
| AutoMapper | 16.2.0 | 1,186,355,626 |
| FluentValidation | 12.2.0 | 1,128,238,228 |
| xunit | 2.9.3 | 1,126,023,782 |
| Dapper | 2.1.89 | 819,213,038 |
| OpenTelemetry | 1.20.1 | 778,038,932 |
| NUnit | 5.0.0 | 735,795,618 |
| RabbitMQ.Client | 7.2.2 | 550,885,950 |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.3 | 547,965,510 |
| MediatR | 14.2.0 | 516,072,747 |
| MSTest.TestFramework | 4.5.2 | 512,904,812 |
| Azure.Messaging.ServiceBus | 7.21.0 | 442,786,446 |
| Hangfire.Core | 1.8.25 | 440,307,402 |
| Confluent.Kafka | 2.16.0 | 288,302,756 |
| MySqlConnector | 2.6.2 | 273,258,254 |
| MassTransit | 9.2.5 | 261,383,289 |
| Grpc.AspNetCore | 2.85.0 | 233,627,887 |
| Quartz | 4.7.2 | 195,271,020 |
| Microsoft.Extensions.Http.Resilience | 10.11.0 | 187,538,590 |
| Microsoft.AspNetCore.SignalR.Client | 10.0.14 | 151,334,820 |
| Testcontainers | 4.16.0 | 144,031,370 |
| Oracle.ManagedDataAccess.Core | 23.26.400 | 140,942,604 |
| OpenAI | 2.15.0 | 91,606,596 |
| xunit.v3 | 4.0.2 | 64,608,512 |
| Microsoft.Extensions.AI | 10.11.0 | 41,483,314 |
| Elastic.Clients.Elasticsearch | 9.5.3 | 36,225,556 |
| OpenSearch.Client | 2.3.0 | 32,460,634 |
| Microsoft.SemanticKernel | 1.81.0 | 18,660,773 |

### 7.4 Adoption versus demand

| Topic | Adoption | Demand in the 198 postings |
| --- | --- | --- |
| Databases | PostgreSQL 57.9% vs SQL Server 27.1% (all developers, SO 2026) | SQL Server 49% vs PostgreSQL 16%: .NET postings are SQL Server-first |
| Logging | Serilog 3.5 billion downloads, the largest in the table | Serilog named by 0 postings |
| Libraries | AutoMapper, FluentValidation and MediatR each above 0.5 billion downloads | Each named by 1–2 postings |
| Testing | xunit 1.13 billion downloads vs NUnit 0.74 billion; Testcontainers 7.8% usage | xUnit 11 and NUnit 12 postings; Testcontainers 0 |
| HTTP resilience | Polly 1.77 billion downloads and Microsoft.Extensions.Http.Resilience 188 million | HTTP resilience is named by 3 postings (2%); 3 more name retries for messages or workflows |
| gRPC, SignalR | Grpc.AspNetCore 234 million and SignalR.Client 151 million downloads | 3% and 2% of postings |
| AI in apps | OpenAI 92 million, Microsoft.Extensions.AI 41 million, Semantic Kernel 19 million downloads | AI in the product is named by 8 postings; Semantic Kernel once, Microsoft.Extensions.AI never |
| Code quality | SonarQube/SonarCloud 18.8% usage (SO 2026) | A quality tool is named by 6% of postings; code review wording appears in 39% |

Libraries such as these are things a team adopts after hiring. Postings name the platform (C#, ASP.NET Core, EF, SQL Server, a broker, a cloud), not most of the packages the team uses.

## 8. Salary ranges (as stated)

Only figures a posting or a survey states are listed. The currency and period are exactly as written; "period not stated" means the posting gives none.

**Postings in this round (24 of 129).**
- **Brazil:**
  - Detsoft (InfoJobs): BRL 2,300–4,640 / month;
  - TRAYYEVO .NET Pleno (InfoJobs): BRL 7,000–9,000 / month;
  - AGX Software internship (InfoJobs): BRL 1,100–1,540 / month.

  The three come from each page's JSON-LD `baseSalary`, with `unitText: MONTH`. No LinkedIn BR posting stated pay; the other BRL amounts found were meal allowances, not salary.
- **United States:**
  - Leon Recruitment, Miami (Software Engineer I, fully on-site): $90,000–110,000, period not stated;
  - CACI entry level: $58,000–115,900, period not stated;
  - Keysight, Santa Rosa: $127,109–164,580, period not stated;
  - Encore (associate): $64,506–83,858, period not stated;
  - Andromeda (junior): $30–35 per hour, or $62,400–72,800 per year;
  - State Street: $70,000–118,750 annual;
  - FUNDVIEW: $50,000–60,000 annually.
- **Canada:**
  - TD: CAD 102,200–125,000, period not stated;
  - Omnissa (staff): CAD 285,000–323,050 per year, base;
  - EY Toronto: $65,500–99,000;
  - CGI Vancouver: $75,000–125,000.

  The EY and CGI postings state neither currency nor period.
- **United Kingdom:**
  - Client Server, Newcastle: "to £120k" and "to £110k+";
  - Noir: £45,000–85,000.

  None of the three states a period.
- **Europe:**
  - OAG, Vilnius: EUR 4,000–5,667 gross per month;
  - Stanhope Financial, Vilnius: EUR 5,000–6,000 gross per month;
  - PKE, Vienna: at least EUR 3,449.08 gross per month (collective agreement);
  - ORBYTA, Turin: EUR 45,000–50,000 RAL (gross per year);
  - MCA Italy (consultant, 1–3 years): EUR 30,000–34,000, period not stated;
  - Starapple, Breda (junior): EUR 3,000–3,500 gross per month for 40 hours;
  - Smart Apartment Data (remote, Eastern Europe only): USD 3,000–3,500 per month.

Round 1 listed four figures: Concept IaaS up to R$12,000 or R$80 per hour; Morningstar $93,200–136,696; Noblis US$65,200–101,950; Vivaticket from EUR 45,000.

**Survey (all languages, not C#-specific).** Stack Overflow 2026, "Compensation by role" and by country, at https://survey.stackoverflow.co/2026/work/data. The figures are median total annual compensation, converted to USD:
- "Developer, back-end": $85,296 (n = 1,922);
- respondents in Brazil: $36,002 (n = 244);
- respondents in the United States: $154,000 (n = 2,885);
- respondents in Portugal: $61,413 (n = 135).

Neither survey publishes salary by programming language on these pages.

## 9. What changed from round 1

**Frequencies (full sample against round 1, "any", from section 6).** The core list is the same, and most shares are lower in the full sample. The comparison that measures the sample is "round 1 re-coded" against "full sample", since both use one dictionary. The gap between round 1's published and re-coded shares comes from the coding method (hand codes against keywords), not from the market: for example unit testing 55% against 51%, C# 91% against 84%.

| Competency | Round 1 published (69) | Round 1 re-coded (69) | Full sample (198) |
| --- | --- | --- | --- |
| C# named | 91% | 84% | 89% |
| Web API / REST | 64% | 59% | 55% |
| SQL Server | 57% | 52% | 49% |
| Unit testing | 55% | 51% | 40% |
| Git | 58% | 52% | 55% |
| SOLID / patterns | 54% | 51% | 52% |
| CI/CD | 54% | 57% | 57% |
| Cloud (any) | 67% | 68% | 61% |
| Azure | 42% | 46% | 44% |
| AWS | 35% | 35% | 22% |
| Messaging | 51% | 49% | 37% |
| Docker | 42% | 38% | 32% |
| EF Core | 35% | 35% | 27% |
| Microservices | 38% | 36% | 32% |
| Legacy .NET tech named | 30% | 30% | 28% |
| English (language requirement) | 20% | 20% | 28% |
| English, INT only | 34% | 31% | 39% |

The shift is not even across the board (re-coded round 1 against the full sample):
- Unit testing (51% to 40%; 34% of the new postings) and messaging (49% to 37%; 31% of the new postings) fall the most.
- CI/CD, Azure, Git, SOLID/patterns and legacy hold within 3 points; cloud (any) falls 7.
- AWS falls (35% to 22%); the new postings name Azure far more often than AWS (43% against 15%).

The new postings also differ in mix: 89 of the 129 are INT (round 1: 32 of 69) and 25 are junior or intern (round 1: 11). This data does not test whether that mix causes the lower shares. Treat round 1's figures as the upper edge: adding 129 postings moved several rows by 10–15 points.

**New vocabulary is rare.** It is never core:

| Topic | Postings (of 198) |
| --- | --- |
| External API integration | 14% |
| Serverless | 7% |
| A named code-quality tool | 6% |
| AI features in the product | 4% |
| gRPC | 3% |
| Search engines | 3% |
| HTTP resilience | 2% |
| Retries for messages or workflows | 2% |
| SignalR by name | 2% |
| Native AOT | 1% |
| Memory or profiling | 1% |

**Curriculum ([05-curriculum.md](05-curriculum.md)).**
- **Modules 01–13: no change of order or tier is indicated.**
  - Web API, SQL Server, EF Core, unit testing, Git, CI/CD and cloud stay the most named.
  - Legacy technology stays near 3 in 10.
  - .NET 10 is still almost never named (2 of 198), which supports teaching on the current LTS while explaining .NET 6/8, as 01/03 does.
- **Shares cited in module rationales and traceability.** They come from round 1 (for example "unit testing 55%", "messaging 51%"). With 198 postings they would read lower (40%, 37%; round 1 re-coded with the same dictionary: 51%, 49%), so they are best read as "round 1 sample" or updated to the full sample. The ranking they justify does not change.
- **Serverless (7%)** is not covered by any lesson. A short mention of Azure Functions and AWS Lambda in module 11's cloud lesson would cover it without a new lesson.
- **Oracle (7%) and MySQL (6%)** together appear in about 1 in 8 postings (round 1's combined row: 12%). That is enough for a sentence on provider differences in module 07, not for a lesson.

**Module 14, lesson by lesson.** The module is the right tier: deepening, after the core. The new data supports most lessons, but not with equal weight:

| Lesson | Evidence in this round | Reading |
| --- | --- | --- |
| 01 HTTP clients and resilience | External API integration is named in 14% of postings (duties), the highest of the new vocabulary; HTTP resilience is named in 2% (3 postings), and 3 more name retries only for messages or workflows | **Keep, first in the module.** Integrating payment, banking and partner APIs matches the Magento background; the resilience handler belongs here even if postings rarely name it |
| 02 gRPC and SignalR | gRPC 3%, SignalR 2% by name, WebSockets a further 2%, all but one in INT postings; NuGet shows real adoption (234 million and 151 million downloads) | **Keep, but as the lowest-priority lesson.** A shorter lesson is enough; it should not grow |
| 03 Performance and memory | Memory or profiling is named by 1 posting; "performance" wording by 63%; query tuning by 22% | **Keep.** Postings ask for "performance" without saying what; the lesson teaches the measurement that the wording implies. Do not extend it into Native AOT (1%) |
| 04 Diagnostics in production | Observability 37%, a tool named 14% | **Keep.** It is supported by the same evidence as 11/04 |
| 05 Code quality and analyzers | A tool is named in 6% (SonarQube in 9 postings), code review in 39%; SonarQube/SonarCloud 18.8% usage in SO 2026 | **Keep**, and consider adding SonarQube next to the built-in analyzers, since it is the tool postings and the survey name; .NET analyzers are named by no posting |
| 06 AI in .NET apps | AI in the product 4%; Microsoft.Extensions.AI named by 0 postings and Semantic Kernel by 1; NuGet: OpenAI 92 million, Microsoft.Extensions.AI 41 million, Semantic Kernel 19 million | **Keep as an adjacent lesson, do not expand.** Postings that ask for this name LLM APIs or "agents", not a .NET library, so teaching the provider-neutral abstraction is the defensible choice |

## 10. What this sample still cannot tell

- **Market size and share.** 198 postings from the boards that allowed automated reading; LinkedIn supplies 86% of them and its ranking decided which ones appeared. Indeed, Glassdoor, Turing and Catho could not be read, and the remote boards had almost no .NET roles.
- **Brazilian demand outside LinkedIn.** InfoJobs and Vagas.com added 9 postings. Catho, the largest gap, returned no results to automated or headless access.
- **Remote policy.** For 129 new postings modality is only keyword evidence, and 57 have none. The share of remote .NET roles open to Brazil residents cannot be read from this sample; only 12 postings are direct evidence ("INT (from BR)").
- **Salary levels.** 28 postings state pay, in 5 currencies, with mixed periods and many without a period. The survey medians are for all languages. No comparison of .NET pay between Brazil and abroad is possible from this data.
- **Junior market depth.** 36 junior or intern postings are more than in round 1, but 24 of them are INT, and INT postings often require local work authorization (round 1 found US citizenship and no-sponsorship clauses; this round, for example, Noir: "Applicants must be based in the UK and have the right to work"). Brazilian junior supply is 12 postings.
- **Hiring tests.** Only 1 of 198 postings names a technical test in its hiring steps (K2 Solutions: "Teste técnico e avaliação do teste"), 2 name a technical interview (Nava, Nortal), and none mentions live coding or a take-home exercise. Postings rarely describe the selection process, so this tells nothing about how often coding tests are used, and it is no evidence for or against hands-on challenges in the track.
- **Trend.** Both rounds cover the same 30-day window (2026-10-06 to 2026-11-05). Round 2 is a wider snapshot, not a second point in time, so no growth or decline can be inferred.
- **Coding precision.** The automated rows agree with round 1's hand-checked codes for most competencies, but generic terms (AI, performance, security, English) are over-counted. The verified rows are precise but depend on the patterns used to find the matches.
- **Adoption figures.** Survey bases are all respondents of each question, not .NET developers. Download totals are cumulative and include CI restores and transitive use. Neither measures hiring.
