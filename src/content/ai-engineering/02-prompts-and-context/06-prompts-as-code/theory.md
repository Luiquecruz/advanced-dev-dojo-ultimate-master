# Prompts as Code

A prompt is production logic. Changing one word can move accuracy by several points, break a JSON format a downstream service depends on, or double the output length and the bill. Yet in many codebases prompts are string literals edited in place, with no review, no tests and no way to say which wording produced yesterday's bad answer. Treat prompts like code: versioned, reviewed, tested, released deliberately and reversible.

## What a prompt registry gives you

A **prompt registry** is the single place prompts live, by name and version:

| Practice | Why |
| --- | --- |
| **Templates with named variables** | the wording is fixed in review; only declared slots change per request |
| **Immutable versions** | `triage@1.2.0` means the same text forever, so traces and evals stay comparable |
| **Strict rendering** | a missing or misspelled variable is an error, not a prompt that says `{{ticket}}` to the model |
| **Tests per prompt** | each version carries checks that run before it can go live |
| **Active version per environment** | staging can run `1.3.0` while production stays on `1.2.0` |
| **Promotion and rollback** | going live is an explicit, gated step; reverting is one call, without a deploy |
| **Version in every trace** | logs show which prompt version produced each answer (module 10) |

```ts
registry.register({ name: 'triage', version: '1.3.0', template, tests });
await registry.promote('triage', '1.3.0', 'staging', model);
const { messages, version } = registry.render('triage', { product, ticket });
log({ prompt: `triage@${version}` });
```

## Rendering safely

Templates use placeholders such as `{{ ticket }}`. Rendering rules that prevent real incidents:

- **All declared variables are required** and unknown variables are rejected: a typo (`tiket`) fails in the first test run instead of shipping a prompt with an empty slot.
- **Substitute in one pass.** A value that contains `{{product}}` (users type anything) must stay literal text, never be expanded a second time.
- **Keep data in the user message**, delimited (lesson 02). The system template should contain only standing instructions, so it remains a stable, cacheable prefix.
- Prefer a minimal template language. Loops and conditionals inside prompts quickly become untested code in a second language; build variations in TypeScript and keep templates flat.

## Tests per prompt

A prompt test renders the prompt with fixed variables, calls a model and checks a **property** of the output: the label is in the allowed set, the JSON validates, the reply cites a source, the double-charge ticket is classified as billing. These are small evals (module 10 builds full eval suites with datasets, scorers and regression gates). Rules of thumb:

- Every version must have tests before it can be promoted; "no tests" is a failed gate, not a pass.
- Check properties, never exact wording: models rephrase, and a test on wording fails for the wrong reasons.
- Treat a refusal, a truncated reply or a model error during the test run as a failure.
- Run the same tests against the fallback model of module 01; prompts are not perfectly portable.

## Releasing prompts

Prompt changes deserve the release discipline of code changes, sometimes more, because their effect is statistical:

1. **Review** the diff of the template, like any pull request.
2. **Test** the new version; promote it to **staging** only if the tests pass.
3. **Roll out** gradually in production behind a feature flag or a percentage split, comparing metrics with the previous version.
4. **Roll back** by reactivating the previous version when metrics drop. Because versions are immutable, the previous version is exactly what ran before.

Where prompts are stored is a trade-off. In the repository (files next to code) they get code review, CI and atomic releases with the code that parses their output. In a prompt management service they can be edited and rolled back without a deploy, by people who do not write code, at the risk of a prompt change breaking code that expects the old output format. Many teams keep templates in the repository and use the registry only for activation and rollback.

**Prompt optimization** takes this further: frameworks such as DSPy treat the prompt as a compiled artifact, searching instructions and examples against a metric on a dataset. That only works when you already have what this lesson builds: versions, tests and metrics.

## Pitfalls

- Editing a version in place, so two traces with the same version saw different prompts.
- Silent fallbacks for missing variables (empty strings, `undefined` in the prompt).
- Promoting without tests, or with tests on exact wording.
- One active version for all environments, so testing means changing production.
- Changing the output format in a prompt without versioning the code that parses it.

Prompt management tools offer versions, labels per environment and rollback, and test runners can execute prompt suites in CI. Prompt optimization frameworks search for better prompts against a metric. Whichever you adopt, the rule stays the same: version the prompt together with the code that parses its output.

## When to choose it

Move a prompt into a registry with versions and tests as soon as it serves real users or more than one person edits it; a throwaway script can keep a literal. Add per-environment activation and rollback when prompt changes ship more often than code deploys, or when non-developers tune prompts. Store templates in the repository when the output format is tightly coupled to parsing code; use a managed service when fast iteration by domain experts matters more, and keep the tests as the gate either way.
