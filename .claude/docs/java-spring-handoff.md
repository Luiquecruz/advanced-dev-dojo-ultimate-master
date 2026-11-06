# Java and Spring Boot track: handoff

Read [java-spring-track.md](java-spring-track.md) for the current scope and content rules. The owner replaced the combined Java/Spring/Angular curriculum with separate Java/Spring and Angular tracks. Full Stack is deferred; do not bring frontend modules back into this track.

## Current state

| Item | State |
| --- | --- |
| Identity | `java-spring`, Java and Spring Boot; content, feature flag, glyph, accent selector and verification use the same id |
| Written here | Modules 01–08, 59 lessons; current review and merge states are below |
| Remaining backend work | All backend modules are written; finish review and merge gates |
| Target | 8 required modules, 59 lessons; every lesson is theory and quiz with local practice |
| Engines | No Java engine and no challenges; existing catalog engine metadata does not launch a workspace |
| Release | Hidden; no accent color or visibility change. Java release no longer depends on Angular being shown |
| Angular | Separate track, unchanged by this work; no Angular prerequisite for Java/Spring |

## Preserved work and PR history

The integrated combined draft is pushed on `archive/java-angular-fullstack` at `0edd8eea`. It preserves 68 lessons and the latest module 06–09 review fixes, including `def2f756`, `9fc96b2d`, `11361afc` and `ad58ef0e`, including the Angular form retry and stale-input guidance. The original draft branch `wip/java-modules-03-09` and all module branches are retained. The old WIP snapshot is incomplete; the archive is the integrated reuse source.

PRs #50, #51, #53, #54 and #55 are merged and supply the first five modules. PRs #56–60 were closed as superseded by the owner's separation decision, without deleting their branches. The new backend PR sequence starts with `feat/java-spring-separation` in `/tmp/dojo-java-spring-separation`, based on reviewed main. i18n PR #52 remains unrelated planning work.

The separation change carries the valid late module 04 corrections: qualifier filtering, companion test-starter limits, nested null validation, repository quiz ambiguity, global Problem Details errors, and Boot 4.1.2's default rejection of missing primitive record components. Global-only and mixed field/global error responses were checked locally; the default Jackson behavior and nullable validation were reproduced in Boot 4.1.2. Backend consumer guidance replaces references to the removed Angular module.

## Evidence and validation

Earlier PR bodies record Maven, Java, Spring, PostgreSQL, container and URL checks. Java examples target release 25 on local JDK 27. Local evidence is under `/tmp/dojo-mNN-*.log` and `/tmp/dojo-mNN-urls.json`; the combined draft checked 213 resource URLs in modules 03–09. The new backend branches must recheck changed content and their final manifests, rather than assuming old counts apply after scope changes.

Before each commit confirm the branch. Run:

```sh
npx vitest run src/verify/java-spring.test.ts src/verify/noDates.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts
npx eslint src/verify
npx tsc --noEmit
npm run docs:check
git diff --check
```

Run application unit tests, build and relevant presentation/architecture checks for the identity change. Final checks are unfiltered; no `LESSON=__none__`. Keep conventional English commits with no attribution trailers.

Separation verification passed: 1,740 unfiltered content checks, 200 application tests, 61 presentation/glyph checks, lint, typecheck, production build and docs sync. Both tracks remain hidden, the accent values and glyph geometry are retained, and no old combined identity remains in the active source.

## Next actions

1. Review and merge the separation PR, retaining all already reviewed backend lessons.
2. Adapt Security: remove Angular interceptors/guards, make the local closing project API-only, renumber it to module 06 and keep signed-token tests distinct from mocked authentication.
3. Adapt Quality and Delivery to module 07: backend test pyramid, API-only Compose and CI, API observability and delivery acceptance checks.
4. Adapt the capstone to module 08: API requirements, implementation, persistence, security, review and packaging; remove the Angular-client stage and all browser acceptance criteria.
5. Review each backend PR with current-head CI and CodeRabbit, handle all valid feedback, merge bottom-up and preserve branches. If the service reports a review limit, record it and continue manual verification; do not represent unavailable review as completed.
6. Finish the whole-track consistency review, update this handoff and README counts, and leave the main checkout clean and current.

## Publication and future Full Stack

Java and Angular have independent feature flags and release checks. Do not turn either on or change the palette in this workflow. Before Java is shown, choose a free accent and run its release checks and browser presentation review. A future Full Stack track can reuse the archived Angular/API integration, frontend auth and combined capstone; it is not registered as an empty or duplicate track now.

## Active review stack

| PR | Purpose | State | Base |
| --- | --- | --- | --- |
| [#61](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/61) | refactor(curriculum): separate Java and Spring Boot from Angular | MERGED | `main` |
| [#62](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/62) | feat(curriculum): add backend Spring Security module | MERGED | `main` |
| [#63](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/63) | feat(curriculum): add backend quality and delivery module | MERGED | `main` |
| [#65](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/65) | feat(curriculum): add backend course catalog capstone | OPEN | `main` |

Latest action: Adapted module 08 into five backend-only capstone stages, with API contracts, persistence, token security and packaged delivery; the completed Java/Spring scope has 59 lessons.

Module 06 security review addressed filter-chain ordering, JWT formats, CSRF references, anonymous versus authenticated denials and role hierarchy wiring.

Module 07 review addressed the scoped detail route, localhost publishing, HTTP cache freshness and account changes, container build caching, actuator exposure and shutdown grace period.

Module 08 validation: 1,800 unfiltered content checks, eslint, typecheck, docs sync, API-only Compose validation and all 22 backend resource URLs pass. A representative Boot 4.1.2 API compiles and passes direct HTTP authentication, authorization, field-error, invalid-token and rejected-short-secret checks. PostgreSQL verifies the current schema, identity continuation, active-code uniqueness, soft-delete reuse and renamed fixed data. The content project is a local implementation exercise; the smoke fixture is representative rather than a complete capstone solution.
