# Java, Spring Boot and Angular track: handoff

Everything another engineer or agent needs to continue the track without the original conversation. Read [java-spring-angular-track.md](java-spring-angular-track.md) (plan, decisions, curriculum) and [system-design-track.md](system-design-track.md) (content standards) first; this file is the state and the procedure.

## State

| Item | State |
| --- | --- |
| Engine decision | Option A: no Java engine. Every module is theory + quiz with local practice projects, including module 06. No graded challenges or Java engine. |
| Track | `src/content/java-spring-angular`, `"engine": "angular"`, hidden (`TRACK_FLAGS['java-spring-angular'] = false`). |
| Written | Modules `01-java-from-zero` and `02-the-java-language` (8 lessons each, the last of each is a local project). |
| Remaining | Modules 03 to 09 below. |
| Accent | Provisional in `src/shared/design/tokens.css`; hue collides with a shown track. Must be re-spaced before the flag is turned on (the owners decide the palette). Angular's accent (351 degrees) also collides with C# (358): fix before showing either. |
| Standards suite | `src/verify/java-spring-angular.test.ts` on `src/verify/trackStandards.ts` (shared with System Design). |
| Release gate | Showing this track also needs the Angular flag turned on (lessons link to the Angular track) and a free accent for both. |

## Progress log (update after every action)

Keep this section current: after every merge, PR, review or decision, add a line and commit it with the work. Another provider must be able to resume from this file alone.

**Owner decision (token budget): the track keeps only theory and quizzes. No graded challenges anywhere, including module 06 (it becomes theory + quiz like the rest). Do not build a Java engine.**

State of the work:
- PR #53 reuse lifecycle follow-up: documented persistent credentials/ports, Docker-aware network restrictions and removal when a reusable container is no longer needed.
- PR #53 reuse follow-up: explained cross-project configuration matching, project-specific container configuration and per-run isolation or exclusive serialized cleanup.
- PR #53 follow-up: documented resetting persistent tables only in a dedicated reused test database before rerunning the JDBC example.
- PR #53 review pass: corrected all six CodeRabbit findings covering verbose dependency trees, the conditional Main launch, image tag mutability, manually managed reuse, separate tool commands and Surefire argLine placement. Revalidating before the next review.
- Module 03: PR #53 open on `main` after PR #51 merged; main merged into its branch. Seven lessons copied from the preserved WIP branch; curriculum and counts updated. Reviewed Maven build defaults, Spring test descriptions, quiz keys and resources. Fixed MockMvc opt-in wording, test database replacement, Docker tag repeatability, a matcher question with two correct answers and the missing JDBC-driver instruction. Pinned standalone build plugins. All 34 resource URLs return HTTP 200 on their original hosts. The local project passes 15 tests and generates its JaCoCo report under Maven 3.9.11 and JDK 27 with release 25; its tests reject an always-Loaned implementation. Five Spring slice/context/container tests pass. Validation: 1,692 content tests, one skipped; 200 application tests; build, lint, typecheck and docs sync pass. CodeRabbit review and checks on the updated main base gate the merge. Module 04 is PR #54, stacked on module 03.
- PR #51 review pass: corrected ten Java content findings, aligned module 06 descriptions and the README track row with the theory-and-quiz decision, and clarified consecutive numbering. Validation passed: 1,671 tests, one skipped; eslint, TypeScript, docs sync and Java snippet checks (`javac --release 25` on JDK 27). The next CodeRabbit review and remote CI gate the merge. Uncommitted module 05–07 drafts remain preserved in the original workspace.
- Module 01: merged (PR #50).
- Module 02: merged in PR #51 after all checks passed and all 12 review threads were resolved. Branch retained.
- Modules 03 to 09: unreviewed drafts saved and pushed on `wip/java-modules-03-09` (head `dec32aeb`), with additional uncommitted module 05–07 work in the original checkout. Modules 03, 04, 08 and 09 have metadata for every lesson; inspect 05–07 for incomplete lessons. No module 03–09 content is included in PR #51.
- No CURRICULUM.md rows or README counts exist yet for modules 03 to 09. The curriculum test fails until each written lesson has a `✓` row.
- The module-numbering check requires present modules to be numbered consecutively from 01; it does not require modules 03 to 09 to exist.
- i18n plan: PR #52 (docs only); owner decisions D1 to D12 open; no implementation.

Next steps, in order:
1. Merge `origin/main`; for each finished module folder run the independent review (facts against official docs, compile snippets, quiz keys, ordering, `You need:`), fix defects, add `✓` rows to CURRICULUM.md and update README counts and the track description.
2. One branch and PR per module (under 300 files each), based on `main` after the previous PR merges; CodeRabbit loop on each; merge without `--delete-branch`.
3. Whole-track consistency pass: cross-module references (writers named other modules only by number and topic), project lessons that assume earlier projects (the capstone assumes `/api/courses` and an Angular client), repeated content.
4. Before showing the track: accent re-spacing, turn on the `angular` and `java-spring-angular` flags together (see "Before the track is shown").

## Remaining modules (folder numbers are fixed; module 01 is required, none is optional)

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
