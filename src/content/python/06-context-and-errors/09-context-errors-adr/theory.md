# Checkpoint: the Context and Errors ADR

This module answered two questions. **Who releases the resource when something fails?** `with` calls `__exit__` on every way out; `@contextmanager` needs `try/finally` around its `yield`; `ExitStack` releases a number of resources known only at run time, in reverse order, even when a close fails; `pop_all()` hands them to an owner. **What does an exception carry?** Its class in a hierarchy (what callers branch on), its message (stable text for humans and alerting), its cause (`raise ... from`), its notes (context added on the way up), and, when several independent things fail, the group that carries them all.

The checkpoint turns these mechanisms into one decision for a workflow: an **Architecture Decision Record** plus a **plan** a teammate could implement.

## The decision checklist

1. **Count the resources.** List what one run holds open *at the same time*, and how that number changes between runs. A count fixed in the source fits nested `with`; a count read from data at run time needs an `ExitStack`.
2. **Choose the release mechanism.** Context managers make release automatic for every caller. Hand-written `try/finally` works for one resource and drifts as soon as the count changes. Garbage collection gives no timing and no order, and an object kept alive by a cache is never collected.
3. **Decide what callers branch on.** `except` matches classes, so retry logic and error responses need a hierarchy; error codes and strings force every caller to parse.
4. **Decide what operators get.** The original exception as `__cause__`, identifiers as notes, and messages that do not change per request so alerting can group them.
5. **One failure or all of them?** When independent failures must be reported together, collect them into an `ExceptionGroup`, and know the largest number one operation can produce.
6. **Rejected options.** Record at least two, each with the fact from the briefing that ruled it out.

## Coherence is the point

A plan with `nested_with` for a run that opens 6 resources on Monday and 9 on Friday is wrong on one of those days. A plan that reports the first validation error cannot satisfy "all errors at once". A plan that puts the order ID in the message breaks alert grouping. The tests check exactly these relationships, and the counts are numbers you compute from the briefing.

```py
# a nightly billing export: 1 database connection, 1 object-storage client,
# and one CSV writer per tenant; 12 tenants on weekdays, 30 at month end
weekday = 1 + 1 + 12      # 14 resources
month_end = 1 + 1 + 30    # 32 resources held at the same time
print(weekday, month_end) # the count varies, so the writers go on an ExitStack
```

## Example: a billing export plan

```py
PLAN = {
    "resource_management": "context_managers",   # every client ships one
    "multi_resource": "exit_stack",              # 14 to 32 resources per run
    "peak_resources": 1 + 1 + 30,
    "error_model": "hierarchy",                  # BillingError -> TransientError, InvoiceRejected
    "validation_errors": "exception_group",      # every malformed row reported at once
    "max_errors_reported": 8,                    # 8 checked columns per row (stated in that briefing)
    "chaining": "from_cause",
    "context_notes": True,                       # tenant ID as a note, stable messages
    "rejected": [{"pattern": "one try/finally per writer", "reason": "The writer count changes every run and a manual chain drifts."}],
}
```

With a fixed set of three resources and no batch validation, the same template would choose nested `with` and a single exception per failure, and the ADR should say why.
