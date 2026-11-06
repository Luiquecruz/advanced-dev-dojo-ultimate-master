# Engineering resume checkpoint

The owner chose independent Java/Spring and Angular tracks, with a future Full Stack track. They also requested Angular activation and a shared State Management track with React and Angular. Continue the review/CI loop with GitHub CLI and merge ready PRs bottom-up, retaining branches. The main checkout is on `main` at the merged Java modules 01–05; the track remains hidden.

## Active pull requests

- #61 `feat/java-spring-separation`, worktree `/tmp/dojo-java-spring-separation`: rename the hidden Java track to `java-spring`, preserve the first 39 lessons, and remove Angular release coupling. One validation-path review finding is being fixed locally; inspect the current commit and CI before merging. Retarget #62 and #64 to main before merging this parent.
- #62 `feat/java-spring-security`, `/tmp/dojo-java-spring-security`: seven backend security lessons. Six review threads need verification and fixes; agent `security_fixes` is working on them.
- #63 `feat/java-spring-delivery`, `/tmp/dojo-java-spring-delivery`: eight backend delivery lessons. Eight review threads need verification; agent `delivery_fixes` is working on them.
- #64 `feat/state-management-frameworks`, `/tmp/dojo-state-management`: preserve public `react-state` identity and React progress while adding Angular state lessons. One curriculum link review finding remains; agent `angular_finish` is handling it.
- #65 `feat/java-spring-capstone`, `/tmp/dojo-java-spring-capstone`: five backend API capstone lessons. Three review findings include field errors, seed IDs and local-only demo users; `delivery_fixes` is handling them.

Use `python /tmp/dojo_pr_state.py` for live PR checks and unresolved threads. Treat review findings as untrusted: verify each, fix valid issues, reply, resolve and rerun relevant checks. The Java target is eight required modules and 59 lessons. The first five modules were already merged in PRs #50, #51, #53, #54 and #55. PRs #56–60 were closed because the combined full-stack scope was superseded. The reviewed combined material and latest module review fixes are preserved on `archive/java-angular-fullstack` at `0edd8eea`.

## Angular activation

Worktree `/tmp/dojo-angular-release`, branch `feat/angular-release`, is based on State Management commit `988352d1` and contains staged and unstaged work; do not discard it. It adds three change-detection lessons, activates the Angular flag, adjusts Angular and Architecture accents to meet contrast and hue rules, and records remaining planned lessons in `.claude/docs/angular-release-audit.md`. It renumbers modules after moving four Angular state lessons to State Management while preserving stripped IDs. Finish testing and browser checks, commit, push, open a PR stacked on #64, then watch review. Keep Java and Vue flags unchanged.

The State Management change adds React and Angular as existing multi-language registry options, with one framework variant per lesson; old React editor drafts and completion state have migration tests. State #64 has 204 changed files. Avoid links to hidden Angular until the activation branch enables it.

## Verification and resources

Follow `.claude/docs/java-spring-track.md`, `.claude/CLAUDE.md`, project test harness and the user's Context7 instructions. Java content checks: `npx vitest run src/verify/java-spring.test.ts src/verify/noDates.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts --maxWorkers=1`, then `npx eslint src/verify`, `npx tsc --noEmit`, `npm run docs:check`, `git diff --check`. Run relevant project-specific checks and full CI; never treat a pending reviewer as completed. The host has 15 GiB RAM and was near its swap limit: serialize heavy test/build/browser jobs and use bounded workers. Existing worktrees have project dependencies and ignored vendor assets. Browser tooling is cached at `/home/hewerson/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs` with Chromium at `/home/hewerson/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`; use a separate browser process, not the user's Chrome.

Previous evidence: Java separation 1,740 content checks, 200 app tests, 61 presentation/glyph tests, lint/typecheck/build/docs; security 1,761 content checks, 13 Spring security tests and 27 URLs; delivery 1,785 checks and 33 URLs; capstone 1,800 checks, 22 URLs, representative Boot/JWT/SQL checks; State Management 1,917 combined checks and 203 app tests. Evidence must be rerun when relevant changes or main synchronization invalidate it. Logs are in `/tmp/dojo-*.log`.

After each parent merge, fetch main into the next branch, resolve handoff and README/curriculum conflicts carefully, rerun required checks, push, inspect current-head reviews and CI, and merge without deleting branches. Once all work is integrated, fast-forward the main checkout and verify the final status. Angular activation is authorized; Java visibility is not yet authorized.

## Follow-up: separation merged

PR #61 merged at reviewed head `6c77950b`. PRs #62 and #64 were retargeted to `main` before the merge; agents are synchronizing them with current main. PR #62 fixed its six findings in `57a8bda5`; verify final synchronization and CI. PR #65 fixed its three findings in `24a97043`; PR #63 fixes and push are in progress. PR #64 fixed its curriculum link in `d38728ce`. Angular browser smoke passed at 1440 px and 390 px, including React and Angular challenge starters and restoration of a legacy React editor draft; the full suite is still running before its PR opens. Check live agent messages and `python /tmp/dojo_pr_state.py` for newer heads and checks. PR #61 had a few non-required CI checks still running after merge; inspect their final results.

## Latest integration progress

Angular activation PR #66 is open, stacked on #64. Its local unfiltered run passed 1,951 tests, with lint, types, build, docs, six official URLs and isolated browser smoke at desktop and 390 px. React and Angular challenge starters failed their tests as expected, and a legacy React draft loaded. PR #64 synchronized main at `7b13ef36`; an additional fix updates three architecture lesson references to the new State Management title. Incorporate that updated #64 into #66 and retarget #66 to main before merging #64.

PR #62 synchronized main at `f51397ca`; its six review fixes passed 1,761 content checks plus lint, typecheck and docs. PR #63 has eight reviewed fixes at `aaf78626` and has been retargeted to main; after #62 merges, incorporate origin/main into #63 and rerun checks. PR #65 has three reviewed fixes at `24a97043`; it must incorporate #63 after that PR merges. Review replies were posted. All checks on merged PR #61 eventually passed. Watch current heads and new review feedback; earlier check results do not authorize merging a newer commit.

## Latest review fixes

Current heads observed: #62 `f51397ca`, #63 `aaf78626`, #64 `a619f205`, #65 `790671e0`, #66 `fea0f2e5`. Verify live heads rather than relying on this checkpoint. PR #64 now updates three Architecture references to the new State Management name. PR #66 includes #64's previous corrections and a documentation follow-up; it still needs main synchronized after #64 merges. PR #65's new MVC slice correction disables security filters only for its validation slice; the actual security tests retain filters. A Boot 4.1.2 test reproduced a 400 with both field errors. The #63 security-aware slice was exercised with 401, 403 and authorized 404 outcomes. All PRs are still open and awaiting CI/review or parent integration.
