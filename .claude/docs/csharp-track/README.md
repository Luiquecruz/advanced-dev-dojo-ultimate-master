# C#/.NET Track — Specification Index

Plan and decisions for the **C#/.NET backend track** of Dev Dojo, in English like the rest of the project. It follows the shape of the Python track ([python-track/](../python-track/README.md)). Research comes first, then the plan, then lessons written module by module, each with an independent review.

## Goal

Make a backend developer coming from **PHP/Magento** productive in a modern C#/.NET backend job. That covers reading and writing C#, building and securing ASP.NET Core APIs, using data access with EF Core and Dapper, testing, background work and messaging, and shipping with containers, CI/CD and observability. It also covers maintaining and migrating legacy .NET-era code (.NET Framework, WCF, Web Forms), named in about 3 in 10 postings of the sample. Every lesson connects a market competency to official documentation and a check of understanding. Magento knowledge is reused where it transfers (DI, ORM, events, cron, queues), and the traps are named where it does not.

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Shape | Own track, `id: csharp`, single language | The content is the platform, as with Python |
| Grading | **Theory + quiz lessons only** (no code challenges) for v1. The practice projects are described in the track and done locally with the .NET SDK | There is no C# engine yet. The [engine spike](04-engine-spike.md) says GO-WITH-CONDITIONS (≈ 7 MB, the worker CSP works, no SDK at build time), but building an engine is a separate decision. The CONTENT_GUIDE already supports quiz-only lessons |
| `track.json` engine | `"engine": "typescript"`, a placeholder that is never used | The loader requires an engine. A lesson without a challenge renders no workspace and boots no worker. `src/verify/csharp.test.ts` fails if any C# lesson ships a challenge, so the placeholder can never grade C# |
| Baseline | **.NET 10 LTS + C# 14** | .NET 8 and 9 reach end of support on 2026-11-10, leaving .NET 10 as the supported LTS ([02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md) §1). .NET 11 (STS) appears only in dated **Status as of 2026-11-05** blocks. Postings name .NET 6–9, so lessons say what changed since .NET 6/8 |
| Audience | Backend developers from PHP/Magento | Each lesson has a "Coming from PHP/Magento" section with what transfers and the trap |
| Accent | `#ff7a7f` (coral, ≈ 358°) | The hue rule now counts only the tracks shown to learners. C# takes the band of the hidden Angular track. Enabling Angular fails `trackPresentation.test.ts` and forces a new choice ([ARCHITECTURE.md](../ARCHITECTURE.md) "Track presentation") |
| Scope | 13 modules, 67 lessons: core 01–11, deepening 12, legacy 13 | Core = what the [market sample](01-market-research.md) asks for in most postings. Architecture and legacy are separate so that a learner can stop after the core |
| Practice | 7 progressive projects, each described in the closing lesson of a module with features and acceptance criteria | The goal requires described projects; there is no executable C# in the app |
| Visibility | `TRACK_FLAGS.csharp = true` since the release: every module was written, cross-reviewed and verified, and the whole track passed an independent final review (it was `false` while the modules were written) | No half-built track in the carousel |
| Language | English | Project rule |

## Documents

| File | Covers |
| --- | --- |
| [01-market-research.md](01-market-research.md) | 69 postings (37 BR, 32 international), competency frequency, BR vs international, limits |
| [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md) | Versions and support, ASP.NET Core, data, async, testing, messaging, delivery, architecture, legacy and migration, with classification 1–4 |
| [04-engine-spike.md](04-engine-spike.md) | Feasibility of grading C# in the browser (.NET 10 WASM + Roslyn), sizes, timing, CSP, security, conditions |
| [05-curriculum.md](05-curriculum.md) | Modules and lessons, outcomes, prerequisites, official materials, projects, completion criteria, effort, traceability matrix |
| [06-content-standards.md](06-content-standards.md) | Lesson contract for this track: theory template, quiz rules, resources, dated facts |
| [07-backlog.md](07-backlog.md) | Platform and content backlog with acceptance criteria and evidence |

## Process

1. **Research.** Four documents, each checked by an independent reviewer whose findings were fixed.
2. **Plan.** This folder, checked for coherence by a reviewer who did not write it.
3. **Platform.** Track registration, accent, verification suite and docs.
4. **Content.** Modules written in parallel, one author per module, then a cross-review by an agent that did not write the module, then fixes.
5. **Verification.** `npm run verify`, a browser check of navigation, quiz, progress persistence and console, then CI on the pull request.
