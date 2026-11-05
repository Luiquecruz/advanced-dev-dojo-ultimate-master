# C# Track — Backlog

Each item is done only when its evidence is recorded in the **Evidence** column. Status values: `todo`, `doing`, `done`.

## Research and plan

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| R1 | Market research | Real postings with dates and URLs; BR versus international; competency frequency; limits | done | [01-market-research.md](01-market-research.md): 69 postings; independent review fixed |
| R2 | Ecosystem and legacy | Official sources; classification 1–4; available, supported and adopted kept apart | done | [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md); review verdict "sound", low findings fixed |
| R4 | Engine spike | Measured feasibility and a GO/NO-GO verdict | done | [04-engine-spike.md](04-engine-spike.md): GO-WITH-CONDITIONS, prototype graded 3/3 |
| R5 | Plan | Sequence, outcomes, official materials, projects, effort, traceability; coherence review | done | [05-curriculum.md](05-curriculum.md), [06-content-standards.md](06-content-standards.md); independent coherence review "ready-after-fixes": 3 high, 11 medium, 13 low, all applied |

## Platform

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Accent and hue rule | `#ff7a7f` AA on all surfaces; hue rule counts the tracks shown to learners; docs updated | done | `trackPresentation.test.ts` 30/30 |
| P2 | Track registration | `src/content/csharp/track.json` (`order` 10, monogram `C#`), one `module.json` per module, `TRACK_FLAGS.csharp` | done | 13 modules and 67 lessons loaded; 8th card on the home carousel |
| P3 | Track conventions suite | `src/verify/csharp.test.ts`: no challenge files; resources include learn.microsoft.com; quiz has 5–6 questions with 4 options and an explanation; theory has the required headings and length | done | runs 6 checks per lesson; full `npm run verify` 3,383/3,383 |
| P6 | Code highlighting | `csharp`/`cs` fences highlighted, and the `sql` alias that was missing | done | `src/shared/ui/Markdown.test.ts` 4/4 |
| P4 | CI coverage | The verify matrix picks `csharp` up from `track.json`; the CI run is green | done | `Verify csharp` ran and passed on PR #17 |
| P5 | Docs | README tracks table, CURRICULUM section, CONTENT_GUIDE note on quiz-only tracks, `index.html` meta description | done | README (row, 722 lessons in 10 tracks), CURRICULUM, CONTENT_GUIDE "C# track" and fences, ARCHITECTURE accents, CLAUDE.md, `index.html`; `npm run docs:check` clean |

## Content (one item per module)

Acceptance for every module:
- Lessons follow [06-content-standards.md](06-content-standards.md).
- `npx vitest run src/verify/csharp.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts` passes.
- An independent cross-review has no open high or medium findings.
- Every lesson is ✓ in CURRICULUM.md.

| ID | Module | Lessons | Status | Evidence |
| --- | --- | --- | --- | --- |
| C01 | 01-platform | 4 | done | written, cross-reviewed (findings fixed), suites green |
| C02 | 02-language | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C03 | 03-collections-linq | 4 | done | written, cross-reviewed (findings fixed), suites green |
| C04 | 04-errors-async | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C05 | 05-aspnet-core | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C06 | 06-web-apis | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C07 | 07-data | 8 | done | written, cross-reviewed (findings fixed), suites green |
| C08 | 08-security | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C09 | 09-testing | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C10 | 10-background-messaging | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C11 | 11-delivery | 6 | done | written, cross-reviewed (findings fixed), suites green |
| C12 | 12-architecture | 5 | done | written, cross-reviewed (findings fixed), suites green |
| C13 | 13-legacy | 5 | done | written, cross-reviewed (findings fixed), suites green |

## Release

| ID | Item | Acceptance criteria | Status | Evidence |
| --- | --- | --- | --- | --- |
| V1 | Browser check | The track appears on the home carousel with its accent; navigation works (curriculum → lesson → Learn → Quiz → next); quiz completion persists across a reload; the console has no errors; screenshots taken | done | 2026-11-05, Chromium on `npm run dev`: 8th card "C# and .NET", accent `rgb(255, 122, 127)`; lesson tabs Learn + Quiz and no editor; `csharp` blocks highlighted; a 6/6 quiz still shows 6/6 after a reload, and localStorage has `quizzes["csharp/csharp-map"] = true`; Next lesson works; the curriculum shows "1/67 lessons complete"; no console errors |
| V2 | Final independent review | The whole track (content, suite, docs, CI) has no open high or medium findings | done | three lenses (accuracy, with 26 lessons sampled and 268 URLs requested; pedagogy; platform): 3 high, 8 medium, 13 low. All high and medium fixed: P3–P6 chain coherence, the Identity rehash, the suite now enforces heading order and Check yourself count (mutation-checked), docs counts. One low left open: about 20 lessons re-explain the PHP-FPM lifecycle in their Coming from section |
| V3 | CI/CD | The pull request CI is green, including the smoke test against the Deploy Preview; the state is recorded (CI passed is not a deploy) | doing | Split into stacked pull requests under the 300-file review limit: #18 (part 1, base `main`) and #19 (part 2, base #18), both reviewed by CodeRabbit. #18 is green at `cecf69d`, including the Deploy Preview smoke test. #19 is green at `8e39269` except the smoke test, skipped while it is stacked: Netlify previews exist only for pull requests against `main`. Remaining: after #18 merges, #19 retargets to `main`, gets `main` merged in, and its CI and smoke test run again. Production deploys only after that merge |
| V4 | Enable | `TRACK_FLAGS.csharp = true` once C01–C13 and V1–V2 are done | done | flag on; README, CURRICULUM and `index.html` updated |

## Market alignment and ongoing work

The research is refreshed by hand when the curriculum is revisited, not on a timer: the goal is to stay aligned with the market.

| ID | Item | Acceptance criteria | When | Status |
| --- | --- | --- | --- | --- |
| T1 | Trend snapshot | Repeat round 2's collection (same sources, vocabulary and dedup rules as 08-market-research-v2.md) and compare frequencies per competency against both rounds. Report only changes larger than the sampling noise. Re-check the curriculum's priorities, especially legacy (30%), cloud and messaging | at the next curriculum revision; 60–90 days after a round gives a meaningful comparison | todo |
| E1 | C# engine and challenges | Phase 1: an engine meeting the conditions of 04-engine-spike.md §10, with independent security and platform reviews. Phase 2: module 02 pilot challenges behind an approval gate, then module by module, and the practice projects as challenges where they fit. Every pull request stays under 300 files | started 2026-11-05 | doing |

## Later (not in v1)

- Trim the repeated PHP-FPM lifecycle recap in the "Coming from PHP/Magento" sections (about 20 lessons): a low finding of the final review.

- Compile the theory snippets in CI (extract the `csharp` fences into a scratch project and run `dotnet build`). This needs the .NET SDK in CI.
- Register `python` highlighting in `src/shared/ui/Markdown.tsx`: Python lessons render code fences unhighlighted today (found while adding C#).

- C# engine, following the conditions in [04-engine-spike.md](04-engine-spike.md) §10, to turn the projects into graded challenges. This needs a product decision.
- Revisit the lessons when .NET 11 ships, and again when .NET 12 LTS ships.
