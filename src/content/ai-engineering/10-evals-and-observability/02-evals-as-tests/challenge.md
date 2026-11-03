Build a small eval runner: three scorers and a runner that turns a golden dataset into a per-case and aggregate report, without crashing on model or scorer failures.

A case is `{ id, input, expected? }`. A scorer is `{ name, score(output, evalCase) }` returning (or resolving to) `{ pass, score, detail }`, where `score` is a number from 0 to 1 and `detail` is a non-empty explanation whenever `pass` is `false`.

## 1. `normalizeAnswer(text)` and `exactScorer()`

`normalizeAnswer` lowercases the text, removes whitespace and the characters `.` `,` `!` `?` `"` `'` at both ends, and collapses every run of inner whitespace into one space.

`exactScorer()` returns a scorer named `'exact'`: it passes (`score: 1`) when the normalized output equals the normalized `String(expected)`, and fails (`score: 0`) otherwise. It throws when the case has no `expected` value.

## 2. `schemaScorer(schema)`

Returns a scorer named `'schema'` for a Zod schema. It parses the trimmed output with `JSON.parse` (no repair: score what the model returned) and validates it with `schema.safeParse`. It passes with `score: 1` when both succeed; otherwise it fails with `score: 0` and a `detail` that explains the JSON error or lists the schema issues with their paths (for example `category: Invalid option`).

## 3. `semanticScorer({ threshold })`

Returns a scorer named `'semantic'`: `score` is `cosineSimilarity(embed(output), embed(String(expected)))` (both from `@dojo/ai`), and `pass` is `score >= threshold`. It throws when the case has no `expected` value.

## 4. `runEval({ model, dataset, prompt, scorers })`

Run the cases **one at a time, in dataset order**: call `model.generate(prompt(evalCase))` and score the response text with every scorer. Return `{ cases, summary }`.

Each entry of `cases` is `{ id, output, error, scores, pass }`:

- success: `output` is the response text, `error` is `null`, `scores` maps each scorer name to its result, and `pass` is `true` when every score passed;
- the model call throws: `output` is `null`, `error` is the error message, `scores` is `{}` and `pass` is `false`; the run continues with the next case;
- a scorer throws or rejects: that scorer's result is `{ pass: false, score: 0, detail }` with the error message in `detail`; the other scorers still run.

`summary` is `{ total, passed, failed, errored, passRate, byScorer }`: `failed` is `total - passed` (errored cases included), `errored` counts cases whose model call failed, and `passRate` is `passed / total`. `byScorer[name]` is `{ passed, total, passRate, meanScore }` over **all** cases: an errored case counts as a failed score of 0.

The tests script exact labels, malformed JSON in every shape, paraphrases, rate limits, context-length errors and broken scorers across seeds; they check results and counts, never your wording beyond the error messages you pass through.
