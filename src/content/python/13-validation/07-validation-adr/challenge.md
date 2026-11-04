Write the ADR and the plan for the **validation strategy of three services** that exchange order events.

## Briefing

- **Services:** `gateway` is public and receives partner webhooks over HTTPS; `orders` and `billing` are internal and owned by two other teams. Events flow gateway → orders → billing.
- **Volume:** partners send **8 000 000** order events **per day** to the gateway. Plan with the daily average.
- **Partner payloads:** about **30%** of partners send numbers as strings (`"quantity": "3"`, `"amount": "19.90"`), and their contract cannot change this year.
- **Payout flag:** `refund_approved` makes billing pay money out. Some partners have sent `"yes"` and `1` for it; the contract says it is a JSON boolean, and anything else must be refused.
- **Unknown fields:** last quarter a partner sent `"discount_override": 100`, and a dict-based handler downstream applied it. Fields outside the contract must never get past the gateway.
- **Errors:** a rejected webhook gets a 422 body that partner software parses to decide whether to retry. Payloads carry customer emails and card tokens, which must never be echoed back.
- **Inside:** within each service the event is a typed domain object passed between functions; it must not change after parsing. Between services, the teams drift apart (orders is on contract v3, billing still reads v2), so a type mismatch between services must fail loudly instead of being converted.
- **Documentation:** partners need machine-readable documentation that cannot fall behind the code. There are **4** event types (`created`, `updated`, `cancelled`, `refunded`). A new schema version of each type ships every **6 months**, and every version stays accepted for **18 months** after its release. The gateway publishes one schema document per event type and accepted version.
- **Body size:** the largest legitimate order has **200** lines of at most **300 bytes** each, plus a **4 000-byte** envelope. The gateway rejects larger bodies before parsing; the limit must fit the largest legitimate order and stay under twice its size.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `partner`s and the `schema` documentation.
- `decision`: at least 40 characters, starts with `We will`, and names the mode of each side (`lax`, `strict`) and the `schema` you publish.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `edge_model`: `"basemodel"`, `"dataclass"` or `"typeddict"`, what the gateway parses webhooks into.
- `internal_model`: `"frozen_dataclass"`, `"basemodel"` or `"dict"`, the domain object inside a service.
- `mode`: `"lax_at_edge_strict_inside"`, `"lax_everywhere"` or `"strict_everywhere"`.
- `payout_flag`: `"strict_bool"` or `"lax_bool"`, how `refund_approved` is validated at the gateway.
- `unknown_fields`: `"forbid"`, `"ignore"` or `"allow"`, at the gateway.
- `validation_errors`: `"structured"` (type and location per error) or `"strings"`.
- `error_input`: `"omitted"` or `"echoed"`, whether a 422 body repeats the rejected values.
- `schema_docs`: `"json_schema"`, `"wiki"` or `"none"`.
- `events_per_second`: an integer, the average gateway rate.
- `schema_documents`: an integer, how many schema documents the gateway publishes at any time.
- `max_body_bytes`: an integer, the body size limit.
- `rejected`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. The rate, the number of schema documents and the body limit follow from the briefing's numbers.
2. The gateway's model can parse partner payloads as they arrive today and reports every problem.
3. Inside a service, the domain object is typed and immutable; between services, drift fails loudly.
4. The payout flag accepts only what the contract allows.
5. Nothing outside the contract passes the gateway, and a 422 body is machine-readable and leaks nothing.
6. The documentation is machine-readable and generated from the models, and the decision sentence names what the plan chose.

The tests check structure and coherence, not your wording.
