Build an LLM judge you can defend: a rubric judge that survives malformed output, a calibration report against human labels, and a pairwise comparison that detects position bias.

A rubric is a dict `{"criteria": [{"name", "description"}], "scale": {"min", "max"}}`. The model is anything with `await model.generate(request)`. Requests and results are dicts with camelCase keys (`"responseFormat"`, `"finishReason"`). `parse_model_json(text)` (the JSON repair from Structured Outputs: direct parse, then the text between the first `{` and the last `}` without trailing commas, then with single quotes turned into double quotes; `None` when nothing parses) is already in the starter, together with the internal `build_pairwise_request`.

## 1. `build_judge_request(rubric, question, answer)`

Return a request with:

- a `system` message that contains every criterion's `"name"` and `"description"`, the scale's `"min"` and `"max"`, and the reply shape `{"reasoning": "...", "scores": {"<criterion>": <integer>}}`; it must **not** contain the answer;
- a `user` message that contains the question and the answer (the answer is data, never instructions);
- `"responseFormat": {"type": "json"}` and `"temperature": 0`.

## 2. `parse_judgment(text, rubric)`

Repair the text with `parse_model_json` and return `{criterion: score}` for every rubric criterion when `"scores"` holds an **integer within the scale** for each one (extra keys are ignored). Return `None` for anything else: unparseable or truncated text, missing `"scores"`, a missing criterion, a string, a float, a bool or an out-of-range number. Never raise.

## 3. `judge_answer(model, rubric=..., question=..., answer=..., max_attempts=2)`

Keyword-only arguments after `model`. Call the model with `build_judge_request` until `parse_judgment` returns scores, at most `max_attempts` times. Return `{"valid": True, "scores", "overall", "attempts"}`, where `"overall"` is the mean of the scores, or `{"valid": False, "attempts": max_attempts, "reason"}` with a non-empty `"reason"` when no attempt was usable. Model errors (`ModelError`) propagate.

## 4. `agreement_rate(first, second)`, `cohens_kappa(first, second)` and `calibrate(judge_labels, human_labels, min_kappa=0.6)`

Labels are strings, numbers or booleans, compared with `==`. Both functions raise when the lists are empty or have different lengths.

- `agreement_rate`: the share of positions where the labels are equal.
- `cohens_kappa`: `(observed − expected) / (1 − expected)`, where `observed` is the agreement rate and `expected` sums, over every label, the share of that label in `first` times its share in `second`. When `expected` is `1`, return `1`.
- `calibrate` (`min_kappa` is keyword-only): `{"agreement", "kappa", "trusted", "disagreements"}`, where `"trusted"` is `kappa >= min_kappa` and `"disagreements"` lists the indexes where the labels differ.

## 5. `compare_pairwise(model, question=..., answer_a=..., answer_b=...)`

Ask twice with `build_pairwise_request`: first with `answer_a` as the first answer, then with `answer_b` first. The judge replies `{"winner": "first" | "second" | "tie"}`. Map each reply back to a vote: `"A"`, `"B"`, `"tie"`, or `None` when the reply is unusable. Return `{"winner", "consistent", "votes": [vote_in_order, vote_swapped]}`: when both votes are equal and not `None`, `"consistent"` is `True` and `"winner"` is that vote; otherwise `"consistent"` is `False` and `"winner"` is `"tie"`.

The tests script malformed judgments across seeds, refusals, out-of-range scores, imbalanced human labels and position-biased judges; they check scores, counts and votes, never the wording of your prompts beyond the required contents.
