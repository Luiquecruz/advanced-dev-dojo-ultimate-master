import json
import math
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
SURCHARGE_RATE = Decimal("0.10")
PRODUCTS = {
    "sms": ("0.15", 2_400_000),
    "voice_minute": ("0.35", 900_000),
    "data_mb": ("0.45", 1_500_000),
    "mms": ("2.15", 60_000),
    "api_call": ("0.0035", 1_800_000),
}
OFFSETS = [["+00:00"], ["-03:00"], ["-05:00", "-04:00"], ["+00:00", "+01:00"], ["+05:30"], ["+11:00", "+10:00"], ["-04:00", "-03:00"]]
RECORD = {
    "id": "LN-2026-03-000006660000",
    "customer": "Lumière Télécom Ltda.",
    "product": "voice_minute",
    "quantity": 1,
    "unit_price": "0.35",
    "surcharge": "0.04",
    "amount": "0.39",
    "currency": "EUR",
    "occurred_at": datetime(2026, 3, 29, 1, 30, tzinfo=timezone.utc).isoformat(),
}
WEBHOOK_MAX_BYTES = 262_144
REQUESTS_PER_SECOND = 5
WINDOW_SECONDS = 3_600

CHOICES = {
    "money_type": ["decimal", "float", "int_cents"],
    "timestamps": ["aware_utc", "naive_local", "strings"],
    "serialization": ["custom_encoder", "str_everywhere", "pickle"],
    "file_writes": ["atomic_replace", "in_place"],
    "logging": ["configured_logger", "print"],
    "cli": ["argparse", "manual"],
}
INTEGER_FIELDS = ["float_drift_cents", "utc_offsets", "record_bytes", "batch_size"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


def check_entries(entries, key):
    assert isinstance(entries, list)
    assert len(entries) >= 2
    for entry in entries:
        assert len(entry[key].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry[key] for entry in entries])


def legacy_drift_cents():
    total = 0
    for price, lines in PRODUCTS.values():
        legacy = Decimal(repr(round(float(price) * float(SURCHARGE_RATE), 2)))
        exact = (Decimal(price) * SURCHARGE_RATE).quantize(CENT, rounding=ROUND_HALF_UP)
        total += int(abs(legacy - exact) / CENT) * lines
    return total


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    context = adr["context"].lower()
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(context.strip()) >= 80
    assert "consumer" in context
    assert "untrusted" in context
    assert len(adr["decision"].strip()) >= 40
    assert adr["decision"].strip().lower().startswith("we will")


@test("the alternatives, consequences and rejected patterns have the expected shape")
def _():
    adr = mod.ADR
    check_entries(adr["alternatives"], "option")
    for side in ["positive", "negative", "security"]:
        items = adr["consequences"][side]
        assert isinstance(items, list), side
        assert len(items) >= 1, side
        for item in items:
            assert len(item.strip()) >= 15, side
    check_entries(mod.PLAN["rejected"], "pattern")


@test("the plan uses only known values and integers for every computed field")
def _():
    plan = mod.PLAN
    for field, allowed in CHOICES.items():
        value = plan[field]
        assert value in allowed, field
    for field in INTEGER_FIELDS:
        assert is_integer(plan[field]), field


@test("the money representation fits the surcharge drift and the unit prices")
def _():
    plan = mod.PLAN
    expected = legacy_drift_cents()
    drift = plan["float_drift_cents"]
    sub_cent = [price for price, _ in PRODUCTS.values() if Decimal(price) != Decimal(price).quantize(CENT)]
    money = plan["money_type"]
    assert drift == expected
    if expected > 0:
        assert money != "float", "float surcharges drift from finance's rounding rule"
    if sub_cent:
        assert money != "int_cents", "a unit price below one cent has no exact integer-cent value"


@test("the timestamp and serialization choices fit the source offsets and the consumers")
def _():
    plan = mod.PLAN
    expected = len({offset for offsets in OFFSETS for offset in offsets})
    offsets = plan["utc_offsets"]
    serialization = plan["serialization"]
    assert offsets == expected
    if expected > 1:
        assert plan["timestamps"] == "aware_utc", "local times from sources with different offsets are ambiguous"
    assert serialization != "pickle", "pickle.loads executes code from the data and only Python can read it"
    assert serialization != "str_everywhere", "default=str never raises, so unknown types would ship silently"


@test("the batch, file writes, logging, CLI and decision wording are coherent with the plan")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    line = json.dumps(RECORD, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n"
    expected = len(line.encode("utf-8"))
    record_bytes = plan["record_bytes"]
    batch = plan["batch_size"]
    total_lines = sum(lines for _, lines in PRODUCTS.values())
    floor = math.ceil(total_lines / (REQUESTS_PER_SECOND * WINDOW_SECONDS))
    ceiling = WEBHOOK_MAX_BYTES // expected
    assert record_bytes == expected
    assert batch >= floor
    assert batch <= ceiling
    assert plan["file_writes"] == "atomic_replace"
    assert plan["logging"] == "configured_logger"
    assert plan["cli"] == "argparse"
    for word in ["decimal", "utc", "encoder", "argparse"]:
        assert word in decision, word
