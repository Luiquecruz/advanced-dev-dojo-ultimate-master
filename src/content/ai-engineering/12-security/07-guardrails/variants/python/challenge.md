Build the guardrail pipeline of a billing assistant: PII detection with checksum validation, a model-based input classifier that survives errors and fails closed, length and topic limits, and output checks. Two models are passed in: the `assistant` and the `classifier` (the tests create them with `create_model("assistant")` and `create_model("classifier")`). Results are plain dicts.

## 1. `luhn_valid(digits)` and `cpf_valid(digits)`

Both take a string of digits only (anything else is invalid) and return a bool.

- `luhn_valid`: from the rightmost digit, double every second digit, subtracting 9 when the result is above 9; valid when the sum is a multiple of 10.
- `cpf_valid`: exactly 11 digits, not all equal; the 10th digit is `(sum × 10 mod 11) mod 10` where the sum weights the first 9 digits by 10 down to 2, and the 11th is the same over the first 10 digits with weights 11 down to 2.

## 2. `redact_pii(text)`

Return `{"text", "found"}`, replacing in this order (each pass over the result of the previous one), and appending `{"type", "value"}` for each replacement in the order made:

1. `email` → `[EMAIL]`: `local@domain.tld` (letters, digits and `._%+-` before the `@`, a top-level domain of 2+ letters).
2. `phone` → `[PHONE]`: an optional `+` country code (1–3 digits) followed by an area code (2–3 digits, optionally in parentheses), **or** an area code in parentheses alone; then 3–5 digits and 4 digits. Spaces, dots or dashes may separate the groups. Not preceded by a letter, digit or `+`, not followed by a digit. Numbers without `+` or parentheses are not phones.
3. `card` → `[CARD]`: 13–19 digits, optionally separated by single spaces or dashes, not touching other digits, **and** Luhn-valid.
4. `cpf` → `[CPF]`: 11 digits as `000.000.000-00` (dots and dash optional), not touching other digits, **and** a valid CPF.

Anything that fails validation stays as it is.

## 3. `classify_input(classifier, text, *, attempts=2)`

Call `await classifier.generate(request)` with `CLASSIFIER_PROMPT` (defined in `main.py`) as the system message, `text` as the user message and `"responseFormat": {"type": "json"}`. Return `"safe"` or `"unsafe"` from the reply's `"label"`. A `ModelError`, a `"finishReason"` other than `"stop"`, text that is not JSON, or another label is a failed attempt: try again, up to `attempts` calls in total, then return `"unavailable"`.

## 4. `guarded_answer(question, *, assistant, classifier, max_input_chars=2000, max_output_chars=4000, blocked_topics=(), classifier_attempts=2)`

A topic rule is `{"topic", "keywords"}`. Return `{"status": "answered", "text", "redacted": {"input", "output"}}` (`"input"`/`"output"` list the PII types redacted, without duplicates, in order of first appearance in `"found"`) or `{"status": "blocked", "stage", "reason"}` (plus `"topic"` for a blocked topic):

| Step | Blocked with |
| --- | --- |
| 1. `len(question) > max_input_chars` | `"input"`, `"too_long"` |
| 2. a keyword appears as a whole word (case-insensitive) | `"input"`, `"blocked_topic"`, and the rule's `"topic"` |
| 3. redact PII in the question | |
| 4. classify the **redacted** question | `"unsafe"` → `"input"`, `"unsafe_input"`; `"unavailable"` → `"input"`, `"classifier_unavailable"` |
| 5. call the assistant with `ASSISTANT_PROMPT` (defined in `main.py`) and the redacted question | a `ModelError` → `"output"`, `"model_error"` |
| 6. `"finishReason"` is not `"stop"` | `"output"`, `"incomplete_output"` |
| 7. redact PII in the answer; the redacted text is longer than `max_output_chars` | `"output"`, `"too_long"` |

Steps 1 and 2 call no model; a blocked step stops the pipeline. The tests check that no raw PII ever reaches either model, across seeded classifier failures.
