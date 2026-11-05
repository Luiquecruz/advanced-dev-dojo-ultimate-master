# C#/.NET backend job market: research sample (Brazil vs international)

Research date: **2026-11-05**. Scope: what recent C#/.NET backend job postings ask for, Brazil compared with international roles, to inform a C#/.NET track for a backend developer coming from PHP/Magento. This is a **convenience sample of 69 unique postings**, not a statistic of the market.

## 1. Sources and access status

| Source | How it was read | Status | Used postings |
| --- | --- | --- | --- |
| LinkedIn Jobs (BR + international) | Public guest search endpoint `linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` (keywords below, `f_TPR=r2592000` = last 30 days; international queries also `f_WT=2` = remote filter) and guest detail endpoint `linkedin.com/jobs-guest/jobs/api/jobPosting/<id>`; public URL `https://www.linkedin.com/jobs/view/<id>` cited | Verified (no login needed for guest endpoints) | 52 |
| Gupy | `https://portal.gupy.io/job-search/term=.net` (server-rendered list) and each company page `https://<company>.gupy.io/job/...` (`__NEXT_DATA__` JSON: name, description, `publishedAt`, `workplaceType`) | Verified; the documented public API `portal.api.gupy.io/api/job` returned 404 | 8 |
| Programathor | `https://programathor.com.br/jobs-c-sharp` list and each job page | Verified; publication date **not shown** on job pages | 9 |
| Remotive | `https://remotive.com/api/remote-jobs?search=.net` (also `c#`, `dotnet`, `asp.net`) | Verified, but every query returned the same 11 generic results; none is a C#/.NET role (Lemon.io lists ".NET & C#" only as one of ~60 stacks it places) | 0 |
| Remote OK | `https://remoteok.com/api` (full feed) filtered for .NET/C# | Verified; 3 hits, none .NET-primary (Klardaten: "C#/.NET ... helpful") | 0 |
| We Work Remotely | `weworkremotely.com/categories/remote-back-end-programming-jobs.rss` | Verified; 1 hit (Bitovi: C# listed as "a plus" to Java); search RSS returned empty | 0 |
| Himalayas | `himalayas.app/jobs/api?q=.net` | Verified; 20 results, none .NET | 0 |
| Indeed BR / Indeed US | `br.indeed.com/jobs?q=.net`, `www.indeed.com/jobs?q=.net+remote` | **Not available**: HTTP 403 | 0 |
| Glassdoor BR | `glassdoor.com.br/Vaga/brasil-net-vagas-...` | **Not available**: HTTP 403 | 0 |
| Wellfound | `wellfound.com/role/r/dotnet-developer` | **Not available**: HTTP 303 redirect (bot/login wall) | 0 |
| .NET support policy (context) | https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | Verified: .NET 10 LTS (released 2025-11-11, support to 2028-11-14); .NET 9 STS and .NET 8 LTS both end support **2026-11-10**; .NET 6 ended 2024-11-12, .NET 7 ended 2024-05-14 | - |

LinkedIn queries used: `.NET Developer` (Brazil, 2 pages), `desenvolvedor C# junior`, `desenvolvedor .NET pleno`, `backend C#` (Brazil); `.NET backend developer` (Worldwide), `C# .NET developer` and `junior .NET developer` (United States), `.NET developer` (European Union), `.NET developer remote English` (Latin America).

## 2. Selection criteria, grouping and deduplication

- **Included**: C# or .NET in the title or in the requirements as the main stack; posted 2026-10-06 to 2026-11-05 where a date is shown (all LinkedIn and Gupy postings are inside the last 30 days; Programathor shows no date, the pages were live on the research date); full description readable.
- **Excluded**: postings where .NET is only one option among many (Lemon.io, Bitovi, Klardaten); Jobgether reposts (3: 4484598503, 4485146430, 4486324773), because they hide the original employer and cannot be deduplicated.
- **Deduplication** (same company + same title/text counts once): BairesDev templated reposts across cities (kept 4487010759 junior and 4487024218 .NET Core; dropped 4487026413, 4487023260, 4487016512, 4487004949, 4487016741, 4487019657); Performa_IT Campinas 4480692913 = Fortaleza 4476466407; Knewin 4476830773 = 4484104944; Verity two near-identical senior backend postings (kept one); **IEBT Innovation 4476885187 has the same description, word for word, as Vetta 4475262930** (one client role posted by two recruiters; kept Vetta). Result: **69 unique postings**.
- **Groups**:
  - **BR (37)**: roles in Brazil for Brazilian employers or Brazilian operations, posted in Portuguese.
  - **INT (32)**: roles located outside Brazil (26), plus **6 "INT (from BR)"** roles open to Brazil residents but working for foreign clients in English or paid in USD (Vortigo Digital, Velozient, Avalara Brasil, Micro1, 2x BairesDev). The 6 are kept in INT because they are the realistic "international remote from Brazil" path.
- **Modality** comes from the posting text or the board's structured field (Gupy `workplaceType`, Programathor header). The LinkedIn guest detail does not expose workplace type, so "not shown" means the text did not say. The LinkedIn remote filter proved unreliable: several results from `f_WT=2` queries state on-site or hybrid in the text (CoStar: office Monday to Thursday; Client Server: office Monday to Friday; Crawford Thomas: fully on-site; Morningstar: 4 days in office).

## 3. Sample composition

| | BR (n=37) | INT (n=32) |
| --- | --- | --- |
| Sources | LinkedIn 21, Gupy 8, Programathor 8 | LinkedIn 31, Programathor 1 |
| Locations | Brazil (mostly São Paulo state; also CE, PR, PE, SC, MT) | US 11, Europe 8 (PT 2, UA 2, ES, DE, IT, PL), Canada 3, Mexico 2, Colombia 1, Egypt 1, remote from Brazil 6 |
| Posting language | Portuguese 36, English 1 | English 27, Portuguese 2 (BairesDev), German 1, Spanish 1, Italian 1 |
| Modality (as stated) | remote 14, hybrid 10, on-site 6, not shown 7 | remote or remote-option 9, hybrid 4, on-site 3, not shown 16 |
| Seniority (title/text) | senior 18, mid-senior 1, mid 6, junior 7, not stated 5 | senior 22, mid 3, junior 4, multi-level 1, not stated 2 |
| Date range shown | 2026-10-09 to 2026-11-05 (29 dated) | 2026-10-06 to 2026-11-04 (31 dated) |

## 4. Coding method

Each description was split into "required" (requirements plus responsibilities, i.e. everything before a nice-to-have marker such as *Diferencial*, *Desejável*, *Nice to have*, *Preferred Qualifications*, *Bonus points*, *O que aumenta as suas chances*) and "nice-to-have" (after the marker), with benefits sections cut off. A keyword dictionary mapped text to the competencies below; matches were spot-checked by reading the requirement sections of all 69 postings, and five postings were coded by hand from their own section headings: Programathor 33738 and BTG Pactual (an early "diferencial" sentence), Gupy b2egroup (everything under "você precisa" and in the duties is required; only React and Node-Red sit under "Será um diferencial", and React is also in the duties), Velozient (the "Desired Experience" list is nice-to-have) and Credigy (the "Preferred" list is nice-to-have). Luxoft names MassTransit, OpenTelemetry and Splunk in its project description and duties as well as under "Strongly Preferred", so all three count as required. Consequences: a technology named only in the duties counts as "required"; generic words ("cloud", "security", "monitoring") are reported in separate "any mention" rows; "English" counts only an explicit language requirement, not the fact that the posting is written in English. Expect a few misclassifications per row.

## 5. Postings (69 unique)

`.NET named` lists the version strings found in the text. "LEGACY-TECH" = .NET Framework, ASP.NET 4.x, Web Forms, WCF, WinForms, VB.NET, SOAP, Delphi or Windows Server named. Companies for Gupy postings are the career-page subdomain when the page did not show a company name.

| # | Group | Title | Company | Source | Posted | Location | Modality | Seniority | .NET named | Required / stated in duties (normalized) | Nice-to-have (normalized) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-01 | BR | [PESSOA DESENVOLVEDORA FULL STACK .NET SÊNIOR](https://b2egroup.gupy.io/job/eyJqb2JJZCI6MTI3OTY2NDYsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | b2egroup (career page) | Gupy | 2026-11-04 | Brazil | remote | senior | .NET4.5, .NETCore | C#, MVC, EF, SQL Server, PostgreSQL, Oracle/MySQL, NoSQL, unit tests, messaging, Docker, Azure, AWS, CI/CD, Azure DevOps, Git, microservices, LEGACY-TECH, Angular, React, JS/TS/HTML, Node.js, Agile, security, AI tools | - |
| BR-02 | BR | [Desenvolvedor .NET SR](https://gruposysmap.gupy.io/job/eyJqb2JJZCI6MTI4MzExMzEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | gruposysmap (career page) | Gupy | 2026-11-04 | Brazil | remote | senior | - | C#, REST API, EF, JS/TS/HTML, Agile, security | - |
| BR-03 | BR | [Pessoa Desenvolvedora Full-stack React / .NET — Sênior](https://vemprabip.gupy.io/job/eyJqb2JJZCI6MTI3OTkzODUsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | BIP Brasil | Gupy | 2026-11-03 | Brazil | remote | senior | - | C#, REST API, SPs/query tuning, async, unit tests, messaging, Git, React, JS/TS/HTML | observability |
| BR-04 | BR | [Software Engineer Backend (.Net/React)](https://softdesign.gupy.io/job/eyJqb2JJZCI6MTI4MTYzMjMsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | softdesign (career page) | Gupy | 2026-10-30 | Brazil | remote | not stated | .NETCore | REST API, SQL Server, PostgreSQL, unit tests, Azure, AWS, CI/CD, Git, React, Agile, security, English | observability, microservices |
| BR-05 | BR | [Sênior .NET Backend Developer - REMOTO](https://verity.gupy.io/job/eyJqb2JJZCI6MTI4MTIyMzEsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | Verity | Gupy | 2026-10-30 | Brazil | remote | senior | .NET8, .NETCore | C#, PostgreSQL, Oracle/MySQL, async, unit tests, integration tests, messaging, Kafka, Docker, K8s, GCP, observability, CI/CD, SOLID/patterns, Clean Arch, microservices, legacy upkeep, Agile | - |
| BR-06 | BR | [Desenvolvedor(a) de Software Sênior .NET — APIs, Integração e Segurança AWS](https://cxpbrasil.gupy.io/job/eyJqb2JJZCI6MTI4MDkyOTYsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | cxpbrasil (career page) | Gupy | 2026-10-29 | São Paulo, SP | hybrid | senior | .NET7, .NET8 | C#, SQL Server, unit tests, AWS, observability, CI/CD, LEGACY-TECH, legacy upkeep, modernization, security, AI tools | - |
| BR-07 | BR | [Desenvolvedor(a) FullStack - .Net/Angular](https://abcbrasil.gupy.io/job/eyJqb2JJZCI6MTI3NTk1OTUsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | abcbrasil (career page) | Gupy | 2026-10-28 | São Paulo, SP | hybrid | not stated | - | C#, REST API, SPs/query tuning, NoSQL, async, unit tests, integration tests, messaging, workers/jobs, Docker, AWS, observability, CI/CD, Azure DevOps, Git, SOLID/patterns, microservices, Angular, security | - |
| BR-08 | BR | [Desenvolvedor .NET Senior](https://queroservertem.gupy.io/job/eyJqb2JJZCI6MTI3MTU1OTMsInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=) | Vertem (queroservertem career page) | Gupy | 2026-10-27 | Barueri, SP | hybrid (3 days office) | senior | .NETCore | C#, REST API, unit tests, messaging, Docker, K8s, Azure, AWS, observability, Git, SOLID/patterns, microservices, Agile, security | - |
| BR-09 | BR | [Engenheiro de software - .NET](https://www.linkedin.com/jobs/view/4422945101) | Tata Consultancy Services | LinkedIn | 2026-10-26 | São Paulo, Brazil | not shown | mid-senior | .NET6, .NETCore | C#, ASP.NET Core, REST API, EF, Dapper, SQL Server, PostgreSQL, async, unit tests, Azure, Git, SOLID/patterns, security | - |
| BR-10 | BR | [Desenvolvedor Back-end Sr / .Net](https://www.linkedin.com/jobs/view/4469059970) | Webmotors | LinkedIn | 2026-11-04 | São Paulo, São Paulo, Brazil | hybrid (3 days office) | senior | .NETCore | C#, unit tests, messaging, AWS, observability, legacy upkeep, Node.js, Agile, security | - |
| BR-11 | BR | [Desenvolvedor .NET C# - Electronic Trading](https://www.linkedin.com/jobs/view/4471823711) | BTG Pactual | LinkedIn | 2026-10-16 | São Paulo, São Paulo, Brazil | on-site | junior/entry (notions of C#) | - | C# | Git, REST API |
| BR-12 | BR | [Desenvolvedor(a) .NET Sênior](https://www.linkedin.com/jobs/view/4475262930) | Vetta | LinkedIn | 2026-10-10 | São Paulo, São Paulo, Brazil | hybrid (2 days office) | senior | - | C#, REST API, MVC, Dapper, SQL Server, SPs/query tuning, CI/CD, Azure DevOps, Git, DDD, LEGACY-TECH, modernization, Angular, JS/TS/HTML, Agile, AI tools | messaging, RabbitMQ, Docker, K8s, Azure |
| BR-13 | BR | [Analista Desenvolvedor .NET Sênior](https://www.linkedin.com/jobs/view/4476462997) | Psm Company | LinkedIn | 2026-10-13 | São Paulo, Brazil | remote (must live in SP state) | senior | .NETCore | MVC, EF, SQL Server, NoSQL, Docker, K8s, CI/CD, Azure DevOps, Git, SOLID/patterns, Clean Arch, DDD, CQRS/ES, Agile | Angular, React, Vue, JS/TS/HTML |
| BR-14 | BR | [Desenvolvedor .Net Senior](https://www.linkedin.com/jobs/view/4476466407) | Performa_IT | LinkedIn | 2026-10-13 | Fortaleza, Ceará, Brazil | not shown | senior | .NET6, .NET9, .NETCore | C#, ASP.NET Core, REST API, JWT/OAuth, EF, PostgreSQL, unit tests, Docker, K8s, CI/CD, Azure DevOps, Git, SOLID/patterns, Clean Arch | - |
| BR-15 | BR | [Desenvolvedor Back-End .NET C# / Híbrido](https://www.linkedin.com/jobs/view/4477732737) | Newbacon | LinkedIn | 2026-10-17 | São Paulo, São Paulo, Brazil | hybrid (3 days office) | not stated (LinkedIn: entry) | .NETCore, .NETFramework | C#, SQL Server, NoSQL, unit tests, Git, SOLID/patterns, Clean Arch, DDD, LEGACY-TECH, legacy upkeep | - |
| BR-16 | BR | [Desenvolvedor . NET Sênior](https://www.linkedin.com/jobs/view/4477757787) | J&F S.A. | LinkedIn | 2026-10-17 | São Paulo, São Paulo, Brazil | on-site | senior | - | C#, SQL Server, SPs/query tuning, workers/jobs, Azure DevOps, Git, legacy upkeep, modernization, Vue, JS/TS/HTML, security | - |
| BR-17 | BR | [Desenvolvedor Backend C#](https://www.linkedin.com/jobs/view/4477853887) | Crefaz | LinkedIn | 2026-10-09 | Maringá, Paraná, Brazil | not shown | not stated (junior-mid profile) | - | C#, REST API, unit tests, observability, CI/CD, Git | messaging, microservices |
| BR-18 | BR | [Desenvolvedor Full Stack C# Angular](https://www.linkedin.com/jobs/view/4478363880) | Jobbol | LinkedIn | 2026-10-12 | Recife, Pernambuco, Brazil | remote | not stated | - | C#, Angular, Agile | - |
| BR-19 | BR | [Pessoa Desenvolvedora Backend .NET Sênior](https://www.linkedin.com/jobs/view/4479057847) | Nava | Tech for Business | LinkedIn | 2026-10-13 | São Paulo, São Paulo, Brazil | hybrid | senior | .NET8 | C#, PostgreSQL, Oracle/MySQL, NoSQL, Redis/cache, messaging, RabbitMQ, Kafka, workers/jobs, Docker, AWS, observability, CI/CD, microservices, CQRS/ES, React, AI tools | - |
| BR-20 | BR | [Desenvolvedor Net Júnior](https://www.linkedin.com/jobs/view/4479091389) | Jobbol | LinkedIn | 2026-10-13 | Curitiba, Paraná, Brazil | on-site | junior | - | async, messaging | - |
| BR-21 | BR | [DESENVOLVEDOR PLENO BACKEND WEB C# .NET 8 - Segmento: Tech](https://www.linkedin.com/jobs/view/4479096953) | abler Vagas | LinkedIn | 2026-10-13 | Fortaleza, Ceará, Brazil | not shown | mid | .NET8 | C#, REST API, MVC, EF, SQL Server, NoSQL, unit tests, Docker, Git, SOLID/patterns, LEGACY-TECH, Agile | - |
| BR-22 | BR | [Desenvolvedor Backend .NET Sênior](https://www.linkedin.com/jobs/view/4480388919) | Jobbol | LinkedIn | 2026-10-17 | São Paulo, São Paulo, Brazil | remote | senior | - | C#, unit tests, microservices, Agile | - |
| BR-23 | BR | [Desenvolvedor Backend Jr](https://www.linkedin.com/jobs/view/4480746305) | ABC Fitness | LinkedIn | 2026-10-21 | Brazil | not shown | junior | - | C#, REST API, Git, Angular | - |
| BR-24 | BR | [SOFTWARE ENGINEER I .NET](https://www.linkedin.com/jobs/view/4482727290) | Stone | LinkedIn | 2026-10-22 | Brazil | not shown (benefits mention hybrid/remote contracts) | junior (SE I) | - | C#, SQL Server, PostgreSQL, unit tests, SOLID/patterns, microservices, security | messaging, RabbitMQ, Kafka, Azure, AWS, GCP, CI/CD, Azure DevOps, Clean Arch, CQRS/ES, AI tools |
| BR-25 | BR | [Pessoa Desenvolvedora Fullstack .NET Júnior](https://www.linkedin.com/jobs/view/4484104944) | Knewin | LinkedIn | 2026-10-28 | Brazil | not shown (home-office allowance) | junior | .NETFramework | C#, REST API, MVC, Git, LEGACY-TECH, legacy upkeep, Angular, JS/TS/HTML, security, AI tools | unit tests, messaging, RabbitMQ, Docker, English |
| BR-26 | BR | [462 - Desenvolvedor Backend .Net/C# Sênior](https://www.linkedin.com/jobs/view/4484152514) | Grupo Mooven | LinkedIn | 2026-10-28 | Barueri, São Paulo, Brazil | hybrid (2-3 days office) | senior | .NET6, .NETCore | C#, ASP.NET Core, REST API, JWT/OAuth, NoSQL, Redis/cache, unit tests, observability, CI/CD, Azure DevOps, GH Actions, Git, LEGACY-TECH, legacy upkeep, security | - |
| BR-27 | BR | [Desenvolvedor de .NET sênior](https://www.linkedin.com/jobs/view/4484185674) | Empresa Confidencial | LinkedIn | 2026-10-29 | São Bernardo do Campo, São Paulo, Brazil | on-site | senior | .NET8, .NETCore | C#, REST API, EF, SQL Server, SPs/query tuning, async, messaging, workers/jobs, observability, CI/CD, Azure DevOps, SOLID/patterns, microservices, legacy upkeep, AI tools | RabbitMQ, Service Bus, Azure, modernization |
| BR-28 | BR | [Desenvolvedor Backend .NET - Pleno](https://www.linkedin.com/jobs/view/4485578006) | Blite Tecnologia | LinkedIn | 2026-11-05 | São Paulo, São Paulo, Brazil | remote | mid | - | C#, REST API, JWT/OAuth, SQL Server, NoSQL, Redis/cache, async, unit tests, messaging, RabbitMQ, Kafka, Docker, K8s, Azure, AWS, observability, CI/CD, Azure DevOps, Clean Arch, DDD, microservices, GraphQL/gRPC, AI tools | - |
| BR-29 | BR | [Desenvolvedor Back-end Jr / .NET](https://www.linkedin.com/jobs/view/4486509551) | Webmotors | LinkedIn | 2026-11-04 | São Paulo, São Paulo, Brazil | hybrid (3 days office) | junior | .NETCore | C#, unit tests, messaging, AWS, observability, legacy upkeep, Node.js, Agile, security | - |
| BR-30 | BR | [Desenvolvedor Back-End Pleno](https://programathor.com.br/jobs/33737-desenvolvedor-back-end-pleno) | Agenda Assessoria | Programathor | not shown | Cuiabá, MT | on-site | mid | .NET6, .NETCore, .NETFramework | C#, REST API, MVC, EF, SQL Server, SPs/query tuning, Git, SOLID/patterns, LEGACY-TECH, legacy upkeep, JS/TS/HTML | - |
| BR-31 | BR | [Desenvolvedor Back-End Júnior](https://programathor.com.br/jobs/33738-desenvolvedor-back-end-junior) | Agenda Assessoria | Programathor | not shown | Cuiabá, MT | on-site | junior | - | C#, REST API, MVC, SQL Server, PostgreSQL, Oracle/MySQL, Git, SOLID/patterns | Agile, LEGACY-TECH |
| BR-32 | BR | [Desenvolvedor(a) Back-End Pleno](https://programathor.com.br/jobs/33757-desenvolvedor-a-back-end-pleno) | RDC Viagens | Programathor | not shown | São Caetano do Sul, SP | hybrid (3 days office) | mid | .NETCore | C#, REST API, EF, Dapper, NoSQL, Redis/cache, unit tests, messaging, RabbitMQ, Docker, Git, SOLID/patterns, Clean Arch, DDD, microservices, CQRS/ES, legacy upkeep, Agile | - |
| BR-33 | BR | [Desenvolvedor Full Stack Sênior](https://programathor.com.br/jobs/33762-desenvolvedor-full-stack-senior) | AGL Solutions Consultoria em TI | Programathor | not shown | Brazil | remote | senior | ASP.NET4.8 | C#, SQL Server, SOLID/patterns, LEGACY-TECH, Angular, JS/TS/HTML, English | - |
| BR-34 | BR | [Desenvolvedor(a) Fullstack Sênior](https://programathor.com.br/jobs/33764-desenvolvedor-a-fullstack-senior) | CECAM | Programathor | not shown | Brazil | remote | senior | .NETCore | C#, REST API, MVC, SQL Server, messaging, RabbitMQ, workers/jobs, Git, SOLID/patterns, CQRS/ES, LEGACY-TECH, Angular, JS/TS/HTML, Agile | - |
| BR-35 | BR | [Desenvolvedor(a) Full Stack Sênior](https://programathor.com.br/jobs/33839-desenvolvedor-a-full-stack-senior) | Concept IaaS | Programathor | not shown | Brazil | remote | senior | .NETCore | C#, ASP.NET Core, REST API, EF, Dapper, SQL Server, SPs/query tuning, unit tests, messaging, workers/jobs, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, Angular, React, JS/TS/HTML, Agile, security, AI tools | - |
| BR-36 | BR | [Desenvolvedor(a) Full Stack Pleno](https://programathor.com.br/jobs/33840-desenvolvedor-a-full-stack-pleno) | Concept IaaS | Programathor | not shown | Brazil | remote | mid | .NETCore | C#, ASP.NET Core, REST API, EF, Dapper, SQL Server, SPs/query tuning, unit tests, messaging, Kafka, Service Bus, workers/jobs, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, Angular, React, JS/TS/HTML, Agile, security, AI tools | - |
| BR-37 | BR | [Desenvolvedor Full Stack Pleno](https://programathor.com.br/jobs/33854-desenvolvedor-full-stack-pleno) | Mídia 3 Tecnologia e Criação | Programathor | not shown | Brazil | remote | mid | - | C#, Git, Angular, Agile, AI tools | Docker, React |
| INT-01 | INT | [.Net Senior Developer](https://www.linkedin.com/jobs/view/4441065883) | OTR Solutions | LinkedIn | 2026-10-17 | Roswell, GA | not shown | senior | .NET6, .NETCore | C#, ASP.NET Core, REST API, EF, SQL Server, unit tests, messaging, workers/jobs, Azure, AWS, observability, CI/CD, SOLID/patterns, legacy upkeep, React, JS/TS/HTML | - |
| INT-02 | INT | [Senior Software Engineer - (C#/Microservices/Azure)](https://www.linkedin.com/jobs/view/4460689554) | GEICO | LinkedIn | 2026-10-17 | Seattle, WA | not shown | senior | - | C#, REST API, MVC, SQL Server, NoSQL, Docker, K8s, Azure, AWS, GCP, observability, CI/CD, Azure DevOps, microservices, security | - |
| INT-03 | INT | [.NET Software Developer - Full-Stack (Multiple Levels)](https://www.linkedin.com/jobs/view/4461502273) | Noblis | LinkedIn | 2026-11-04 | Washington, DC | remote/hybrid (status "subject to change") | multiple (junior to senior) | - | C#, SQL Server, SOLID/patterns, JS/TS/HTML, Agile | - |
| INT-04 | INT | [.Net Developer - Senior - EY GDS Spain - Hybrid](https://www.linkedin.com/jobs/view/4466608719) | EY | LinkedIn | 2026-10-31 | Málaga, Andalusia, Spain | hybrid (Málaga office) | senior | .NETCore | C#, legacy upkeep, Agile, English | REST API, EF, SQL Server, NoSQL, unit tests, messaging, Azure, AWS, GCP, CI/CD, Azure DevOps, Git, SOLID/patterns, LEGACY-TECH, Angular, React, JS/TS/HTML |
| INT-05 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4472668206) | UST | LinkedIn | 2026-10-22 | Guadalajara, Jalisco, Mexico | not shown | senior | .NETCore | C#, ASP.NET Core, REST API, EF, SQL Server, SPs/query tuning, async, integration tests, messaging, Service Bus, Docker, Azure, observability, CI/CD, Git, SOLID/patterns, DDD, microservices, CQRS/ES, legacy upkeep, security, AI tools | - |
| INT-06 | INT | [Senior Backend Developer (m/w/d) – C# / .NET](https://www.linkedin.com/jobs/view/4474086156) | Vivecti Group | LinkedIn | 2026-10-06 | Berlin, Berlin, Germany | not shown | senior | .NET8, .NETCore | C#, ASP.NET Core, REST API, EF, SQL Server, PostgreSQL, Oracle/MySQL, unit tests, integration tests, messaging, RabbitMQ, Service Bus, Docker, K8s, Azure, CI/CD, SOLID/patterns, AI tools | - |
| INT-07 | INT | [Software Developer (.NET)](https://www.linkedin.com/jobs/view/4476832481) | Crawford Thomas Recruiting | LinkedIn | 2026-10-31 | Orlando, FL | on-site | junior | .NETCore, .NETFramework | C#, REST API, MVC, SQL Server, Git | ASP.NET Core, SPs/query tuning, LEGACY-TECH |
| INT-08 | INT | [Senior Software Engineer (C#/.NET)](https://www.linkedin.com/jobs/view/4477492178) | CoStar Group | LinkedIn | 2026-10-30 | Arlington, VA | hybrid (office Mon-Thu) | senior | .NETFramework | C#, REST API, MVC, SQL Server, Azure, AWS, observability, LEGACY-TECH, Agile, AI tools | NoSQL, messaging |
| INT-09 | INT | [Software Engineer 2 (.NET Core / C# web applications)](https://www.linkedin.com/jobs/view/4477858481) | U.S. Bank | LinkedIn | 2026-10-14 | Gresham, OR | not shown | mid (SE 2) | .NETCore | C#, SQL Server, SPs/query tuning, messaging, Service Bus, Docker, Azure, observability, CI/CD, Agile, security | - |
| INT-10 | INT | [(0199) -Senior Backend Developer .NET](https://www.linkedin.com/jobs/view/4478055305) | ALTEN Mexico | LinkedIn | 2026-10-10 | Puebla, Puebla, Mexico | not shown | senior | .NET6, .NETCore | C#, REST API, JWT/OAuth, Dapper, SQL Server, SPs/query tuning, unit tests, integration tests, messaging, AWS, microservices, legacy upkeep, modernization, security, English | - |
| INT-11 | INT | [Senior Software Engineer (C#)](https://www.linkedin.com/jobs/view/4478514405) | StoneX Group Inc. | LinkedIn | 2026-11-03 | Winter Park, FL | hybrid | senior | .NET8, .NETCore | C#, ASP.NET Core, SQL Server, PostgreSQL, NoSQL, async, messaging, Kafka, Docker, K8s, Azure, observability, CI/CD, Git, SOLID/patterns, microservices, CQRS/ES, Agile, AI tools | - |
| INT-12 | INT | [Senior Software Developer (C#/.NET)](https://www.linkedin.com/jobs/view/4479547406) | Riva International, Inc. | LinkedIn | 2026-10-14 | Edmonton, Alberta, Canada | not shown | senior | - | C#, microservices, security | NoSQL, unit tests, Docker, AWS, observability, CI/CD, Git, Vue, Node.js |
| INT-13 | INT (from BR) | [Senior .NET Developer (Inglês Fluente)](https://www.linkedin.com/jobs/view/4479631343) | Vortigo Digital | LinkedIn | 2026-10-16 | Brazil | remote | senior | .NET6, .NETCore, .NETFramework | C#, REST API, MVC, EF, SQL Server, SOLID/patterns, LEGACY-TECH, Agile, English | messaging, RabbitMQ, Kafka, Docker, Azure, observability, CI/CD, Azure DevOps, microservices, legacy upkeep, modernization, Angular, React, security |
| INT-14 | INT | [Senior Software Engineer - .NET, C# & APIs](https://www.linkedin.com/jobs/view/4480102954) | Capco | LinkedIn | 2026-10-15 | Toronto, Ontario, Canada | not shown | senior | .NETCore | C#, ASP.NET Core, REST API, JWT/OAuth, EF, Dapper, SQL Server, unit tests, Docker, CI/CD, Git, SOLID/patterns, legacy upkeep, modernization, Angular, React, JS/TS/HTML, Agile, security, AI tools | K8s, Azure, AWS, observability |
| INT-15 | INT (from BR) | [Software Development Engineer - C#/.NET - Property Tax Team](https://www.linkedin.com/jobs/view/4480173431) | Avalara Brasil | LinkedIn | 2026-10-15 | Brazil | not shown (contract) | senior (8+ yrs) | - | C#, REST API, SQL Server, PostgreSQL, async, unit tests, integration tests, Docker, AWS, observability, CI/CD, SOLID/patterns, microservices, modernization, security, GraphQL/gRPC, AI tools, English | - |
| INT-16 | INT | [Senior Backend .Net Developer](https://www.linkedin.com/jobs/view/4480944918) | BlackStone eIT | LinkedIn | 2026-10-19 | Nasr City, Cairo, Egypt | not shown | senior | .NETCore | C#, ASP.NET Core, REST API, EF, Dapper, SQL Server, SPs/query tuning, NoSQL, Redis/cache, async, integration tests, messaging, RabbitMQ, Docker, K8s, Azure, CI/CD, Azure DevOps, Git, SOLID/patterns, Clean Arch, microservices, security | - |
| INT-17 | INT | [Senior C#/.NET Backend Developer](https://www.linkedin.com/jobs/view/4482209473) | QUANTEAM (RAINBOW PARTNERS Group) | LinkedIn | 2026-10-27 | Porto, Portugal | on-site/based in Porto | senior | .NETFramework | C#, REST API, SPs/query tuning, unit tests, SOLID/patterns, LEGACY-TECH, modernization, Agile, security, English | - |
| INT-18 | INT | [Bilingual .NET Engineer](https://www.linkedin.com/jobs/view/4482424178) | Capgemini Engineering | LinkedIn | 2026-10-29 | Bogota, D.C., Capital District, Colombia | not shown | not stated | - | C#, REST API, MVC, Oracle/MySQL, Git, SOLID/patterns, LEGACY-TECH, JS/TS/HTML, Agile, English | - |
| INT-19 | INT (from BR) | [Senior Software Engineer (C#/ .Net)](https://www.linkedin.com/jobs/view/4482742550) | Velozient | LinkedIn | 2026-10-22 | Brazil | remote | senior | - | C#, REST API, MVC, EF, SQL Server, unit tests, Git, JS/TS/HTML, security, AI tools, English | NoSQL, Redis/cache, messaging, Service Bus, Azure, React, Vue |
| INT-20 | INT | [Middle .NET Engineer](https://www.linkedin.com/jobs/view/4482961902) | N-iX | LinkedIn | 2026-10-26 | Lviv, Lviv, Ukraine | remote, office or flexible | mid | .NET8, .NET9, .NETCore | ASP.NET Core, REST API, EF, SQL Server, async, unit tests, messaging, RabbitMQ, Kafka, Service Bus, Docker, K8s, Azure, AWS, GCP, SOLID/patterns, microservices, English | SPs/query tuning, NoSQL, Redis/cache, observability, CI/CD, Azure DevOps, Git |
| INT-21 | INT | [.NET Developer](https://www.linkedin.com/jobs/view/4483270694) | Ring Power Cat | LinkedIn | 2026-10-27 | St Augustine, FL | not shown | not stated | - | C#, REST API, JWT/OAuth, SPs/query tuning, Azure, Git, SOLID/patterns, LEGACY-TECH, JS/TS/HTML, Agile | - |
| INT-22 | INT | [Senior .Net Backend Engineer](https://www.linkedin.com/jobs/view/4483643580) | N-iX | LinkedIn | 2026-10-27 | Lviv, Lviv, Ukraine | remote, office or flexible | senior | .NETCore | ASP.NET Core, REST API, EF, SQL Server, unit tests, messaging, RabbitMQ, Kafka, Service Bus, Docker, K8s, Azure, AWS, observability, CI/CD, SOLID/patterns, microservices, LEGACY-TECH, English | SPs/query tuning, NoSQL, Redis/cache |
| INT-23 | INT | [Senior Backend Engineer C# / .NET](https://www.linkedin.com/jobs/view/4484324479) | Vivaticket | LinkedIn | 2026-11-02 | Milan, Lombardy, Italy | not shown (meal vouchers for office days) | senior | .NET7 | C#, PostgreSQL, NoSQL, Redis/cache, unit tests, integration tests, messaging, Docker, K8s, GCP, SOLID/patterns, DDD, microservices, CQRS/ES, GraphQL/gRPC | CI/CD, GH Actions, Git |
| INT-24 | INT | [Software Engineer C# .Net - FinTech](https://www.linkedin.com/jobs/view/4484477255) | Client Server | LinkedIn | 2026-10-28 | Columbus, OH | on-site (Mon-Fri) | junior-mid (LinkedIn: associate) | - | C# | - |
| INT-25 | INT | [Senior Software Engineer - Backend C#](https://www.linkedin.com/jobs/view/4485608605) | Garmin | LinkedIn | 2026-10-30 | Louisville, CO | not shown | senior | - | C#, REST API, SQL Server, PostgreSQL, SPs/query tuning, unit tests, AWS, CI/CD, GH Actions, Git | - |
| INT-26 | INT | [Senior .NET Developer](https://www.linkedin.com/jobs/view/4485904176) | Dellent | LinkedIn | 2026-10-31 | Porto, Porto, Portugal | not shown (remote onboarding) | senior | .NETCore | C#, EF, Docker, K8s, Azure, AWS, CI/CD, Git, SOLID/patterns, microservices, Angular, React, Agile, security, English | - |
| INT-27 | INT | [Junior.Net Developer](https://www.linkedin.com/jobs/view/4486518117) | Credigy | LinkedIn | 2026-11-04 | Norcross, GA | not shown | junior | .NETCore, .NETFramework | C#, ASP.NET Core, REST API, SQL Server, SPs/query tuning, unit tests, Azure, observability, Git, legacy upkeep, JS/TS/HTML, AI tools | MVC, EF, NoSQL, Redis/cache, messaging, Service Bus, Docker, CI/CD, GH Actions, LEGACY-TECH, React |
| INT-28 | INT (from BR) | [Engenheiro de Software .NET Júnior - Remote Work / REF#308195](https://www.linkedin.com/jobs/view/4487010759) | BairesDev | LinkedIn | 2026-11-03 | Rio Grande do Sul, Brazil | remote | junior | - | C#, SOLID/patterns | - |
| INT-29 | INT (from BR) | [Desenvolvedor .NET Core - Trabalho Remoto / REF#307653](https://www.linkedin.com/jobs/view/4487024218) | BairesDev | LinkedIn | 2026-11-03 | Florianópolis, Santa Catarina, Brazil | remote | senior (5+ yrs) | .NETCore | NoSQL, unit tests, integration tests, CI/CD, microservices, Agile | - |
| INT-30 | INT | [Senior C#/.NET Developer](https://www.linkedin.com/jobs/view/4487061229) | Luxoft Poland | LinkedIn | 2026-11-03 | Wrocław, Dolnośląskie, Poland | remote (from Poland/EU time zone) | senior | - | C#, NoSQL, async, messaging, RabbitMQ, Kafka, Service Bus, MassTransit, workers/jobs, Docker, Azure, observability, CI/CD, CQRS/ES, LEGACY-TECH | GH Actions, Git, JS/TS/HTML, English |
| INT-31 | INT | [Senior Software Engineer-C#](https://www.linkedin.com/jobs/view/4487063082) | Morningstar | LinkedIn | 2026-11-03 | Toronto, Ontario, Canada | hybrid (4 days office) | senior | - | C#, REST API, MVC, EF, SQL Server, PostgreSQL, Oracle/MySQL, NoSQL, async, unit tests, AWS, CI/CD, SOLID/patterns, microservices, security, AI tools | - |
| INT-32 | INT (from BR) | [Developer Back-End (USD-based pay)](https://programathor.com.br/jobs/33855-developer-back-end-usd-based-pay) | Micro1 | Programathor | not shown | Brazil (LATAM talent for global clients) | remote | mid | - | C#, REST API, Oracle/MySQL, SPs/query tuning, SOLID/patterns, security | Azure, AWS, GCP, Agile |

## 6. Competency frequency (count and share of each group)

"req" = stated as a requirement or in the duties; "nice" = stated only as a plus; "any" = req + nice. Percentages are of the group size (BR 37, INT 32, all 69).

| Competency | BR req | BR nice | BR any | INT req | INT nice | INT any | All any |
|---|---|---|---|---|---|---|---|
| C# named | 34 (92%) | 0 (0%) | 34 (92%) | 29 (91%) | 0 (0%) | 29 (91%) | 63 (91%) |
| .NET modern version named (6/7/8/9/10) | 9 (24%) | 0 (0%) | 9 (24%) | 7 (22%) | 0 (0%) | 7 (22%) | 16 (23%) |
| ASP.NET Core named | 5 (14%) | 0 (0%) | 5 (14%) | 9 (28%) | 1 (3%) | 10 (31%) | 15 (22%) |
| Web API / REST (any) | 21 (57%) | 1 (3%) | 22 (59%) | 21 (66%) | 1 (3%) | 22 (69%) | 44 (64%) |
| Minimal APIs | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| MVC / Razor | 8 (22%) | 0 (0%) | 8 (22%) | 7 (22%) | 1 (3%) | 8 (25%) | 16 (23%) |
| AuthN/AuthZ protocol named (JWT/OAuth2/OIDC/Identity) | 3 (8%) | 0 (0%) | 3 (8%) | 3 (9%) | 0 (0%) | 3 (9%) | 6 (9%) |
| AuthN/AuthZ (any mention) | 6 (16%) | 0 (0%) | 6 (16%) | 5 (16%) | 0 (0%) | 5 (16%) | 11 (16%) |
| EF Core / Entity Framework | 11 (30%) | 0 (0%) | 11 (30%) | 11 (34%) | 2 (6%) | 13 (41%) | 24 (35%) |
| Dapper | 5 (14%) | 0 (0%) | 5 (14%) | 3 (9%) | 0 (0%) | 3 (9%) | 8 (12%) |
| SQL Server / T-SQL | 18 (49%) | 0 (0%) | 18 (49%) | 20 (62%) | 1 (3%) | 21 (66%) | 39 (57%) |
| PostgreSQL | 8 (22%) | 0 (0%) | 8 (22%) | 6 (19%) | 0 (0%) | 6 (19%) | 14 (20%) |
| Oracle / MySQL | 4 (11%) | 0 (0%) | 4 (11%) | 4 (12%) | 0 (0%) | 4 (12%) | 8 (12%) |
| Stored procedures / query tuning | 8 (22%) | 0 (0%) | 8 (22%) | 9 (28%) | 3 (9%) | 12 (38%) | 20 (29%) |
| NoSQL (MongoDB/Redis/Cosmos/Dynamo/Elastic) | 9 (24%) | 0 (0%) | 9 (24%) | 7 (22%) | 7 (22%) | 14 (44%) | 23 (33%) |
| Redis / caching | 4 (11%) | 0 (0%) | 4 (11%) | 2 (6%) | 4 (12%) | 6 (19%) | 10 (14%) |
| Async / concurrency | 7 (19%) | 0 (0%) | 7 (19%) | 7 (22%) | 0 (0%) | 7 (22%) | 14 (20%) |
| Unit testing | 21 (57%) | 1 (3%) | 22 (59%) | 14 (44%) | 2 (6%) | 16 (50%) | 38 (55%) |
| Test framework named (xUnit/NUnit/MSTest) | 5 (14%) | 0 (0%) | 5 (14%) | 2 (6%) | 1 (3%) | 3 (9%) | 8 (12%) |
| Integration testing | 2 (5%) | 0 (0%) | 2 (5%) | 7 (22%) | 0 (0%) | 7 (22%) | 9 (13%) |
| Messaging (any: queues, events, brokers) | 15 (41%) | 4 (11%) | 19 (51%) | 11 (34%) | 5 (16%) | 16 (50%) | 35 (51%) |
| RabbitMQ | 4 (11%) | 4 (11%) | 8 (22%) | 5 (16%) | 1 (3%) | 6 (19%) | 14 (20%) |
| Kafka | 4 (11%) | 1 (3%) | 5 (14%) | 4 (12%) | 1 (3%) | 5 (16%) | 10 (14%) |
| Azure Service Bus | 1 (3%) | 1 (3%) | 2 (5%) | 6 (19%) | 2 (6%) | 8 (25%) | 10 (14%) |
| MassTransit | 0 (0%) | 0 (0%) | 0 (0%) | 1 (3%) | 0 (0%) | 1 (3%) | 1 (1%) |
| Background jobs / workers (Hangfire/Quartz/BackgroundService/workers) | 7 (19%) | 0 (0%) | 7 (19%) | 2 (6%) | 0 (0%) | 2 (6%) | 9 (13%) |
| Docker / containers | 10 (27%) | 3 (8%) | 13 (35%) | 13 (41%) | 3 (9%) | 16 (50%) | 29 (42%) |
| Kubernetes | 5 (14%) | 1 (3%) | 6 (16%) | 8 (25%) | 1 (3%) | 9 (28%) | 15 (22%) |
| Azure | 7 (19%) | 3 (8%) | 10 (27%) | 14 (44%) | 5 (16%) | 19 (59%) | 29 (42%) |
| AWS | 9 (24%) | 1 (3%) | 10 (27%) | 10 (31%) | 4 (12%) | 14 (44%) | 24 (35%) |
| GCP | 1 (3%) | 1 (3%) | 2 (5%) | 3 (9%) | 2 (6%) | 5 (16%) | 7 (10%) |
| Cloud (any) | 20 (54%) | 1 (3%) | 21 (57%) | 20 (62%) | 5 (16%) | 25 (78%) | 46 (67%) |
| Observability (any mention) | 11 (30%) | 2 (5%) | 13 (35%) | 10 (31%) | 4 (12%) | 14 (44%) | 27 (39%) |
| Observability tool named | 4 (11%) | 0 (0%) | 4 (11%) | 2 (6%) | 3 (9%) | 5 (16%) | 9 (13%) |
| CI/CD (any) | 15 (41%) | 1 (3%) | 16 (43%) | 15 (47%) | 6 (19%) | 21 (66%) | 37 (54%) |
| Azure DevOps | 11 (30%) | 1 (3%) | 12 (32%) | 2 (6%) | 3 (9%) | 5 (16%) | 17 (25%) |
| GitHub Actions | 1 (3%) | 0 (0%) | 1 (3%) | 1 (3%) | 3 (9%) | 4 (12%) | 5 (7%) |
| Git | 23 (62%) | 1 (3%) | 24 (65%) | 11 (34%) | 5 (16%) | 16 (50%) | 40 (58%) |
| SOLID / design patterns / clean code | 17 (46%) | 0 (0%) | 17 (46%) | 19 (59%) | 1 (3%) | 20 (62%) | 37 (54%) |
| Clean / Hexagonal Architecture | 6 (16%) | 1 (3%) | 7 (19%) | 1 (3%) | 0 (0%) | 1 (3%) | 8 (12%) |
| DDD | 5 (14%) | 0 (0%) | 5 (14%) | 2 (6%) | 0 (0%) | 2 (6%) | 7 (10%) |
| Microservices | 10 (27%) | 2 (5%) | 12 (32%) | 13 (41%) | 1 (3%) | 14 (44%) | 26 (38%) |
| CQRS / Event Sourcing / MediatR | 4 (11%) | 1 (3%) | 5 (14%) | 4 (12%) | 0 (0%) | 4 (12%) | 9 (13%) |
| Legacy .NET tech named (.NET Framework/ASP.NET 4.x/WebForms/WCF/WinForms/WPF/VB/SOAP) | 10 (27%) | 1 (3%) | 11 (30%) | 7 (22%) | 3 (9%) | 10 (31%) | 21 (30%) |
| Legacy system work (generic wording) | 11 (30%) | 0 (0%) | 11 (30%) | 6 (19%) | 1 (3%) | 7 (22%) | 18 (26%) |
| Migration / modernization | 3 (8%) | 1 (3%) | 4 (11%) | 4 (12%) | 1 (3%) | 5 (16%) | 9 (13%) |
| Angular | 11 (30%) | 1 (3%) | 12 (32%) | 2 (6%) | 2 (6%) | 4 (12%) | 16 (23%) |
| React | 6 (16%) | 2 (5%) | 8 (22%) | 3 (9%) | 4 (12%) | 7 (22%) | 15 (22%) |
| Blazor | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Vue | 1 (3%) | 1 (3%) | 2 (5%) | 0 (0%) | 2 (6%) | 2 (6%) | 4 (6%) |
| JS/TS/HTML/CSS | 11 (30%) | 1 (3%) | 12 (32%) | 7 (22%) | 2 (6%) | 9 (28%) | 21 (30%) |
| Node.js | 3 (8%) | 0 (0%) | 3 (8%) | 0 (0%) | 1 (3%) | 1 (3%) | 4 (6%) |
| Agile / Scrum | 17 (46%) | 1 (3%) | 18 (49%) | 12 (38%) | 1 (3%) | 13 (41%) | 31 (45%) |
| Security (any mention) | 15 (41%) | 0 (0%) | 15 (41%) | 13 (41%) | 1 (3%) | 14 (44%) | 29 (42%) |
| GraphQL / gRPC | 1 (3%) | 0 (0%) | 1 (3%) | 2 (6%) | 0 (0%) | 2 (6%) | 3 (4%) |
| AI-assisted development / LLM | 10 (27%) | 1 (3%) | 11 (30%) | 9 (28%) | 0 (0%) | 9 (28%) | 20 (29%) |
| English (language requirement) | 2 (5%) | 1 (3%) | 3 (8%) | 10 (31%) | 1 (3%) | 11 (34%) | 14 (20%) |

## 7. Notable differences, BR vs international (in this sample)

| Topic | BR (37) | INT (32) | Evidence |
| --- | --- | --- | --- |
| English | Explicit requirement in 2 (AGL "Inglês fluente"; SoftDesign "Inglês para leitura de documentações"), plus 1 nice-to-have (Knewin, technical English) | Explicit in 11 (34%): levels quoted include "Advanced English" (Vortigo), "B2 or above" (Quanteam), "C1 Advanced" (Luxoft), "Inglés intermedio" (ALTEN Mexico), "Excellent English communication" (Velozient); 27 of 32 postings are written in English, which implies the requirement even when not stated | rows INT-xx in section 5 |
| Cloud vendor | Azure 27% and AWS 27% (any mention), GCP 5%; Azure DevOps is the most named delivery tool (32%) | Azure 59%, AWS 44%, GCP 16%; Azure Service Bus named in 8 INT postings (25%; required in 6, a plus for Velozient and Credigy) vs 2 BR | section 6 |
| Messaging | RabbitMQ the most named broker (8, 22%), Kafka 5 | RabbitMQ 6, Azure Service Bus 8, Kafka 5; Luxoft asks for exchange/queue/binding topology and saga patterns, BlackStone eIT lists dead-letter queues, retries, acknowledgements | section 6 |
| Legacy .NET | Legacy-era tech named in 11 (30%): WCF (Vetta), Web Forms (CECAM, Agenda Assessoria), WinForms/Winservices (CECAM), .NET >= 4.5 on Windows servers (B2E), ASP.NET 4.8 (AGL), VB.NET (CXP, desirable), Delphi (Agenda); generic "legacy upkeep" wording in 11 (30%) | Legacy-era tech named in 10 (31%): .NET Framework is CoStar's "primary tool"; Quanteam asks for ".NET and .NET Framework" plus modernization; Capgemini (ASP.NET MVC + WCF + jQuery); Credigy (.NET Framework, Web Forms, as preferred experience); Luxoft (Windows Server, no containers required) | section 5 |
| Modernization explicitly asked | 4 (11%): Vetta, J&F, CXP, Empresa Confidencial (nice) | 5 (16%): Capco ("modernizing legacy .NET applications"), Quanteam, ALTEN Mexico, Avalara, Vortigo (nice) | section 5 |
| .NET version | A modern version named in 9 (24%): .NET 8 x5, .NET 6 x4, .NET 9 x1, .NET 7 x1; ".NET Core" without a number appears in 17 | A modern version named in 7 (22%): .NET 8 x3, .NET 6 x3, .NET 9 x1, .NET 7 x1; ".NET Core" appears in 16; N-iX writes ".NET 8/9" and lists Native AOT (nice) | No posting names **.NET 10**, the only version in active support on the research date; .NET 6/7 named in 9 postings are out of support since 2024 (support policy page) |
| Frontend | Angular 32% vs React 22%: full-stack C# + Angular is common in BR | React 22% vs Angular 12% | section 6 |
| Tests | Unit testing 59%, integration tests 5% | Unit testing 50%, integration tests 22% | section 6 |
| AI-assisted development | 30%: Concept IaaS, Vetta, B2E, Mídia 3 and Blite name tools or practices (Copilot, Claude, Cursor, prompts, LangChain/Semantic Kernel, MCP) | 28%: Avalara ("AI-first"), Morningstar (evaluate AI-generated code), Vivecti (Generative-AI tools), CoStar, StoneX, UST, Capco, Velozient, Credigy | section 5 |
| Domain | Financial services/fintech/banking dominate (BTG, Stone, Crefaz, Nava payments, Psm for banks, Concept insurance), plus public sector (CECAM, Agenda RPPS), ERP/retail, automotive marketplace (Webmotors) | Finance/fintech (U.S. Bank, StoneX, Capco, Morningstar, Credigy, OTR, Quanteam, Client Server), insurance (GEICO), government (Noblis: US citizen or green card holder able to obtain a Public Trust and FAA clearance), healthcare (Vivecti), POS (Velozient), tax (Avalara) | section 5 |
| Work authorization | Some postings require residence in a city/state (Psm: São Paulo state; Jobbol: listed municipalities) | US postings often require US citizenship/green card or no sponsorship (Noblis, Client Server, Credigy); Luxoft: "work from Poland"; these are not open to a Brazil-based candidate | section 5 |

Not found in any of the 69 postings: **minimal APIs**, **Blazor**, Quartz, `BackgroundService` by name, Serilog. Rare: Hangfire (1, CECAM), OpenTelemetry (3: Luxoft in its project description and as strongly preferred, N-iX x2 as nice-to-have), MassTransit (1, Luxoft). ASP.NET Identity/IdentityServer were not named; JWT/OAuth2/OIDC named in 6.

## 8. What this sample cannot tell

- **Market size or share.** 69 postings from three boards that allowed automated reading; Indeed, Glassdoor and Wellfound blocked access, and remote-only boards (Remotive, Remote OK, We Work Remotely, Himalayas) had almost no .NET roles at query time. LinkedIn ranking, not randomness, chose which results appeared.
- **International remote specifically.** Only 9 of the 32 INT postings state a remote option; 16 do not state modality and several "remote filter" results were on-site. The "from BR" subgroup (6) is the only direct evidence of foreign roles open to Brazil residents.
- **Salary.** Few postings publish pay (e.g. Programathor Concept IaaS up to R$12,000 / R$80 per hour; Morningstar Toronto $93,200-136,696, currency not stated and most likely CAD; Noblis junior US$65,200-101,950; Vivaticket from EUR 45,000); not enough for any comparison.
- **Real hiring bar.** Postings list wishes; interviews may weigh things differently (algorithms, system design, take-home tasks are not visible here).
- **Trend over time.** One snapshot, 30 days; no claim about growth or decline of .NET demand or of legacy work.
- **Junior market depth.** 11 junior postings in total (7 BR, 4 INT); conclusions about entry level are weak.
- **Keyword coding errors.** Automated matching with manual spot checks; generic terms are over-counted and technologies described in other words are under-counted.

## 9. Signals for the track (interpretation, not data)

- Core in almost every posting: C#, REST APIs with ASP.NET Core, SQL Server with EF Core (Dapper second), unit testing, Git, SOLID/design patterns. These match what a PHP/Magento backend developer already does in another stack.
- Second tier (one third to one half): messaging (RabbitMQ, Azure Service Bus, Kafka), Docker, cloud (Azure first internationally, Azure and AWS tied in BR), CI/CD with Azure DevOps, microservices, async/await.
- Legacy is real: about 3 in 10 postings in both groups name .NET Framework-era technology, so reading and migrating legacy code is a defensible module.
- English is the main barrier between the BR and INT groups, more than any technology.
- Postings name .NET 6 to 9 and none names .NET 10; teaching on the current LTS while explaining what changed since .NET 6/8 covers both what postings say and what is supported.
