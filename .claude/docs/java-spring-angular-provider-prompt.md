# Starting prompt for another provider

Paste this as the first message to the new coding agent (Codex or similar), with the repository checked out.

```
You are continuing work on the Constela Mission repository (React, Vite, Tailwind; browser-only learning platform). Read, in order: .claude/CLAUDE.md, .claude/docs/CONTRIBUTING.md, .claude/docs/java-spring-angular-handoff.md (state, rules, procedure, progress log), .claude/docs/java-spring-angular-track.md (plan) and .claude/docs/system-design-track.md "Content standards".

Goal: finish the hidden track "Java, Spring Boot and Angular" (src/content/java-spring-angular). Owner decisions: theory and quiz only (no graded challenges, no Java engine); everything in English; no dates or changelog wording in lessons; no comparisons with other languages; never add Co-Authored-By or any AI attribution to commits or pull requests; conventional commits; never `gh pr merge --delete-branch` on a stacked pull request; verify `git branch --show-current` before every commit; fetch and merge origin/main before branching or pushing.

Current state (see the progress log in the handoff for the latest): modules 01 merged; module 02 in PR #51; modules 03 to 09 are drafts on the pushed branch wip/java-modules-03-09 (unreviewed; 05, 06 and 07 may be incomplete: a module is finished when every lesson folder has meta.json and the suites pass); i18n plan in PR #52 (planning only, owner decisions open, do not implement).

Do, in order: (1) check out wip/java-modules-03-09, finish incomplete modules, (2) for each module run an independent review (facts against official docs for Java 25, Spring Boot 4, Angular 22; compile snippets; quiz answer indexes; nothing used before it is taught; exact You need titles), fix every defect, (3) add the CURRICULUM.md rows with a check mark per written lesson and update README counts, (4) one branch and pull request per module under 300 files, run `npx vitest run src/verify/java-spring-angular.test.ts src/verify/noDates.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts`, `npx eslint src/verify`, `npx tsc --noEmit`, `npm run docs:check` before each push, (5) answer every CodeRabbit comment (fix or reasoned refusal), wait for CI, merge bottom-up, (6) a final whole-track consistency pass, (7) update the progress log in the handoff after every action and commit it. Do not turn the track on (TRACK_FLAGS) or change accents: the owners decide the palette and the release.
```
