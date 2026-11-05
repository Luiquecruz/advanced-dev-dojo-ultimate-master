import json
import math
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

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

CENT = Decimal("0.01")


class ExportEncoder(json.JSONEncoder):
    """Decimal as a string, aware datetime as ISO 8601 in UTC; anything else raises TypeError."""

    def default(self, value):
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat()
        return super().default(value)


def drift_cents(price: Decimal) -> int:
    legacy = Decimal(repr(round(float(price) * float(SURCHARGE_RATE), 2)))
    exact = (price * SURCHARGE_RATE).quantize(CENT, rounding=ROUND_HALF_UP)
    return int(abs(legacy - exact) / CENT)


FLOAT_DRIFT_CENTS = sum(drift_cents(price) * lines for price, lines in PRODUCTS.values())
UTC_OFFSETS = len({offset for offsets in OFFICE_OFFSETS.values() for offset in offsets})
RECORD_LINE = json.dumps(SAMPLE_RECORD, cls=ExportEncoder, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n"
RECORD_BYTES = len(RECORD_LINE.encode("utf-8"))
TOTAL_LINES = sum(lines for _, lines in PRODUCTS.values())
MIN_BATCH = math.ceil(TOTAL_LINES / (WEBHOOK_REQUESTS_PER_SECOND * EXPORT_WINDOW_SECONDS))
MAX_BATCH = WEBHOOK_MAX_BYTES // RECORD_BYTES

ADR = {
    "id": 7,
    "title": "Exact money, aware UTC times and a strict JSON encoder for the billing-report tool",
    "status": "accepted",
    "context": (
        "Every one of 6 660 000 monthly lines pays a 10% surcharge rounded per line; the legacy float rounding differs "
        f"from finance's ROUND_HALF_UP rule by {FLOAT_DRIFT_CENTS} cents a month, and the api_call price of 0.0035 is "
        f"below a cent. Usage files carry {UTC_OFFSETS} distinct UTC offsets over a year while invoice months are cut in "
        "UTC. Three consumers, a Python warehouse, a browser dashboard and a partner webhook (256 KiB per request, 5 requests/s, one hour), "
        "read the export; the warehouse loads files as soon as they appear on shared storage, where the carriers' usage "
        "files are untrusted input. Finance pipes standard output into the report and pages on exit codes 2 and 1."
    ),
    "decision": (
        "We will hold money as Decimal with ROUND_HALF_UP per line, parse every timestamp into an aware datetime in UTC, "
        f"export JSON Lines through a json.JSONEncoder subclass in batches of 1 000 lines ({RECORD_BYTES} bytes per "
        "line at most), publish files with os.replace, log to standard error through one configured logger, and "
        "build the export and reconcile subcommands with argparse."
    ),
    "alternatives": [
        {
            "option": "Integer cents for every amount",
            "reason": "The api_call unit price of 0.0035 EUR is a third of a cent and cannot be stored as whole cents.",
        },
        {
            "option": "Naive local datetimes as written in the usage files",
            "reason": "Eight different offsets and daylight-saving changes make a local time without an offset ambiguous.",
        },
        {
            "option": "json.dumps(default=str) for every value",
            "reason": "It never raises, so an unexpected type would ship as text instead of failing the export.",
        },
    ],
    "consequences": {
        "positive": [
            "Surcharges match finance's rule on every line, removing a 33 600 EUR monthly reconciliation gap.",
            "The dashboard receives amounts as strings, so its parser never rounds them through binary floats.",
        ],
        "negative": [
            "Decimal arithmetic is slower than float and every boundary must convert amounts explicitly.",
            "A new field type now fails the export until someone extends the encoder on purpose.",
        ],
        "security": [
            "Untrusted carrier files are parsed as JSON and validated, never unpickled, so loading cannot run code.",
            "Diagnostics go through a logger on standard error, where redaction filters apply before operators read them.",
        ],
    },
}

PLAN = {
    "money_type": "decimal",
    "float_drift_cents": FLOAT_DRIFT_CENTS,
    "timestamps": "aware_utc",
    "utc_offsets": UTC_OFFSETS,
    "serialization": "custom_encoder",
    "record_bytes": RECORD_BYTES,
    "batch_size": 1_000,
    "file_writes": "atomic_replace",
    "logging": "configured_logger",
    "cli": "argparse",
    "rejected": [
        {
            "pattern": "float amounts with round(value, 2)",
            "reason": "The per-line surcharge lands on the wrong side of half a cent for sms, voice_minute and mms lines.",
        },
        {
            "pattern": "pickle files on the shared storage",
            "reason": "pickle.loads runs code chosen by whoever wrote the file, and only Python programs can read the format.",
        },
        {
            "pattern": "print for diagnostics",
            "reason": "Finance redirects standard output into the report file, so diagnostics would corrupt the report.",
        },
    ],
}
