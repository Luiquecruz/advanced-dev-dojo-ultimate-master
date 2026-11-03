# Checkpoint: the Evaluation ADR

This module turned "it looked good in the demo" into engineering: eval suites with code-based scorers, calibrated judges, regression gates that respect noise, trajectory checks for agents, traces with standard attributes, and the production loop of feedback, drift and review. The checkpoint records how one feature will be evaluated, as an **Architecture Decision Record** for layer 5 plus an **eval plan** that CI can run and an on-call engineer can trust.

An evaluation ADR is a set of budgets and thresholds, each justified by a measurement: how noisy the suite is, how far quality may drop, how much a pull request may spend, how many traces people can actually review.

## The decision checklist

1. **What must never break?** Turn product rules into critical cases: the refund limit, the deletion that needs a human, the safety refusal. They block on any regression, whatever the average does.
2. **Which scorers decide what?** Code first (exact, regex, schema, trajectory rules), embeddings for reference answers, a judge only for qualities code cannot check. Every scorer names what it verifies.
3. **Can the judge be trusted?** Kappa against your own human labels, a different model family than the generator, both orders for pairwise comparisons, recalibration when the rubric or the judge changes.
4. **How noisy is the suite?** Measure A/A runs. Repeats and the tolerance follow from that number, and the tolerance must stay below the drop the product accepts.
5. **What does a run cost?** Cases × repeats × (generation + judge). Fit the pull request run to the CI budget; run the full suite on a schedule.
6. **What do traces contain?** Standard GenAI attributes, no prompt content unless storage and access allow it.
7. **How does production feed back?** A random sample for unbiased rates, triggered samples for failures, all within reviewer capacity, plus alerts for drift.

| Option | Buys | Costs |
| --- | --- | --- |
| Code-based scorers only | cheap, exact, deterministic | blind to tone, helpfulness, faithfulness |
| Uncalibrated judge | quick coverage of open qualities | unknown bias, false confidence |
| Calibrated judge from another family | trustworthy open-quality scores | labeling effort, a second provider |
| One run per case | lowest cost | gate reacts to noise |
| Repeats plus measured tolerance | stable decisions, flaky cases visible | cost multiplied by repeats |
| Full content on spans | easy debugging | personal data in telemetry |

## Writing the ADR well

- **Context** carries the numbers: noise floor, accepted drop, CI budget, volume, review capacity, privacy constraints, past incidents. Someone should be able to recompute your thresholds from it.
- **Decision** is one "We will" sentence naming the gate, the scorers, the judge and the production loop.
- **Alternatives** are the shortcuts someone will propose later: the most accurate judge from the generator's family, one run per case, logging every prompt, thumbs-down rates as the quality metric. Each is rejected with the fact that rules it out.
- **Consequences** include what the gate will *not* catch (drops below the tolerance, qualities without a scorer) and what it costs to maintain (labels, recalibration, a second provider).

## Example: an internal policy assistant

```ts
export const evalPlan = {
  dataset: { cases: 150, criticalCases: ['parental-leave-days', 'no-legal-advice'] },
  scorers: [
    { name: 'citation', kind: 'regex', checks: 'Every answer cites a policy section id.' },
    { name: 'faithfulness', kind: 'judge', checks: 'Every claim is supported by the cited section.' },
  ],
  judge: { model: 'other-family-judge-2026-06-01', minKappa: 0.7, pairwiseBothOrders: true },
  gate: { pullRequestCases: 150, repeats: 3, tolerance: 0.04, blockOnCriticalRegression: true, projectedCostUsd: 2.7 },
  tracing: { conventions: 'opentelemetry-genai', captureContent: false },
};
```

The tolerance of 4 points sits above the 3 points measured between A/A runs; 150 cases × 3 runs × $0.006 fits the budget; content stays off because questions mention health and family situations.

## Pitfalls

- A tolerance picked by feel instead of from A/A runs and the product rule.
- The judge with the highest kappa, from the same family as the generator.
- Critical scenarios that exist in the briefing but not in the dataset.
- Review sampling larger than the review capacity, or only triggered samples.
- No scheduled run, so provider-side changes wait for a deploy to be noticed.

> **Status as of October 2026:** eval runners (promptfoo, DeepEval, Inspect AI) and platforms (Braintrust, LangSmith, Langfuse, Arize Phoenix) can implement every part of this plan; the GenAI semantic conventions for traces are still in Development status, so pin the instrumentation version you depend on.

## When to choose it

Write the evaluation ADR before the first prompt change after launch, when a feature gains an agent or a new tool, and whenever the inputs to its thresholds move: a new noise measurement, a different budget, more reviewers, a new data rule. Supersede it instead of editing it, so the history of how quality was measured stays readable next to the history of what was shipped.
