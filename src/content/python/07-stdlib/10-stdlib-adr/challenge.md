Write the ADR and the plan for the **standard-library foundations of a billing-report tool**.

## Briefing

A telecom billing team is replacing a legacy script with a Python tool. Each month it reads the usage files that three partner carriers upload to a **shared storage** folder, prices every metered line, and exports the lines. The numbers below are also defined in `adr.py` (`PRODUCTS`, `SURCHARGE_RATE`, `OFFICE_OFFSETS`, `SAMPLE_RECORD`, `WEBHOOK_*`, `EXPORT_WINDOW_SECONDS`), so you can compute with them there.

- **Money.** One line per metered event. Every line pays a regulatory **surcharge of 10%** of its unit price, **rounded per line** to the cent. Finance's rule is `ROUND_HALF_UP` on the exact product. The legacy script computed `round(price * 0.10, 2)` with floats. Lines per month:

  | Product | Unit price (EUR) | Lines per month |
  | --- | --- | --- |
  | `sms` | 0.15 | 2 400 000 |
  | `voice_minute` | 0.35 | 900 000 |
  | `data_mb` | 0.45 | 1 500 000 |
  | `mms` | 2.15 | 60 000 |
  | `api_call` | 0.0035 | 1 800 000 |

- **Timestamps.** Usage files carry local times from the offices that produce them. Over a year the offsets are: billing platform `+00:00`; São Paulo `-03:00`; New York `-05:00` in winter and `-04:00` in summer; Lisbon `+00:00` and `+01:00`; Kolkata `+05:30`; Sydney `+11:00` in January and `+10:00` in July; the Halifax support desk `-04:00` and `-03:00`. Invoice months are cut in UTC.
- **Export.** Three consumers read the lines: the data warehouse (Python), the customer dashboard (a browser app whose JSON parser turns every number into a 64-bit binary float) and a partner's reconciliation webhook. Their contract: one JSON object per line, keys sorted, compact separators `(",", ":")`, `ensure_ascii=False`, UTF-8; amounts as JSON strings (`str(Decimal)`); timestamps as `isoformat()` in UTC; and an export that meets a type it does not know **fails** instead of shipping. `SAMPLE_RECORD` is the largest line the export can produce.
- **Webhook.** A request body holds whole lines and at most **262 144 bytes** (256 KiB). The partner accepts **5 requests per second**, and the whole month must reach it within **1 hour**.
- **Shared storage.** The warehouse loads any file the moment it appears in the export folder; last quarter it loaded a half-written file. The carriers' usage files on the same storage are **untrusted** input.
- **Operators and finance.** Finance runs the tool from a scheduler with two subcommands, `export` and `reconcile`, redirects its standard output into the report file, and pages on exit code `2` (bad invocation) differently from `1` (failed run). Operators need levels and one diagnostic line per event, on standard error.

## Task

In `adr.py`, fill two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `consumer`s and the `untrusted` input.
- `decision`: at least 40 characters, starts with `We will`, and names `Decimal`, `UTC`, the JSON `encoder` and `argparse`.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...], "security": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `money_type`: `"decimal"`, `"float"` or `"int_cents"`.
- `float_drift_cents`: an integer, how many cents a month the legacy float surcharge differs from finance's rule, summed over every line.
- `timestamps`: `"aware_utc"`, `"naive_local"` or `"strings"`; `utc_offsets`: an integer, the number of **distinct** UTC offsets the source systems use over a year.
- `serialization`: `"custom_encoder"` (a `json.JSONEncoder` subclass handling `Decimal` and `datetime`), `"str_everywhere"` (`default=str`) or `"pickle"`.
- `record_bytes`: an integer, the size in bytes of `SAMPLE_RECORD` encoded by the contract, newline included.
- `batch_size`: an integer, the lines per webhook request.
- `file_writes`: `"atomic_replace"` (write a temporary file in the same folder, then `os.replace`) or `"in_place"`.
- `logging`: `"configured_logger"` or `"print"`; `cli`: `"argparse"` or `"manual"`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the numbers rather than from the field names:

1. The drift follows from the per-line surcharge of each product, computed both ways; a representation that drifts, or that cannot hold every unit price, does not fit finance's rule.
2. The offset count follows from the list above; when sources disagree on the offset, a timestamp without one is ambiguous.
3. The serialization can be read by every consumer, not only by Python programs, fails on unknown types and never runs code from data.
4. The record size follows from the contract (bytes, not characters). A batch fits in one request body and is large enough for the month to arrive within the window at the allowed request rate.
5. Readers of the shared folder never see a partial file; diagnostics never mix with the report on standard output; the scheduler can tell a bad invocation from a failed run.
6. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
