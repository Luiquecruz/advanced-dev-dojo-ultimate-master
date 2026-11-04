# Guardrails

Lessons 03 to 06 removed whole classes of damage by architecture. **Guardrails** are the other kind of control: checks that inspect what goes into a model and what comes out, and stop or modify it. They are what most people mean by "AI safety features" in a product, and they are useful, as long as nobody mistakes them for the architecture.

## Input rails and output rails

A guardrail pipeline wraps the model call:

```text
question ─► length ─► topic ─► redact PII ─► classifier ─► MODEL ─► complete? ─► redact PII ─► length ─► answer
            (input rails, cheapest first)                           (output rails)
```

| Rail | Catches | Kind |
| --- | --- | --- |
| Length limit | prompt stuffing, cost attacks, context flooding | deterministic |
| Topic limit | requests outside the product's scope (medical advice from a billing bot) | keyword or classifier |
| PII redaction (input) | personal data the model and its logs do not need | pattern + checksum, or NER |
| Injection / jailbreak classifier | known attack phrasing | model-based, probabilistic |
| Completion check | truncated or filtered answers that may cut a redaction in half | deterministic |
| PII redaction (output) | personal data the model repeats or retrieves | pattern + checksum, or NER |
| Output length or format | runaway answers, broken JSON | deterministic |

Order the input rails **cheapest first**: a length check costs nothing, a classifier costs a model call. Rejected requests should never reach the expensive rails, let alone the model.

## PII: patterns plus validation

Regular expressions alone over-match: any 16-digit number looks like a card. Validating the structure removes most false positives:

- **Payment cards** carry a **Luhn** check digit: from the right, double every second digit (subtract 9 when the result exceeds 9) and the sum must be a multiple of 10. `4111 1111 1111 1111` passes; most random 16-digit order numbers do not.
- **CPF** (the Brazilian taxpayer number, personal data under the LGPD) has two check digits computed with weights 10..2 and 11..2 modulo 11. `529.982.247-25` is valid; changing any digit breaks it.
- **Emails and phones** have no checksum, so the pattern must be specific: a phone needs a country code or an area code in parentheses, otherwise every invoice number looks like a phone.

Order matters too: redact emails before anything numeric, and phones before cards, so one pattern does not eat part of another. Production systems add entity recognition (Microsoft Presidio is a common open-source choice) for names and addresses, which patterns cannot catch.

Redact **before** the model sees the text when the task does not need the value: the model, the provider, the traces and any memory all stop holding it. Redact **after** the model as well, because retrieval and tools can bring personal data back.

## Model-based classifiers and failing closed

A classifier model (a small fine-tuned guard model or a general model with a classification prompt) labels the input `safe` or `unsafe`. It is another model call, so it inherits every failure from module 01: errors, timeouts, malformed JSON, refusals, truncation. You must decide what happens when it fails:

- **Fail closed:** treat "could not classify" as "blocked". Safe, but an outage of the classifier becomes an outage of the product.
- **Fail open:** let the request through unchecked. Available, but the attacker only needs to make the classifier fail (a huge input, a weird encoding).

For a security rail, fail closed after a bounded number of attempts, and monitor the rate of `classifier_unavailable` like any other error. A rail whose failures are invisible is a rail that is silently off.

## The limits

- **Probabilistic rails are bypassable.** Adaptive attackers (lesson 02) find phrasings, languages and encodings the classifier never saw. Treat its catch rate as noise reduction.
- **False positives cost users.** Every blocked legitimate question is a support ticket; topic and PII rules need evals on real traffic, both directions (module 10).
- **Latency and cost.** A classifier call before every answer adds both; run cheap rails first, and consider running the classifier in parallel with the answer, discarding the answer if the verdict is unsafe.
- **Guardrails do not see actions.** A clean-looking request can still lead to a harmful tool call; that is what permissions, the trifecta guard and approvals are for.

> **Status as of October 2026:** common building blocks include NVIDIA NeMo Guardrails (programmable rails), open guard models such as Meta's Llama Guard and Prompt Guard families, Microsoft Presidio for PII, and moderation or safety classifiers offered by the major model providers and cloud platforms. Names and capabilities change quickly; evaluate any of them on your own traffic and attacks before relying on reported accuracy.

## When to choose it

Add deterministic rails (length, scope, PII with validation, completion checks) to every model-facing feature; they are cheap and predictable. Add a model-based classifier when the input is open to the public or the cost of a successful misuse is high, decide fail-closed explicitly, and measure both catch rate and false positives. Never let a guardrail be the only thing between untrusted input and a consequential action.
