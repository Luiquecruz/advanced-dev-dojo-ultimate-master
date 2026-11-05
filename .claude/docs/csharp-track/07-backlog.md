# C# Track — Backlog

Each item is done only when its evidence is recorded in the **Evidence** column. Status values: `todo`, `doing`, `done`.

## Research and plan

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| R1 | Market research | Real postings with dates and URLs; BR versus international; competency frequency; limits | done | [01-market-research.md](01-market-research.md): 69 postings; independent review fixed |
| R2 | Ecosystem and legacy | Official sources; classification 1–4; available, supported and adopted kept apart | done | [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md); review verdict "sound", low findings fixed |
| R3 | balta.io catalog | Exact titles, slugs, workloads and versions; verified versus unavailable; overlaps and gaps | done | [03-balta-catalog.md](03-balta-catalog.md): 43 courses checked in detail; review findings fixed |
| R4 | Engine spike | Measured feasibility and a GO/NO-GO verdict | done | [04-engine-spike.md](04-engine-spike.md): GO-WITH-CONDITIONS, prototype graded 3/3 |
| R5 | Plan | Sequence, outcomes, courses, projects, effort, traceability; coherence review | done | [05-curriculum.md](05-curriculum.md), [06-content-standards.md](06-content-standards.md); independent coherence review "ready-after-fixes": 3 high, 11 medium, 13 low, all applied |

## Platform

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Accent and hue rule | `#ff7a7f` AA on all surfaces; hue rule counts the tracks shown to learners; docs updated | done | `trackPresentation.test.ts` 30/30 |
| P2 | Track registration | `src/content/csharp/track.json` (`order` 10, monogram `C#`), one `module.json` per module, `TRACK_FLAGS.csharp` | doing | files written; listed by the loader once lessons exist |
| P3 | Track conventions suite | `src/verify/csharp.test.ts`: no challenge files; resources include learn.microsoft.com; balta.io links use slugs from the catalog; quiz has 5–6 questions with 4 options and an explanation; theory has the required headings and length | doing | suite written; runs per lesson once content exists |
| P6 | Code highlighting | `csharp`/`cs` fences highlighted, and the `sql` alias that was missing | done | `src/shared/ui/Markdown.test.ts` 4/4 |
| P4 | CI coverage | The verify matrix picks `csharp` up from `track.json`; the CI run is green | todo | |
| P5 | Docs | README tracks table, CURRICULUM section, CONTENT_GUIDE note on quiz-only tracks, `index.html` meta description | todo | |

## Content (one item per module)

Acceptance for every module:
- Lessons follow [06-content-standards.md](06-content-standards.md).
- `npx vitest run src/verify/csharp.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts` passes.
- An independent cross-review has no open high or medium findings.
- Every lesson is ✓ in CURRICULUM.md.

| ID | Module | Lessons | Status | Evidence |
| --- | --- | --- | --- | --- |
| C01 | 01-platform | 4 | todo | |
| C02 | 02-language | 5 | todo | |
| C03 | 03-collections-linq | 4 | todo | |
| C04 | 04-errors-async | 5 | todo | |
| C05 | 05-aspnet-core | 5 | todo | |
| C06 | 06-web-apis | 5 | todo | |
| C07 | 07-data | 8 | todo | |
| C08 | 08-security | 5 | todo | |
| C09 | 09-testing | 5 | todo | |
| C10 | 10-background-messaging | 5 | todo | |
| C11 | 11-delivery | 6 | todo | |
| C12 | 12-architecture | 5 | todo | |
| C13 | 13-legacy | 5 | todo | |

## Release

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| V1 | Browser check | The track appears on the home carousel with its accent; navigation works (curriculum → lesson → Learn → Quiz → next); quiz completion persists across a reload; the console has no errors; screenshots taken | todo | |
| V2 | Final independent review | The whole track (content, suite, docs, CI) has no open high or medium findings | todo | |
| V3 | CI/CD | The pull request CI is green, including the smoke test against the Deploy Preview; the state is recorded (CI passed is not a deploy) | todo | |
| V4 | Enable | `TRACK_FLAGS.csharp = true` once C01–C13 and V1–V2 are done | todo | |

## Later (not in v1)

- Compile the theory snippets in CI (extract the `csharp` fences into a scratch project and run `dotnet build`). This needs the .NET SDK in CI.
- Register `python` highlighting in `src/shared/ui/Markdown.tsx`: Python lessons render code fences unhighlighted today (found while adding C#).

- C# engine, following the conditions in [04-engine-spike.md](04-engine-spike.md) §10, to turn the projects into graded challenges. This needs a product decision.
- Revisit the lessons when .NET 11 ships, and again when .NET 12 LTS ships.
