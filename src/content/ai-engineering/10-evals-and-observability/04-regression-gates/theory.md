# Regression Gates

An eval report tells you how good one version is. A **regression gate** answers the question a pull request actually asks: *is the candidate worse than what runs today?* It runs the baseline and the candidate on the same dataset, compares them case by case, and blocks the merge when the candidate regresses beyond what noise can explain. It is the CI step that turns evals from a dashboard into a guardrail.

## What changes deserve a gate

Anything that can change model behavior without changing your code's types:

- a prompt edit (Prompts as Code: every version gets tested before promotion);
- a new model snapshot, a cheaper tier, a fallback provider (Retries, Routing and Fallbacks);
- a tool description, a retrieval setting, a chunk size, a reranker;
- an SDK or framework upgrade that changes defaults.

## Same dataset, same settings

A comparison is only meaningful when everything except the change is equal: the same cases (same ids), the same scorers, the same temperature and token limits, the same judge snapshot. A gate that compares a candidate run on 120 cases with a baseline from last month on 100 cases measures the dataset change, not the prompt change. Refuse to compare runs whose case ids differ, and store each run's settings with its results.

## Noise: why one run is not enough

Run the same prompt twice on the same dataset and the pass rate moves. With 100 cases and a true pass rate of 90%, the **standard error** is about `√(0.9 × 0.1 / 100) ≈ 3` points, so a 2-point drop is well within noise. Three tools keep a gate honest:

1. **Repeat each case.** Running every case `k` times and using the pass rate per case turns a coin flip into a measurement, and reveals **flaky cases** that pass sometimes. A case at 2 out of 5 is a finding in itself: users hit both outcomes.
2. **Measure the noise floor.** Run the baseline against itself (an A/A comparison) a few times. The tolerance must be larger than the drops you see there, or the gate blocks random pull requests and people learn to ignore it.
3. **Grow the dataset.** Error shrinks with the square root of the number of runs: four times the cases halves the noise.

Temperature 0 reduces variation but does not remove it: providers do not guarantee determinism, and repeated runs at the production temperature are what users experience.

## Gate rules that work

```ts
const gate = compareRuns(baseline, candidate, { tolerance: 0.03, caseTolerance: 0.34 });
if (gate.decision === 'block') fail(gate.reasons);
```

- **Aggregate rule:** block when the candidate's pass rate is more than `tolerance` below the baseline's.
- **Critical cases:** some cases must never get worse (a refund rule, a safety refusal, the largest customer's workflow). Mark them and block on any regression beyond the per-case noise, *even when the average improves*. Averages hide trade-offs.
- **Per-case diff in the report:** list regressions and improvements, worst first. A reviewer reads "fixed 6 cases, broke `double-charge`" in seconds; a single delta says nothing.
- **Slices:** for larger suites, apply the aggregate rule per tag (language, category, customer tier), so a drop in one slice is not averaged away.

A gate can also **pass with warnings**: regressions on non-critical cases within tolerance appear in the report without blocking, and reviewers decide.

## Running it in CI

- Run a **small, fast subset** (critical cases plus a sample) on every pull request that touches prompts, models or retrieval, and the **full suite** on merge or nightly.
- Store the baseline run as an artifact of the main branch; refresh it when a change merges, not by re-running the old version on every pull request (cheaper, and the baseline stays fixed).
- Count the cost: cases × repeats × (model call + judge call). Cache identical requests during development, never in the gate itself.
- Errors are failed runs, not skipped ones. A candidate that hits rate limits more often is worse for users too.

## Pitfalls

- One run per version and a gate that reacts to noise.
- A tolerance chosen without measuring the noise floor, so the gate is either always red or never red.
- Comparing runs on different datasets or settings.
- Only an average: a critical case breaks while the mean rises.
- Updating the baseline to the candidate's numbers to make the gate pass.

> **Status as of October 2026:** promptfoo, Braintrust, LangSmith, Langfuse and DeepEval can run eval suites in CI (GitHub Actions, GitLab CI) and compare experiments against a baseline. Anthropic's "Adding Error Bars to Evals" (2024) popularized reporting standard errors and paired comparisons for model evals.

## When to choose it

Add a gate as soon as a feature has an eval suite and more than one person changes its prompts, models or retrieval. Start with an aggregate rule plus a handful of critical cases and three repeats; measure the noise floor before fixing the tolerance. Skip repeats only when outputs are effectively deterministic (exact extraction at temperature 0 with stable results across A/A runs), and keep the full suite out of the pull request path when it costs more than the change is worth: run it nightly and gate the release instead.
