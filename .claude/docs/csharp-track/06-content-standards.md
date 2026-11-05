# C# Track — Content Standards

The rules every lesson of `src/content/csharp` follows. The general format is in [CONTENT_GUIDE.md](../CONTENT_GUIDE.md). This file only adds what is specific to this track.

## No bridges

The track is written for a learner with no prior programming language. A lesson never explains C# by comparison with PHP, Magento or another stack: no "Coming from" section, no PHP or Magento names in any lesson file (theory, quiz, concepts, `meta.json` title, summary and resources, and for a challenge `challenge.md`, hints, approach, `tests.cs`, starter and solution), nor in `track.json` or a `module.json`. `csharp.test.ts` rejects, among others (the full list is the `PHP_BRIDGE` constant): `PHP` and every word starting with it (`PHPUnit`, `PHPStan`, `PHP-FPM`), `php` and `phpunit`, `.php` and `.phtml` files, `php.ini`, `PSR-3` and the other PSRs, PHP method calls (`$this->assertSame()`, `$repository->save()`) and `::get`, `Magento` and `bin/magento`, `Adminhtml`, `routes.xml`, `di.xml`, `crontab.xml`, `db_schema.xml`, `webapi.xml`, `events.xml`, `system.xml`, `acl.xml`, `module.xml`, `<preference>`, `<virtualType>`, `shared="false"`, around plugins and the other Magento plugin phrasings ("plugins and observers", "no plugins", "without plugins", "like a plugin", "a plugin intercepts", "plugins that intercept"; a bare "plugins", as in "an `AppDomain` to isolate plugins", is a .NET fact and passes), the `setup:` commands (`setup:upgrade`, `setup:di:compile`), `getSize()` and `count($collection)`, EAV, the `sales_order_*` events, "Update by Schedule", Composer and its files, Packagist, Monolog, Guzzle, `ObjectManager`, Warden, DDEV, Zend, Laminas, Psalm, Rector, Laravel, Symfony, Doctrine, Eloquent, OPcache and Xdebug. The trap such a comparison used to carry stays, rewritten in C# terms, in `## Common mistakes`. Other languages appear only as facts of the .NET ecosystem (the SignalR JavaScript client, Aspire's polyglot hosting), never as a starting point. A lesson that depends on an earlier one names it (`You need:`) instead of assuming outside knowledge.

## Lesson folder

```
src/content/csharp/<NN-module>/<NN-lesson>/
├── meta.json       title, summary, level, tags, resources (write it last)
├── theory.md       the lesson
├── concepts.json   4–8 key terms with one-sentence descriptions
└── quiz.json       5–6 questions
```

- **Challenge files are optional.** A lesson may add a graded C# challenge (`challenge.md`, `starter.cs`, `solution.cs`, `tests.cs`, `hints.md`, `approach.md`) on the C# engine, in the format of CONTENT_GUIDE.md "C# engine" and with the steps of [csharp-engine.md](../csharp-engine.md) "Giving a lesson a C# challenge"; `src/verify/csharp.test.ts` grades it. The theory and quiz files above stay required. A challenge has 3–6 tests named as requirements; exactly one is marked `// beginner mistake: <the mistake>` on the line above its `[Test("…")]`, the most common wrong implementation a newcomer writes (ideally a mistake named in `## Common mistakes`), `csharp.test.ts` checks the count and the marker; the author grades that wrong version once to confirm that this test fails on it while the solution passes. Starters and solutions use only what the lesson and earlier lessons teach: no LINQ before 03/02, no primary constructor on a class before 02/05. Mark the lesson **(challenge)** in CURRICULUM.md.
- Lesson ids are unique in the track and listed in [05-curriculum.md](05-curriculum.md). Folder prefixes set the order.
- `meta.json` `level`: `beginner` | `intermediate` | `advanced`. `tags` hold three entries: status (`recommended`, `established`, `legacy` or `context`, matching classes 1–4 of [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md)), tier (`core`, `deepening` or `legacy`) and kind (`theory` or `project`).

## Theory template (`theory.md`)

