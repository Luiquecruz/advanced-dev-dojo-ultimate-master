# Java and Spring Boot track: handoff

Read [java-spring-track.md](java-spring-track.md) for the current scope and content rules. The owner replaced the combined Java/Spring/Angular curriculum with separate Java/Spring and Angular tracks. Full Stack is deferred; do not bring frontend modules back into this track.

## Current state

| Item | State |
| --- | --- |
| Identity | `java-spring`, Java and Spring Boot; content, feature flag, glyph, accent selector and verification use the same id |
| Written here | Modules 01–11, 77 lessons; modules 06, 08 and 10 are new from the curriculum SDD; current review and merge states are below |
| Remaining backend work | All modules are written; compile the new Redis, Kafka, Modulith and Resilience4j snippets against Boot 4 and finish review and merge gates |
| Target | 11 required modules, 77 lessons; every lesson is theory and quiz with local practice |
| Engines | No Java engine and no challenges; existing catalog engine metadata does not launch a workspace |
| Release | Published (`java-spring: true`); accents of `react`, `react-state`, `ai-engineering` and `java-spring` were respaced to keep 30° hue distance |
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

Separation verification passed: 1,740 unfiltered content checks, 200 application tests, 61 presentation/glyph checks, lint, typecheck, production build and docs sync. At that time both tracks remained hidden, the accent values and glyph geometry are retained, and no old combined identity remains in the active source.

## Next actions

1. Compile and run the Redis, Kafka, Spring Modulith and Resilience4j snippets of modules 06, 08, 10 and 11 against Spring Boot 4, as the content standards require.
2. Handle every valid review finding on the expansion PR (#74), with current-head CI and CodeRabbit; if the service reports a review limit, record it and continue manual verification, and do not represent unavailable review as completed.
3. Keep the module numbers stable: 06 Advanced Persistence, 07 Security, 08 Messaging and Events, 09 Quality and Delivery, 10 Architecture and Resilience, 11 Capstone.
4. After the PR merges, update this handoff and README counts and leave the main checkout clean and current.

## Publication and future Full Stack

Java and Angular have independent feature flags and release checks. Both are published (`java-spring: true` and `angular: true`), and the palette was respaced when Java was published; changing a track's accent means rerunning `trackPresentation.test.ts` for every pair. A future Full Stack track can reuse the archived Angular/API integration, frontend auth and combined capstone; it is not registered as an empty or duplicate track now.

## Active review stack

| PR | Purpose | State | Base |
| --- | --- | --- | --- |
| [#61](https://github.com/Luiquecruz/constela-mission/pull/61) | refactor(curriculum): separate Java and Spring Boot from Angular | MERGED | `main` |
| [#62](https://github.com/Luiquecruz/constela-mission/pull/62) | feat(curriculum): add backend Spring Security module | MERGED | `main` |
| [#63](https://github.com/Luiquecruz/constela-mission/pull/63) | feat(curriculum): add backend quality and delivery module | MERGED | `main` |
| [#65](https://github.com/Luiquecruz/constela-mission/pull/65) | feat(curriculum): add backend course catalog capstone | MERGED | `feat/java-spring-delivery` (reached `main` through this branch) |

Latest action: Applied the curriculum SDD. New modules 06 Advanced Persistence, Locking and Redis, 08 Messaging and Events and 10 Architecture and Resilience (18 lessons); the security, quality and capstone modules moved to 07, 09 and 11; the capstone gained versioned updates, Redis caching, Kafka events, Modulith boundaries and a moderation circuit breaker; lesson 01/07 now teaches the first test with `assert`, and `@ServiceConnection` moved from Build and Tests to Spring Data Repositories; the Caching and Rate Limiting lesson no longer repeats the cache annotations. The completed scope has 77 lessons.

SDD points not taken literally: the quiz names `GenericJackson2JsonRedisSerializer`, which Spring Data Redis 4 deprecates, so the lessons use the Jackson 3 serializers; `ExponentialBackOff` retries forever by default, so the lessons use `ExponentialBackOffWithMaxRetries`; circuit breakers use Spring Cloud CircuitBreaker over Resilience4j, and Spring Framework 7's own `@Retryable` is mentioned.

Module 06 security review addressed filter-chain ordering, JWT formats, CSRF references, anonymous versus authenticated denials and role hierarchy wiring.

Module 07 review addressed the scoped detail route, localhost publishing, HTTP cache freshness and account changes, container build caching, actuator exposure and shutdown grace period.

Module 08 validation: 1,800 unfiltered content checks, eslint, typecheck, docs sync, API-only Compose validation and all 22 backend resource URLs pass. A representative Boot 4.1.2 API compiles and passes direct HTTP authentication, authorization, field-error, invalid-token and rejected-short-secret checks. PostgreSQL verifies the current schema, identity continuation, active-code uniqueness, soft-delete reuse and renamed fixed data. The content project is a local implementation exercise; the smoke fixture is representative rather than a complete capstone solution.

PR #65 review: validated both invalid fields, used the seeded course ID rather than assuming 1, and restricted demo user beans to the local profile. Boot 4.1.2 startup without supplied non-local authentication fails, and local authentication and invalid-token smoke checks pass.

PR #65 validation follow-up: disabled security filters only for the MVC validation slice and retained separate filter-enabled security tests.
