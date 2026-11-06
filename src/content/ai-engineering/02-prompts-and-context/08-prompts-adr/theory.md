# Checkpoint: the Prompt and Context ADR

This module covered layer 2 from the inside: how a prompt is built, how its output becomes data, which examples it shows, what context fits the budget, how prompts are released, and how caching and batching change the bill. The checkpoint turns that into the second entry of your portfolio: an **Architecture Decision Record** for the context layer of a concrete feature, plus a **prompt plan** a teammate can implement and a reviewer can check against the facts.

A context ADR is rarely "we wrote a good prompt". It is a set of measurable decisions: how the output is constrained and validated, how many attempts the latency allows, which examples and how many, what goes into the context and in which order, what is cached, what runs in batch, and how a prompt change reaches production.

## The decision checklist

1. **Output contract.** Who consumes the output? Code needs a schema: constrained decoding where the provider supports it, local validation always, and a bounded re-ask loop. Pick the attempt limit from two numbers: the validity reached after *n* attempts and *n* × the per-call latency.
2. **Examples.** Measure zero-shot, static and selected examples on your eval set. Choose the cheapest strategy that meets the target, keep the count inside the range you measured, and give examples a token budget.
3. **Context budget.** Window minus output reserve is the input budget. Cap each source (documents, attachments, history) where your evals show quality still holds; context rot means the cap is often far below the window.
4. **Layout and caching.** List the prompt parts, mark which are identical for every request, put those first and end the cached prefix after the last of them. Anything per request goes after it, the user's input last.
5. **Processing mode.** Interactive for anything a person waits for; batch for backfills, evals and nightly jobs, especially when the discount decides whether the budget holds.
6. **Release.** A named, versioned prompt; tests that gate promotion; staging before production; rollback without a deploy.

| Option | Buys | Costs |
| --- | --- | --- |
| More attempts | higher validity | latency per failure, cost |
| Dynamic examples | accuracy on varied inputs | a labeled pool to maintain, varying prompt tail |
| Bigger context | coverage | cost, latency, context rot |
| Batch processing | about half the price, separate limits | hours of delay, job orchestration |
| Managed prompt releases | safe changes, fast rollback | slower urgent fixes |

## Writing the ADR well

- **Context** restates the forces with their numbers: volume, latency budget, validity and accuracy targets, sizes, budgets.
- **Decision** is one "We will..." sentence covering output, examples, context, caching, processing and release.
- **Alternatives** are the proposals you will hear again ("just send the whole report", "retry three times", "parse free text"), each with the number that rules it out.
- **Consequences** include the costs you accept: a human queue for the residual failures, an example pool that needs curation, slower prompt changes.

## Example: update summarizer

```ts
export const promptPlan = {
  promptVersion: 'release-notes@2.1.0',
  environments: ['staging', 'production'],
  output: { mode: 'text', validateLocally: false, maxAttempts: 1 },
  examples: { strategy: 'static', count: 2, maxTokens: 600 },
  layout: ['instructions', 'style-guide', 'examples', 'merged-pull-requests'],
  cacheBreakpointAfter: 'examples',
  processing: { live: 'batch', backfill: 'batch' },
};
```

Here a human reads the output, so free text is acceptable; static examples are part of the cached prefix; and since summaries are generated nightly, even the "live" path runs in batch. Different facts, different plan: the ADR's job is to make that reasoning visible.

## Pitfalls

- An attempt limit chosen without adding up the latency.
- Example strategies chosen by intuition instead of the pilot numbers.
- Input budgets equal to the whole context window, with no output reserve.
- A cache breakpoint after a varying part, so the cache never hits.
- Batch processing for anything a user waits for, or interactive pricing for a backfill that blows the budget.
- Only positive consequences.

Record the provider features your plan relies on (schema-constrained output, caching, batch discounts and their limits) in the ADR, so a provider change triggers a review.

## When to choose it

Write a context ADR when a feature's prompt first goes to production, when its output gains a programmatic consumer, and when volume, latency budget, context sources or provider features change. Revisit it when evals show the example strategy or the context caps no longer hold, and supersede the record instead of editing it.