500–1,300 words for a theory lesson, 400–1,300 for a project lesson (an exception to the CONTENT_GUIDE's 250–900 words, recorded there in "C# track": most lessons have no challenge, so the theory and the quiz carry the lesson). Headings in this order:

1. `# <title>`: one paragraph on what the learner will be able to do after the lesson, then a `You need:` line naming the earlier lessons it builds on.
2. Concept sections (`##`), each with a short C# snippet in a ```` ```csharp ```` block (highlighted by the app; `sql` and `bash` fences too). Snippets must compile on .NET 10 / C# 14 as written; mark partial snippets with `// ...`. Prefer real ASP.NET Core and EF Core APIs over toy code. There is no automated compile check in v1 (no SDK in CI): authors check every API against its learn.microsoft.com page and the cross-review re-checks it.
   The first `##` section is a concept section, never `## Common mistakes`.
3. `## Common mistakes`: 2–4 bullets, 60–180 words in total. Each bullet names the mistake, what happens at runtime (the exception, the wrong result, the request that hangs) and the fix.
4. `## In practice`: how teams use it, what to choose and when.
5. Optional `## Status as of <YYYY-MM-DD>` (the date the facts were checked): dated facts that will age, such as versions, support dates, licence changes and .NET 11 releases (use the newest release on the .NET support page). Every dated fact goes here or carries its date inline.
6. `## Check yourself`: 2–4 open questions for self-review. The quiz covers the graded part.

Project lessons (`kind: project`) open like a theory lesson, with the `# Title`, the title paragraph and a `You need:` line naming the lessons the project builds on. They then use exactly these headings, in this order: the six below, then `## Check yourself` (no `## Common mistakes`, no `## In practice`):
- `## Goal`
- `## Features`
- `## Acceptance criteria`, which must be checkable: commands such as `dotnet test`, HTTP requests with the expected status codes, observable behavior.
- `## Suggested steps`
- `## Stretch goals`
- `## Where to get help`, linking the lessons and official docs it builds on.

## Facts and sources

- Every version, date, default value, licence and support statement must match an official source (learn.microsoft.com, the dotnet GitHub repositories, the vendor's own page) or the research documents of this folder, which cite their sources. Do not state benchmark numbers without a source.
- Licence changes are stated with the boundaries the research could verify: MassTransit v9 is commercial (v8 and earlier stay open source); AutoMapper v15.0 and MediatR v13.0 ship under RPL-1.5 plus a commercial licence (2025-07-02 announcement; later majors assumed the same, not verified); Fluent Assertions 8.x needs a paid licence for commercial use (2025-01-13 announcement; the 8.0 boundary is inferred). Do not present any of them as a recommendation: mention the licence, explain the alternative, and leave the choice to the team.
- `System.Data.SqlClient` and .NET Upgrade Assistant are deprecated, and are named so whenever they come up. The EF Core in-memory provider is not deprecated: Microsoft highly discourages it as a test fake and supports it only for legacy applications, so say exactly that.
- Facts the research documents do not cover (RFC numbers, OWASP lists, AWS or Kubernetes options, central package management) must come from the owner's page (IETF, OWASP, AWS, kubernetes.io, learn.microsoft.com), opened by the author.

## Resources (`meta.json` `resources`)

- 2–6 links. At least one is official Microsoft documentation (`learn.microsoft.com`); the others are official or vendor documentation (dotnet GitHub repositories, the library's own docs, IETF, OWASP, AWS, kubernetes.io). Use the exact page for the topic, not a landing page. No course platforms or paid training.
- No link to a page you did not open.

## Quiz rules (`quiz.json`)

- 5–6 questions per lesson (the CONTENT_GUIDE range for theory-only lessons is 4–6; this track asks for at least 5), 4 options each, one correct `answer` (0-based), and an `explanation` that says why the answer is right **and** why the most tempting wrong option is wrong.
- Test understanding and decisions, not trivia: what happens at runtime, which lifetime or API to choose, which bug a snippet has. A theory lesson includes at least one question on a mistake named in `## Common mistakes`; a project lesson, which has no such section, includes at least one question on an item of `## Acceptance criteria`.
- Distractors must be plausible misconceptions, never jokes. Do not let option length or position give the answer away, and spread correct answers across positions.
- Inline code in options uses backticks.

## concepts.json

4–8 entries of `{ "term", "description" }`. Each description is one sentence, ending with a period.

## Review checklist (cross-review per module)

- Resources open and match the topic; only official or vendor documentation is linked.

- Technical accuracy against .NET 10 / C# 14 and the cited sources. Snippets compile, APIs exist, defaults are right.
- `## Common mistakes` names real mistakes with their runtime effect and fix; nothing in the lesson assumes another language.
- Quiz: one defensible answer, plausible distractors, explanations that teach.
- Dated facts are dated. Lessons in the same module do not repeat each other.
- `npx vitest run src/verify/csharp.test.ts src/verify/content.test.ts` passes.

## What the suite enforces

`src/verify/csharp.test.ts` checks the template above: the headings and their order, a `You need:` line before the first `##` section, no `## Coming from` heading, a concept section before `## Common mistakes` and its 60–180 words in 2–4 bullets, the word limits, `## Check yourself` with 2–4 items, the `## Status as of` date format, a `csharp` fence in theory lessons, the resource hosts, the PHP/Magento names of "No bridges" in every lesson file and in the track and module titles and descriptions, and an `await` before every `Assert.ThrowsAsync` in `tests.cs`. The rest is checked in review: what the `You need:` line names, that snippets compile, the quiz question on a common mistake or an acceptance criterion, and the facts. Lessons written before this template are listed in `src/verify/csharpPendingRewrite.ts` with the rules they still break, and `track.json` and `module.json` texts that still name PHP or Magento in its `CSHARP_PENDING_HEADERS`. The rewrite of a lesson removes its entry in the same change, and an entry whose lesson no longer breaks a listed rule fails the suite, so the list only shrinks.
