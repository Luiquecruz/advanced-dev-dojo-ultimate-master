from datetime import datetime, timezone
from decimal import Decimal

# Briefing data: compute the plan's numbers from it instead of typing them by hand.
SURCHARGE_RATE = Decimal("0.10")
PRODUCTS = {
    "sms": (Decimal("0.15"), 2_400_000),
    "voice_minute": (Decimal("0.35"), 900_000),
    "data_mb": (Decimal("0.45"), 1_500_000),
    "mms": (Decimal("2.15"), 60_000),
    "api_call": (Decimal("0.0035"), 1_800_000),
}
OFFICE_OFFSETS = {
    "billing": ["+00:00"],
    "sao_paulo": ["-03:00"],
    "new_york": ["-05:00", "-04:00"],
    "lisbon": ["+00:00", "+01:00"],
    "kolkata": ["+05:30"],
    "sydney": ["+11:00", "+10:00"],
    "halifax": ["-04:00", "-03:00"],
}
SAMPLE_RECORD = {
    "id": "LN-2026-03-000006660000",
    "customer": "Lumière Télécom Ltda.",
    "product": "voice_minute",
    "quantity": 1,
    "unit_price": Decimal("0.35"),
    "surcharge": Decimal("0.04"),
    "amount": Decimal("0.39"),
    "currency": "EUR",
    "occurred_at": datetime(2026, 3, 29, 1, 30, tzinfo=timezone.utc),
}
WEBHOOK_MAX_BYTES = 262_144
WEBHOOK_REQUESTS_PER_SECOND = 5
EXPORT_WINDOW_SECONDS = 3_600

ADR = {
    "id": 7,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: surcharge rounding, offsets, the three consumers, the webhook limits,
    # the shared folder and its untrusted usage files, the scheduler and the operators
    "context": "",
    # TODO: one sentence starting with "We will", naming Decimal, UTC, the JSON encoder and argparse
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the team gains, what it pays, and what the choice does for security
    "consequences": {"positive": [], "negative": [], "security": []},
}

PLAN = {
    # TODO: finance reconciles to the cent, and one unit price is below a cent
    "money_type": "float",
    # TODO: per product, compare round(float(price) * 0.10, 2) with the exact product rounded ROUND_HALF_UP,
    # then multiply the difference in cents by the lines per month
    "float_drift_cents": 0,
    # TODO: the sources disagree on their offset, and invoice months are cut in UTC
    "timestamps": "naive_local",
    # TODO: count each distinct offset once
    "utc_offsets": 0,
    # TODO: not every consumer is a Python program, unknown types must fail, and nothing may run code while loading
    "serialization": "pickle",
    # TODO: encode SAMPLE_RECORD by the contract (newline included) and count bytes, not characters
    "record_bytes": 0,
    # TODO: at most what fits in one request body, at least what delivers the month within the window
    "batch_size": 0,
    # TODO: the warehouse loads any file the moment it appears
    "file_writes": "in_place",
    # TODO: finance redirects standard output into the report; operators need levels on standard error
    "logging": "print",
    # TODO: two subcommands, and the scheduler tells exit code 2 from 1
    "cli": "manual",
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
