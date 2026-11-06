# Benchmarks and Their Limits

Every model launch comes with a table of benchmark scores, and every week a leaderboard has a new leader. Benchmarks are useful, but they answer a different question from the one you have. They tell you how models compare on someone else's fixed test; you need to know how a model performs on *your* task, with *your* inputs, at *your* cost and latency.

## What a benchmark is

A benchmark is a fixed dataset plus a scoring rule. Families you will see in launch tables:

| Measures | Examples of the format |
| --- | --- |
| Knowledge and reading | multiple-choice exams across many subjects |
| Expert reasoning | graduate-level science questions written to resist web search |
| Math | grade-school word problems up to competition problems |
| Code | write a function that passes hidden tests; fix a real repository issue so its tests pass |
| Agents and tools | multi-step tasks in a simulated shop, terminal or browser |
| Long context | find or combine facts hidden in very long inputs |

Benchmarks are good for coarse questions: is this model in the same league as that one, did this family improve on code, which capability is new. They are poor at fine ones: is model A better than model B *for us*.

## Contamination

Benchmarks are published on the internet, and models are trained on the internet. When test questions (or their answers) leak into training data, the model can **memorize** instead of solving, and scores inflate. Signs of contamination: a model scores much higher on the original questions than on freshly written ones of the same difficulty, or reproduces the exact answer format of the test set. Countermeasures include held-out private test sets, benchmarks refreshed with new questions after a model's training cutoff, and canary strings that let labs filter test data out.

## Saturation

When the best models score near the ceiling, a benchmark stops separating them. Differences of a point or two are within noise, and part of the remaining errors are often mislabeled questions. A saturated benchmark still appears in launch tables because it looks good; it no longer tells you much. The field responds by building harder tests, which saturate in turn, often within a year or two.

## Leaderboard gaming

When a number decides reputation, it gets optimized (Goodhart's law: a measure that becomes a target stops being a good measure). Common forms:

- reporting the best of many runs, prompts or private model variants;
- custom prompting or tool setups that differ from what you get through the API;
- training on data shaped like the benchmark's format;
- comparing against competitors' older versions or weaker settings.

None of this needs bad faith; selection effects are enough. Read the footnotes: number of attempts, prompt setup, which model snapshot, who ran the evaluation.

## Arena-style rankings

Arena leaderboards show two anonymous answers to a user's prompt and ask which is better; thousands of votes produce a rating (Elo or Bradley-Terry style). They capture real prompts and human preference, which static tests miss. They also inherit the biases of preference: longer, more confident, nicely formatted answers win votes even when they are less correct, and the prompts reflect the arena's users, not your customers. Some arenas now offer style-controlled rankings to reduce this. Treat an arena rank as "people like chatting with it", not "it solves my task".

## Why your own evals win

A product eval is a benchmark built from **your** reality: 50 to 200 real, representative inputs with the expected outcome, scored the way your product needs (valid JSON, correct category, cites the right document), and run against every candidate with your prompts, your context and your latency and cost measured on the same run. It cannot be contaminated by public training data, it does not saturate until your product does, and nobody else optimizes for it. Module 10 builds this properly; the model ADR at the end of this module already asks for measured numbers instead of leaderboard ranks.

## Pitfalls

- Choosing a model by its rank on a general leaderboard.
- Comparing scores measured with different prompts, attempts or snapshots.
- Treating a one-point difference on a saturated benchmark as meaningful.
- Trusting an arena rank for a task where correctness matters more than style.

Benchmarks saturate: once frontier models score near the ceiling a test stops separating them, and newer tests replace it. Public leaderboards can also be gamed through private testing and selective disclosure. Prefer your own task-specific eval over any public score.

## When to choose it

Use public benchmarks and arenas to build a shortlist of two to four candidates for a capability (code, long context, tool use, a language you need). Then decide with your own eval set, measuring quality, cost and latency together. Re-run that eval when a new model or snapshot appears instead of reacting to leaderboard news, and keep the eval in CI so a model swap is a measured change, not a bet.
