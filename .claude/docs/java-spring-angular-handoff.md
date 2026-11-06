# Java, Spring Boot and Angular track: handoff

Everything another engineer or agent needs to continue the track without the original conversation. Read [java-spring-angular-track.md](java-spring-angular-track.md) (plan, decisions, curriculum) and [system-design-track.md](system-design-track.md) (content standards) first; this file is the state and the procedure.

## State

| Item | State |
| --- | --- |
| Engine decision | Option A: no Java engine. Every module is theory + quiz with local practice projects, including module 06. No graded challenges or Java engine. |
| Track | `src/content/java-spring-angular`, `"engine": "angular"`, hidden (`TRACK_FLAGS['java-spring-angular'] = false`). |
| Written on this branch | Modules 01–09, 68 lessons; see the review-stack table below. |
| Remaining | All modules are written; remaining review and merge gates are tracked below. |
| Accent | Provisional in `src/shared/design/tokens.css`; hue collides with a shown track. Must be re-spaced before the flag is turned on (the owners decide the palette). Angular's accent (351 degrees) also collides with C# (358): fix before showing either. |
| Standards suite | `src/verify/java-spring-angular.test.ts` on `src/verify/trackStandards.ts` (shared with System Design). |
| Release gate | Showing this track also needs the Angular flag turned on (lessons link to the Angular track) and a free accent for both. |

## Progress log (update after every action)

**Owner decision: every module is theory and quizzes plus local practice. No graded challenges anywhere, including module 06. Do not build a Java engine.**

This branch contains modules 01–09, 68 lessons. The table tracks the entire review stack; later modules can exist in separate branches before they are included here.

