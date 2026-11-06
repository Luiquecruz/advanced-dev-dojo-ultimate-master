# Evals as Tests

A unit test asks "does `add(2, 2)` return `4`?" and gets the same answer every run. A model feature cannot be tested that way: the same prompt returns different wording each time, and the interesting failures (a wrong category, a made-up refund policy, a broken JSON once in fifty calls) are statistical. An **eval** is the test suite for that kind of code: a dataset of inputs, a set of scorers that check properties of each output, and a report that says how often the feature behaves.

Without one, teams fall into **vibes-based evaluation**: five playground tries look fine, the change ships, and a customer finds the regression.

## The three parts of an eval

```ts
const report = await runEval({
  model,
  dataset: [{ id: 'vat-number', input: 'My invoice shows the wrong VAT number.', expected: 'billing' }],
  prompt: (evalCase) => ({ messages: [system, { role: 'user', content: evalCase.input }] }),
  scorers: [exactScorer()],
});
```

1. **A golden dataset.** Inputs with the expected answer, or the facts a good answer must contain. Each case has a stable `id`, so reports from different runs can be compared case by case.
2. **Scorers.** Functions `(output, case) → { pass, score, detail }`. The `detail` matters: a failing eval must say *why*, or nobody can fix it.
3. **A report.** Per-case results and an aggregate: pass rate overall and per scorer. Read both; an average that rises can hide the one case your biggest customer hits every day.

## Building the dataset

- **Start small and real.** 30 to 100 cases taken from real usage (support tickets, search logs, bug reports) beat 1 000 synthetic ones. Add the hard cases you already know about: ambiguous inputs, inputs in another language, inputs the feature must refuse.
- **Cover slices.** Tag cases by category, language, customer tier or difficulty, so a report can say "Spanish tickets dropped" instead of "the average dropped 2 points".
- **Grow it from failures.** Every production bug becomes a case before it is fixed, exactly like a regression test.
- **Keep it out of the prompt.** Examples copied from the eval set into few-shot prompts (lesson Choosing Examples) make the eval measure memory, not skill.

## The scorer ladder

Use the cheapest scorer that can decide the property. Code-based scorers are free, fast and deterministic; model-based scorers cost money and need their own validation.

| Scorer | Decides | Example |
| --- | --- | --- |
| **Exact** (after normalization) | labels, ids, short answers | category is `billing` |
| **Regex / contains** | required or forbidden fragments | the reply cites `policy-12`, never says "guaranteed" |
| **Schema** | structure | the JSON matches the Zod schema from Structured Outputs |
| **Semantic** | meaning close to a reference | similarity of embeddings at or above a calibrated threshold |
| **LLM judge** | open qualities | tone, helpfulness, faithfulness to sources (next lesson) |
| **Human review** | ground truth for everything above | labels that calibrate the judge |

**Normalize before comparing.** `"Billing."` and `"billing"` are the same label; `"billing issue"` is not. Normalization should remove noise (case, surrounding whitespace and punctuation), never meaning.

**Score what the user gets.** If production repairs malformed JSON (Structured Outputs), evaluate the whole pipeline, repair included. If you call the raw model, a fenced or truncated JSON is a failure, because that is what your parser would receive.

**Semantic thresholds are calibrated, not guessed.** Embedding similarity rewards shared vocabulary: "We do not offer refunds" shares words with "Refunds reach your card in 5 days" and contradicts it. Pick the threshold by scoring outputs you labeled by hand, and pair semantic scorers with exact or regex checks for the facts that must be right.

## Failures are results, not crashes

An eval run calls the model hundreds of times. Some calls fail: rate limits, timeouts, inputs over the context window. The runner must record those as **failed cases with the error message** and keep going; one `429` must not erase the other 99 results. The same holds for scorers: a judge that times out fails its score, not the run. Report errored cases separately, because "the model was down" and "the model was wrong" call for different fixes.

Run cases with production settings (prompt version, model snapshot, temperature) and record them in the report; a pass rate without them cannot be compared.

## Eval-driven development

Write the eval **before** changing a prompt, model or tool, exactly like a failing test before a fix:

1. Add cases that capture the new requirement or the bug.
2. Run the eval on the current version to get a baseline.
3. Change the prompt or model, run again, compare (lesson Regression Gates turns this into a CI gate).

The "tests per prompt" of Prompts as Code are the small version of this.

## Pitfalls

- Judging a change from a handful of playground tries.
- Scoring exact wording, so every harmless rephrasing fails.
- One average and no per-case results.
- Letting one model error crash the whole run, or silently dropping errored cases from the denominator.
- A dataset written once and never fed with production failures.

Open-source eval runners and observability platforms bundle datasets, scorers and experiment comparison. They all implement the same three parts this lesson builds.

## When to choose it

Build an eval as soon as a model feature has users or a second person changes its prompt. Start with code-based scorers (exact, regex, schema) for everything they can decide; add semantic scorers for reference answers and an LLM judge only for qualities code cannot check. Skip a dataset only for throwaway prototypes, and even then keep the five inputs you tried in the playground: they are the first five cases.
