ADR = {
    "id": 6,
    "title": "Release capture resources with one ExitStack per run and report typed, chained errors",
    "status": "accepted",
    "context": (
        "Each payment-capture run opens one database connection that holds row locks, one broker channel and one "
        "export file per active region: 4 regions on an average run (6 resources) and 7 at peak (9 resources), read "
        "from the schedule when the run starts. A partial failure must not leave locks held, and last quarter a "
        "hand-written try/finally chain covered fewer resources than a peak run opened. Every client library ships a "
        "context manager, and the long-lived worker cannot rely on garbage collection. Operators need the root cause "
        "and the order ID while alert messages stay stable, callers retry transient failures by type, and support "
        "wants every error of the 11 validated fields of a capture request at once."
    ),
    "decision": (
        "We will enter every resource through its library's context manager on one ExitStack per run, model "
        "failures as a CaptureError hierarchy raised from the driver or broker exception with the order ID added as "
        "a note, and report all validation failures of a request together in one ExceptionGroup."
    ),
    "alternatives": [
        {
            "option": "Nested with statements per region count",
            "reason": "The number of export files changes from 4 to 7 between runs, so a fixed nesting in the source cannot match every run.",
        },
        {
            "option": "Hand-written try/finally around each resource",
            "reason": "The incident showed that a manual chain drifts from the real resource count and leaves a lock held.",
        },
        {
            "option": "Error codes in a single exception class",
            "reason": "Callers must branch on transient failures by type, including transient types added later, which codes do not give except blocks.",
        },
    ],
    "consequences": {
        "positive": [
            "Every opened resource is released in reverse order, even when an open or a close fails halfway.",
            "Support receives all of up to 11 validation errors of a request in one response.",
            "Operators see the original driver exception as the direct cause, with the order ID in a note.",
        ],
        "negative": [
            "Handlers that inspect validation errors must use except* or subgroup instead of a plain except clause.",
            "Every new resource type needs a context manager before it can join the run's ExitStack.",
        ],
    },
}

PLAN = {
    "resource_management": "context_managers",
    "multi_resource": "exit_stack",
    "peak_resources": 1 + 1 + 7,
    "error_model": "hierarchy",
    "validation_errors": "exception_group",
    "max_errors_reported": 11,
    "chaining": "from_cause",
    "context_notes": True,
    "rejected": [
        {
            "pattern": "release through garbage collection or __del__",
            "reason": "The worker keeps recent runs in a retry cache, so objects stay alive and their locks are never released on time.",
        },
        {
            "pattern": "report the first validation error only",
            "reason": "One request can fail all 11 validated fields, and support wants every error in a single answer.",
        },
        {
            "pattern": "order ID inside the exception message",
            "reason": "Alerting groups incidents by message, so a different text for every order splits one incident into thousands.",
        },
    ],
}
