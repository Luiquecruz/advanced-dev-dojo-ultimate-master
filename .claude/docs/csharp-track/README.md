# C#/.NET Track — Specification Index

Plan and decisions for the **C#/.NET backend track** of Constela Mission, in English like the rest of the project. It follows the shape of the Python track ([python-track/](../python-track/README.md)). Research comes first, then the plan, then lessons written module by module, each with an independent review.

## Goal

Make a learner with **no prior programming language** productive in a modern C#/.NET backend job. That covers reading and writing C#, building and securing ASP.NET Core APIs, using data access with EF Core and Dapper, testing, background work and messaging, and shipping with containers, CI/CD and observability. It also covers maintaining and migrating legacy .NET-era code (.NET Framework, WCF, Web Forms), named in about 3 in 10 postings of the sample. Every lesson connects a market competency to official documentation and a check of understanding. Each theory lesson names the mistakes beginners make with its topic in `## Common mistakes` ([06-content-standards.md](06-content-standards.md)).

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Shape | Own track, `id: csharp`, single language | The content is the platform, as with Python |
| Grading | Theory + quiz lessons, with graded C# challenges added lesson by lesson on the C# engine (26 so far: all seven of module 00, and 19 in modules 02–04, 08–10, 12 and 14). The practice projects are described in the track and done locally with the .NET SDK | v1 shipped theory and quizzes only. The [engine spike](04-engine-spike.md) said GO-WITH-CONDITIONS; the engine now exists ([csharp-engine.md](../csharp-engine.md): .NET 10 WebAssembly + Roslyn in a worker, 8.22 MiB with Brotli, no SDK at build time) |
| `track.json` engine | `"engine": "csharp"` | A lesson without a challenge renders no workspace and downloads nothing; a lesson with one downloads the engine when it opens. `src/verify/csharp.test.ts` checks the engine and grades every challenge with `csharpGrader()` |
| Baseline | **.NET 10 LTS + C# 14** | .NET 8 and 9 reach end of support on 2026-11-10, leaving .NET 10 as the supported LTS ([02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md) §1). .NET 11 (STS) is out of scope: lessons teach .NET 10 and point to Microsoft's support policy for newer releases. Postings name .NET 6–9, so lessons say what changed since .NET 6/8 |
| Audience | Learners with no prior programming language | No lesson compares C# with PHP, Magento or another stack. Each theory lesson has a `## Common mistakes` section (the mistake, what happens at runtime, the fix) and a `You need:` line naming the earlier lessons it builds on; `csharp.test.ts` enforces both for every lesson (the skip lists in `csharpPendingRewrite.ts` are empty). Module 00 teaches programming from zero and can be skipped |
| Accent | `#ff73c9` (pink, ≈ 323°) | The hue rule counts only the tracks shown to learners. C# first took the coral band of the then hidden Angular track; when Angular and Java were published the accents were respaced and C# moved to pink so Angular could use its logo red ([ARCHITECTURE.md](../ARCHITECTURE.md) "Track presentation") |
| Scope | 15 modules, 80 lessons: an optional fundamentals module 00, core 01–11, deepening 12 and 14, legacy 13 | Module 00 teaches programming from zero; a learner who can solve its 00/07 challenge without help starts at module 01, and skipping it still reaches 100%; it counts toward progress, all seven lessons, once a lesson from 00/01 to 00/06 is complete (00/07 alone, the skip test, does not start it). Core = what the [market sample](01-market-research.md) asks for in most postings. Architecture and legacy are separate so that a learner can stop after the core |
| Practice | 7 progressive projects, each described in the closing lesson of a module with features and acceptance criteria | The goal requires described projects; they are larger than a graded challenge (ASP.NET Core, databases, containers) and run locally |
| Visibility | `TRACK_FLAGS.csharp = true` since the release: every module was written, cross-reviewed and verified, and the whole track passed an independent final review (it was `false` while the modules were written) | No half-built track in the carousel |
| Language | English | Project rule |

## Documents

| File | Covers |
| --- | --- |
| [01-market-research.md](01-market-research.md) | 69 postings (37 BR, 32 international), competency frequency, BR vs international, limits |
| [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md) | Versions and support, ASP.NET Core, data, async, testing, messaging, delivery, architecture, legacy and migration, with classification 1–4 |
| [08-market-research-v2.md](08-market-research-v2.md) | Round 2: 198 postings (129 new), adoption data (surveys, NuGet downloads) kept apart from demand, stated salary ranges, what changed from round 1 |
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