| Module | Pull request | State | Base |
| --- | --- | --- | --- |
| 01 | [#50](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/50) | MERGED | `main` |
| 02 | [#51](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/51) | MERGED | `main` |
| 03 | [#53](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/53) | MERGED | `main` |
| 04 | [#54](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/54) | OPEN | `main` |
| 05 | [#55](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/55) | OPEN | `feat/java-module-04` |
| 06 | [#56](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/56) | OPEN | `feat/java-module-05` |
| 07 | [#57](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/57) | OPEN | `feat/java-module-06` |
| 08 | [#58](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/58) | OPEN | `feat/java-module-07` |
| 09 | [#59](https://github.com/Luiquecruz/advanced-dev-dojo-ultimate-master/pull/59) | OPEN | `feat/java-module-08` |

The original drafts remain preserved on `wip/java-modules-03-09` (checkpoint `a904f810`). Only that old snapshot has incomplete module 07 files and draft module 06 challenge artifacts. The reviewed module branches complete module 07 and exclude all challenges. Worktrees are `/tmp/dojo-java-module-03` through `/tmp/dojo-java-module-09`; final consistency work is in `/tmp/dojo-java-track-consistency`.

Local verification covers the four unfiltered content suites, lint, typecheck, application tests, build and docs sync. PR bodies record per-module evidence, Java 25-targeted compilation on local JDK 27, local Spring/container checks and resource-URL verification. Logs and reports are `/tmp/dojo-mNN-*.log` and `/tmp/dojo-mNN-urls.json`; `/tmp/dojo_pr_state.py` reads live checks and unresolved review threads into `/tmp/dojo-pr-state.json`.

Both release flags stay off and accents remain unchanged. The owners decide the palette and the release. PR #52 is i18n planning only; no i18n implementation is authorized by this workflow.

Recent review and merge records:
- PR #51 review pass: corrected ten Java content findings, aligned module 06 descriptions and the README track row with the theory-and-quiz decision, and clarified consecutive numbering. Validation passed: 1,671 tests, one skipped; eslint, TypeScript, docs sync and Java snippet checks (`javac --release 25` on JDK 27). All checks and review threads subsequently passed; PR #51 is merged.
- PR consistency preparation: the final review enforces the theory-and-quiz-only decision in the track suite and aligns the completed curriculum description; module merges are still in progress.

Next steps:
1. Fix valid review findings, answer every thread, and verify the current commit's checks and review before merging.
2. Merge bottom-up. Retarget the next PR to `main` before merging its parent, retain branches, merge `origin/main` into the next branch and rerun the required checks. Resolve shared handoff edits by retaining both modules' completed work.
3. Finish the whole-track consistency PR, including prerequisites, contracts, lesson counts, the no-challenge policy and the handoff. Keep release flags and accents unchanged.

## Module map (folder numbers are fixed; module 01 is required, none is optional)

Each lesson: `theory.md`, `concepts.json`, `quiz.json`, `meta.json`. No graded challenge files in any module. Theory 500 to 1,300 words (module 01 is 300 to 1,000). Closing lesson of each module is a practice project built locally (JDK 25, Maven from module 03 on).

| Folder | Module | Planned lessons |
| --- | --- | --- |
| `02-the-java-language` | The Java language | records, enums and sealed types; interfaces and generics; collections; streams and `Optional`; exceptions in depth; concurrency basics (threads, executors, virtual threads); packages and modules; closing project |
| `03-build-and-tests` | Build and tests | Maven and the project layout; JUnit 5; Mockito; test slices; Testcontainers; closing project |
| `04-spring-boot-core` | Spring Boot core | inversion of control and dependency injection; auto-configuration; configuration and profiles; REST controllers; Jakarta Validation; Problem Details (RFC 7807 / 9457) error handling; OpenAPI with springdoc; closing project |
| `05-persistence` | Persistence | JPA and Hibernate; repositories; relationships; transactions; the N+1 problem; pagination; database migrations; soft delete; Open Session in View; closing project |
| `06-angular-with-a-spring-backend` | Angular with a Spring back end | `HttpClient` and `httpResource`; mapping Problem Details to Signal Forms errors; pagination and sorting; route guards; CORS; a typed client from OpenAPI; smart and presentational components. Theory and quiz only; link to Angular track lessons only if the Angular flag ships in the same release, otherwise carry short fundamentals. |
| `07-security` | Security | Spring Security filter chain; sessions versus tokens; JWT and OAuth 2 resource servers; CSRF and CORS; method security; Angular interceptors and guards. Fake credentials only, in code fences. |
| `08-quality-and-delivery` | Quality and delivery | the test pyramid for both ends; Docker and Compose; CI; Actuator and Micrometer; caching; rate limiting; production configuration |
| `09-capstone` | Capstone | full-stack course catalog (Spring API with persistence, security, tests, and an Angular client); written as a project lesson set |

Module 06 is theory + quiz only (owner decision: no graded challenges). If challenges are ever reinstated, each needs `challenge.md` (without it the loader does not register the challenge), `starter`, `solution`, `tests` on the Angular engine, at least 2 hints separated by `---`, a non-trivial `approach.md`, and a starter that fails at least one test.

## Rules (all enforced by the suites)

- English only, American spelling. Numbers with separators (`10,000`).
- No dates, no changelog wording (`src/verify/noDates.ts`): no years after "in", "since", "as of", ISO dates, "this year", "latest version", "release notes". A pinned version (Java 25, Spring Boot 4, Angular 22) is fine and is stated where a fact depends on it.
- No bridges: never compare with another language ("if you know X", "like in Python").
- Theory template: `# Title`, one introduction paragraph, `You need:` line naming only EARLIER lessons by exact title (the first lesson of a track: `You need: nothing. This is the first lesson of the track.`), concept sections with correct code, `## Common mistakes` (2 to 4 bullets, 60 to 180 words, first bullet is the beginner mistake), `## In practice`, `## Check yourself` (2 to 4 numbered questions).
- Quiz: 5 to 6 scenario questions, 4 distinct options, answer indexes spread (at least 2 values, none used by more than half), explanation over 40 characters, exactly one defensible answer. Concepts: 4 to 8, each description ends with a period. `meta.json`: `title`, `summary`, `level`, `tags`, 2 to 6 `resources` on official hosts only (the `RESOURCE_HOSTS` set in `src/verify/java-spring-angular.test.ts`: Java, Spring, Maven, Gradle, JUnit, Mockito, Testcontainers, Hibernate, Jakarta, Angular, OWASP, RFC, Docker, Micrometer and similar; add a host there only when it is first-party); verify every URL returns 200 with no redirect to another host; write `meta.json` last.
- Add every written lesson with a `✓` to `.claude/docs/CURRICULUM.md` (test `curriculum.test.ts`); update README lesson counts.
- A fact about Java 25, Spring Boot 4, Spring Framework 7 or Angular 22 is checked against the official documentation. Compile every Java snippet (`javac --release 25`; a newer local JDK is acceptable but say so); the Spring and Angular snippets are checked against the documentation and, for Angular, the engine.
- Commits: conventional (`feat:`, `fix:`, `docs:`), English, NO `Co-Authored-By` or AI attribution trailers, ever. Never `gh pr merge --delete-branch` on a stacked PR.

## Procedure per module

1. `git fetch origin`; branch from `origin/main` (or stack on the previous module branch); confirm with `test "$(git branch --show-current)" = <branch>` before every commit.
2. Write the lessons (one writer; parallel writers only for different modules).
3. Update `.claude/docs/CURRICULUM.md` (a `✓` for each written lesson), README counts and any doc `docs:check` lists, then verify: `npx vitest run src/verify/java-spring-angular.test.ts src/verify/noDates.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts`, then `npx eslint src/verify`, `npx tsc --noEmit`, `npm run docs:check`. Run unfiltered (do not use `LESSON=__none__` as the final check).
4. Independent review by a second reader who has not seen the writer's work: facts against official docs, compile the snippets, quiz keys, concept ordering (nothing used before it is taught), `You need:` accuracy. Fix every defect, rerun step 3.
5. Re-run step 3 after fixing every review defect.
6. Commit, push, open the PR (under 300 files, base `main` or the previous branch). Stacked PRs: merge bottom-up; before merging the bottom one run `gh pr edit <next> --base main`, merge without deleting the branch, merge `origin/main` into the next branch, push, wait for CI.
7. CodeRabbit: read every comment (`gh api repos/<owner>/<repo>/pulls/<n>/comments`), fix valid ones, answer each thread (fix or reasoned refusal) with a reply, wait for CI, repeat until no open comment. Re-apply the `docs:none` label only when a push leaves a hooked area undocumented on purpose.
8. After all modules: a whole-track independent review (consistency, ordering across modules, quiz quality, no repeated content, links between lessons), then fix and open the final PR.

## Before the track is shown

1. Re-space the accent palette (or pick a free hue 30 degrees from every shown accent; `trackPresentation.test.ts`) for this track and for Angular.
2. Turn on `angular` and `java-spring-angular` in `src/content/featureFlags.ts` in the same release; update the README rows, the hidden-track sentence and the plan doc.
3. Run `npm run build`, `npm run test`, `npm run verify`, `npm run lint`, `npm run typecheck`, look at the home carousel and the track page in a browser at desktop and 390 px width, check the logo trace animation.
4. If a Java engine is ever added (options B or C of the plan), module `00` becomes an optional first module and the others renumber: that is a separate decision for the owners (CheerpJ licence terms must be confirmed with the vendor first).

## Gotchas learned

- A local `LESSON=` filter skips per-lesson checks; CI runs everything. Always run unfiltered before pushing.
- A teammate or agent can end up on the wrong branch after a failed `git switch`; verify the branch name before committing.
- `URL` parsing in verification must be guarded (`URL.canParse`) so a bad resource URL reports a violation, not a crash.
- JUnit's user guide URL redirects to a host outside the allowed list; link `https://junit.org/` instead.
- `String.format` output depends on the default locale; say so when a lesson prints decimals.
- Java 25 allows instance `main` methods (JEP 512); a missing `static` no longer stops a program from starting, so do not claim it does.
- `java File.java` source-file mode can use other source files in the same folder; do not say it handles one file only.
