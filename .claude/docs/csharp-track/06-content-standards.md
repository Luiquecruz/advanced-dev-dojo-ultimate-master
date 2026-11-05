# C# Track — Content Standards

The rules every lesson of `src/content/csharp` follows. The general format is in [CONTENT_GUIDE.md](../CONTENT_GUIDE.md). This file only adds what is specific to this track.

## Lesson folder

```
src/content/csharp/<NN-module>/<NN-lesson>/
├── meta.json       title, summary, level, tags, resources (write it last)
├── theory.md       the lesson
├── concepts.json   4–8 key terms with one-sentence descriptions
└── quiz.json       5–6 questions
```

- **No `challenge.md`, `starter`, `solution`, `tests`, `hints.md` or `approach.md`.** There is no C# engine, and `src/verify/csharp.test.ts` fails if any challenge file appears.
- Lesson ids are unique in the track and listed in [05-curriculum.md](05-curriculum.md). Folder prefixes set the order.
- `meta.json` `level`: `beginner` | `intermediate` | `advanced`. `tags` hold three entries: status (`recommended`, `established`, `legacy` or `context`, matching classes 1–4 of [02-ecosystem-and-legacy.md](02-ecosystem-and-legacy.md)), tier (`core`, `deepening` or `legacy`) and kind (`theory` or `project`).

## Theory template (`theory.md`)

At least 3,500 characters for a theory lesson and 2,500 for a project lesson; most lessons land around 5,000–9,000. Headings in this order:

1. `# <title>`: one paragraph on what the learner will be able to do after the lesson.
2. `## Coming from PHP/Magento`: what transfers, and the trap. This must be concrete (`di.xml` versus `IServiceCollection`, PHP-FPM versus a long-running host, `db_schema.xml` versus migrations, `crontab.xml` versus `BackgroundService`). When nothing in PHP is close, say so.
3. Concept sections (`##`), each with a short C# snippet in a ```` ```csharp ```` block. Snippets must compile on .NET 10 / C# 14 as written; mark partial snippets with `// ...`. Prefer real ASP.NET Core and EF Core APIs over toy code.
4. `## In practice`: how teams use it, what to choose and when, and the usual mistakes.
5. Optional `## Status as of 2026-11-05`: dated facts that will age, such as versions, support dates, licence changes and .NET 11 previews. Every dated fact goes here or carries its date inline.
6. `## Check yourself`: 2–4 open questions for self-review. The quiz covers the graded part.

Project lessons (`kind: project`) replace the concept sections with these headings:
- `## Goal`
- `## Features`
- `## Acceptance criteria`, which must be checkable: commands such as `dotnet test`, HTTP requests with the expected status codes, observable behavior.
- `## Suggested steps`
- `## Stretch goals`
- `## Where to get help`, linking the lessons and courses it builds on.

## Facts and sources

- Every version, date, default value, licence and support statement must match an official source (learn.microsoft.com, the dotnet GitHub repositories, the vendor's own page) or the research documents of this folder, which cite their sources. Do not state benchmark numbers without a source.
- Licence changes are stated as facts with dates (MassTransit v9, MediatR v13+ and AutoMapper v15+, Fluent Assertions v8+). Do not present any library as a recommendation when its licence changed. Mention it, explain the alternative, and leave the choice to the team.
- Deprecated APIs (`System.Data.SqlClient`, the EF Core in-memory provider as a test fake, .NET Upgrade Assistant) are named as deprecated whenever they come up.

## Resources (`meta.json` `resources`)

- 2–6 links. At least one is official Microsoft documentation (`learn.microsoft.com`). Use the exact page for the topic, not a landing page.
- A balta.io course is added when [03-balta-catalog.md](03-balta-catalog.md) maps it to the lesson's competency. Use the exact `https://balta.io/courses/<slug>` or `https://balta.io/paths/<slug>` URL from that document, and put the caveat in the label when the course targets an older version, for example `"balta.io: Fundamentos do Entity Framework (EF Core 5; concepts still apply)"`. Never invent a course or a slug.
- No link to a page you did not open.

## Quiz rules (`quiz.json`)

- 5–6 questions per lesson (the CONTENT_GUIDE range for theory-only lessons is 4–6; this track asks for at least 5), 4 options each, one correct `answer` (0-based), and an `explanation` that says why the answer is right **and** why the most tempting wrong option is wrong.
- Test understanding and decisions, not trivia: what happens at runtime, which lifetime or API to choose, which bug a snippet has. Include at least one question on the PHP/Magento trap of the lesson.
- Distractors must be plausible misconceptions, never jokes. Do not let option length or position give the answer away, and spread correct answers across positions.
- Inline code in options uses backticks.

## concepts.json

4–8 entries of `{ "term", "description" }`. Each description is one sentence, ending with a period.

## Review checklist (cross-review per module)

- Technical accuracy against .NET 10 / C# 14 and the cited sources. Snippets compile, APIs exist, defaults are right.
- The PHP/Magento section is concrete and correct.
- Quiz: one defensible answer, plausible distractors, explanations that teach.
- Resources open and match the topic. balta.io slugs come from 03-balta-catalog.md, with version caveats.
- Dated facts are dated. Lessons in the same module do not repeat each other.
- `npx vitest run src/verify/csharp.test.ts src/verify/content.test.ts` passes.
