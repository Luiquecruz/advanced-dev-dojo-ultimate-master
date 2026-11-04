Write the ADR and the plan for the **resources and errors of a payment-capture workflow**.

## Briefing

A worker captures authorized card payments in batches. Each **run** works on the orders of the regions scheduled for it.

- **Resources per run:** one database connection (it holds **row locks** on the orders being captured) and one message-broker channel, plus **one export file per active region**. The set of active regions is read from the schedule when the run starts: an average run has **4** active regions, a peak run **7**.
- **Partial failures** must never leave locks held or channels open. Last quarter, a hand-written chain of `try/finally` blocks covered fewer resources than a peak run opened, and one export file kept its lock until the worker was restarted.
- The database driver, the broker client and the export writer all ship **context managers** (`with connection:`). The worker is a long-lived process that keeps references to recent runs in a retry cache, so nothing can depend on the garbage collector to release a resource.
- **Operators** need the **root cause** of every failure (the driver's or broker's original exception) and the **order ID**. Alerting groups incidents by exception message, so messages must stay the same for every order.
- **Callers** retry only transient failures (broker timeouts, database deadlocks) and must tell them apart from declined payments **by type**, including transient types added later.
- **Support** wants **all** validation errors of a capture request at once. A capture request has **11 validated fields**, and each of them can fail in the same request.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the active `region`s and the `lock`s.
- `decision`: at least 40 characters, starts with `We will`, and names the multi-resource mechanism and the validation mechanism you chose (`ExitStack` / `nested with`, `ExceptionGroup` / `first error`).
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `resource_management`: `"context_managers"`, `"try_finally"` or `"gc"`.
- `multi_resource`: `"exit_stack"` or `"nested_with"`.
- `peak_resources`: an integer, the number of resources a **peak** run holds open at the same time. Compute it from the briefing.
- `error_model`: `"hierarchy"`, `"error_codes"` or `"strings"`.
- `validation_errors`: `"exception_group"` or `"first_error"`.
- `max_errors_reported`: an integer, the largest number of validation errors one request can report under the briefing. Compute it.
- `chaining`: `"from_cause"` or `"none"`.
- `context_notes`: `True` or `False`, whether the order ID is attached with `add_note` instead of the message.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. The peak count matches the briefing, and a resource count that changes from run to run needs a mechanism that does not fix the count in the source code.
2. Resources are released deterministically with the tools the libraries already provide, and the incident is not repeated.
3. The number of validation errors one request can report matches the briefing, and the reporting choice can carry that many.
4. Callers branch on types, operators get the original exception and the order ID, and messages stay stable.
5. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
