# Checkpoint: the Standard Library ADR

This module asked which standard-library module handles each everyday task, and **which defaults lose data silently**. The answers were concrete: a binary `float` cannot hold `0.1`, and `round(2.675, 2)` gives `2.67`; a naive `datetime` has no offset, so "09:00" means a different instant in every office; `json` turns tuples into lists and int keys into strings, and `default=str` turns *anything* into text without an error; `len(text)` counts characters while a request limit counts bytes; a logger configured twice prints every line twice; and a CLI that reads `sys.argv` by hand cannot be tested.

The checkpoint turns those lessons into the foundations of one tool: an **Architecture Decision Record** plus a **plan** whose numbers you compute from the briefing.

## The decision checklist

1. **What is money?** If an amount or a rounding step must match a rule to the cent, the type must be exact. `Decimal` holds any decimal fraction and lets you choose the rounding mode; integer cents are exact only when every price is a whole number of cents.
2. **How much does the wrong type cost?** Compute it. Rounding per line is where floats hurt: `0.70 * 0.05` is `0.034999…` in binary, so `round(..., 2)` gives `0.03` where finance's `ROUND_HALF_UP` on the exact product gives `0.04`. One cent per line, times the lines per month.
3. **What instant does a timestamp name?** Count the distinct UTC offsets of your sources over a year, daylight saving included. More than one means a local time without its offset is ambiguous; store aware datetimes in UTC and convert only for display.
4. **Who reads the output?** Consumers that are not Python programs exclude `pickle`, which only Python reads and which runs code while loading. A consumer that must not receive surprises needs an encoder that raises `TypeError` on unknown types, not `default=str`.
5. **How big is one record, in bytes?** Encode it exactly as the contract says and measure `len(line.encode("utf-8"))`. A request limit then caps the batch from above, and a rate limit with a deadline bounds it from below.
6. **Who else touches the files, streams and exit codes?** A reader that picks up files as they appear needs an atomic `os.replace` from a temporary file in the same folder; a report on standard output needs diagnostics on a configured logger; a scheduler that pages on exit codes needs `argparse` and `main(argv) -> int`.

## Coherence is the point

The tests compute the briefing's numbers and compare them with yours, and they check that each choice survives those numbers:

```py
import json
import math
from decimal import ROUND_HALF_UP, Decimal

price, rate, lines = Decimal("0.70"), Decimal("0.05"), 500_000
legacy = Decimal(repr(round(float(price) * float(rate), 2)))     # 0.03
exact = (price * rate).quantize(Decimal("0.01"), ROUND_HALF_UP)  # 0.04
drift_cents = int(abs(legacy - exact) / Decimal("0.01")) * lines  # 500 000 cents a month

offsets = {"+01:00", "+02:00", "+01:00", "+00:00"}                 # 3 distinct offsets, not 4

line = json.dumps({"city": "Zürich", "amount": "4.20"}, ensure_ascii=False) + "\n"
len(line), len(line.encode("utf-8"))                             # 37 characters, 38 bytes

floor = math.ceil(1_200_000 / (10 * 1_800))   # 1.2 M records, 10 requests/s, 30 minutes: at least 67 per request
ceiling = 131_072 // 180                       # 128 KiB per request, 180-byte records: at most 728
```

A batch of 50 would miss the deadline and a batch of 1 000 would be refused by the server; anything from 67 to 728 is coherent. If the floor were above the ceiling, the ADR would have to change the design (smaller records, a second endpoint, a longer window) instead of picking a number.

## Example: a parking-fee exporter

```py
PLAN = {
    "money_type": "decimal",             # fees like 0.70 with a 5% levy rounded per line
    "float_drift_cents": 500_000,
    "timestamps": "aware_utc",
    "utc_offsets": 3,
    "serialization": "custom_encoder",   # json.JSONEncoder subclass: Decimal -> str, datetime -> isoformat()
    "record_bytes": 180,
    "batch_size": 500,
    "file_writes": "atomic_replace",
    "logging": "configured_logger",
    "cli": "argparse",
    "rejected": [{"pattern": "pickle on shared storage", "reason": "Anyone who can write the folder can run code in the loader."}],
}
```

The security side belongs in the record too: name the untrusted input in the context and say in the consequences what the choice protects against.
