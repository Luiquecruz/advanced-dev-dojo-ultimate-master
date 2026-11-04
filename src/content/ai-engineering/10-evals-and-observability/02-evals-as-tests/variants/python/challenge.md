Build a small eval runner: three scorers and a runner that turns a golden dataset into a per-case and aggregate report, without crashing on model or scorer failures.

A case is a dict `{"id", "input", "expected"}` (`"expected"` is optional). A scorer is an object with a `name` attribute and a `score(output, eval_case)` method that returns (or, for an `async def`, resolves to) a dict `{"pass", "score", "detail"}`, where `"score"` is a number from 0 to 1 and `"detail"` is a non-empty explanation whenever `"pass"` is `False`. The factories below return instances of the scorer classes already in the starter. Results keep camelCase keys (`"passRate"`, `"byScorer"`, `"meanScore"`).

Python has no Zod in the standard library (in production you would reach for Pydantic or `jsonschema`), so a schema is a plain JSON Schema dict and `validation.py` (already written, read it) checks values against it: `safe_parse(schema, value)` returns `{"success": True, "data": value}` or `{"success": False, "issues": [...]}`, each issue a dict with a `"path"` (a list of keys and indexes) and a `"message"`.

## 1. `normalize_answer(text)` and `exact_scorer()`

`normalize_answer` lowercases the text, removes whitespace and the characters `.` `,` `!` `?` `"` `'` at both ends, and collapses every run of inner whitespace into one space.

`exact_scorer()` returns a scorer named `"exact"`: it passes (`"score": 1`) when the normalized output equals the normalized `str(expected)`, and fails (`"score": 0`) otherwise. It raises when the case has no `"expected"` value.

## 2. `schema_scorer(schema)`

Returns a scorer named `"schema"` for a JSON Schema dict. It parses the stripped output with `json.loads` (no repair: score what the model returned) and validates it with `safe_parse`. It passes with `"score": 1` when both succeed; otherwise it fails with `"score": 0` and a `"detail"` that explains the JSON error or lists the schema issues with their paths (for example `category: Invalid option`).

## 3. `semantic_scorer(threshold=...)`

Returns a scorer named `"semantic"`: `"score"` is `cosine_similarity(embed(output), embed(str(expected)))` (both from `dojo_ai`), and `"pass"` is `score >= threshold`. It raises when the case has no `"expected"` value. `threshold` is a keyword-only argument.

## 4. `run_eval(model=..., dataset=..., prompt=..., scorers=...)`

All four arguments are keyword-only. Run the cases **one at a time, in dataset order**: `await model.generate(prompt(eval_case))` and score the response `"text"` with every scorer (await the result when a scorer is async). Return `{"cases": [...], "summary": {...}}`.

Each entry of `"cases"` is `{"id", "output", "error", "scores", "pass"}`:

- success: `"output"` is the response text, `"error"` is `None`, `"scores"` maps each scorer name to its result, and `"pass"` is `True` when every score passed;
- the model call raises: `"output"` is `None`, `"error"` is the error message, `"scores"` is `{}` and `"pass"` is `False`; the run continues with the next case;
- a scorer raises: that scorer's result is `{"pass": False, "score": 0, "detail": ...}` with the error message in `"detail"`; the other scorers still run.

`"summary"` is `{"total", "passed", "failed", "errored", "passRate", "byScorer"}`: `"failed"` is `total - passed` (errored cases included), `"errored"` counts cases whose model call failed, and `"passRate"` is `passed / total`. `"byScorer"[name]` is `{"passed", "total", "passRate", "meanScore"}` over **all** cases: an errored case counts as a failed score of 0.

The tests script exact labels, malformed JSON in every shape, paraphrases, rate limits, context-length errors and broken scorers across seeds; they check results and counts, never your wording beyond the error messages you pass through.
