Build an LLM judge you can defend: a rubric judge that survives malformed output, a calibration report against human labels, and a pairwise comparison that detects position bias.

A rubric is `{ criteria: [{ name, description }], scale: { min, max } }`. The model is anything with `generate(request)`. `parseModelJson(text)` (the JSON repair from Structured Outputs: direct parse, then the text between the first `{` and the last `}` without trailing commas, then with single quotes turned into double quotes) is already in the starter, together with the internal `buildPairwiseRequest`.

## 1. `buildJudgeRequest(rubric, question, answer)`

Return a request with:

- a `system` message that contains every criterion's `name` and `description`, the scale's `min` and `max`, and the reply shape `{"reasoning": "...", "scores": {"<criterion>": <integer>}}`; it must **not** contain the answer;
- a `user` message that contains the question and the answer (the answer is data, never instructions);
- `responseFormat: { type: 'json' }` and `temperature: 0`.

## 2. `parseJudgment(text, rubric)`

Repair the text with `parseModelJson` and return `{ [criterion]: score }` for every rubric criterion when `scores` holds an **integer within the scale** for each one (extra keys are ignored). Return `null` for anything else: unparseable or truncated text, missing `scores`, a missing criterion, a string, a fraction or an out-of-range number. Never throw.

## 3. `judgeAnswer(model, { rubric, question, answer, maxAttempts = 2 })`

Call the model with `buildJudgeRequest` until `parseJudgment` returns scores, at most `maxAttempts` times. Return `{ valid: true, scores, overall, attempts }`, where `overall` is the mean of the scores, or `{ valid: false, attempts: maxAttempts, reason }` with a non-empty `reason` when no attempt was usable. Model errors propagate.

## 4. `agreementRate(first, second)`, `cohensKappa(first, second)` and `calibrate(judgeLabels, humanLabels, { minKappa = 0.6 })`

Labels are strings, numbers or booleans, compared with `===`. Both functions throw when the lists are empty or have different lengths.

- `agreementRate`: the share of positions where the labels are equal.
- `cohensKappa`: `(observed − expected) / (1 − expected)`, where `observed` is the agreement rate and `expected` sums, over every label, the share of that label in `first` times its share in `second`. When `expected` is `1`, return `1`.
- `calibrate`: `{ agreement, kappa, trusted, disagreements }`, where `trusted` is `kappa >= minKappa` and `disagreements` lists the indexes where the labels differ.

## 5. `comparePairwise(model, { question, answerA, answerB })`

Ask twice with `buildPairwiseRequest`: first with `answerA` as the first answer, then with `answerB` first. The judge replies `{"winner": "first" | "second" | "tie"}`. Map each reply back to a vote: `'A'`, `'B'`, `'tie'`, or `null` when the reply is unusable. Return `{ winner, consistent, votes: [voteInOrder, voteSwapped] }`: when both votes are equal and not `null`, `consistent` is `true` and `winner` is that vote; otherwise `consistent` is `false` and `winner` is `'tie'`.

The tests script malformed judgments across seeds, refusals, out-of-range scores, imbalanced human labels and position-biased judges; they check scores, counts and votes, never the wording of your prompts beyond the required contents.
