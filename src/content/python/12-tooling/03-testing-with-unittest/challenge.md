The pricing module of an order service has no tests. Write them with the standard library only: `unittest` and `unittest.mock`. Your suite is graded twice: it must **pass** against the real `pricing.py`, and it must **fail** against broken copies of it, because a suite that passes everything proves nothing.

## The code under test (do not edit)

`pricing.py` imports `fetch_rate` from `rates.py` (`from rates import fetch_rate`) and defines:

- `InvalidQuote(ValueError)`.
- `quote(unit_cents, quantity, currency="USD")` returns the total in integer cents:
  - `quantity` below 1 raises `InvalidQuote` (its message mentions `quantity`).
  - From **100 units** on (`BULK_THRESHOLD`), the total gets **10% off**: `total * 90 // 100`.
  - For any currency other than `"USD"`, the total is converted with `round(total * fetch_rate(currency))`.

`rates.fetch_rate(currency)` stands for a call to an exchange-rate service. It is not reachable from tests: every real call is recorded in `rates.calls` and raises `ConnectionError`.

## Your task, in `main.py`

Keep `import pricing` and call everything through it (`pricing.quote`, `pricing.InvalidQuote`): the grader swaps the module for broken copies.

1. `class PricingTests(unittest.TestCase)` with at least three test methods that together cover:
   - a table of quantities around the bulk threshold, one `self.subTest(quantity=...)` per row;
   - invalid quantities, zero included, with `self.assertRaises(pricing.InvalidQuote)` used as a context manager;
   - a foreign-currency quote with `fetch_rate` replaced by `unittest.mock.patch` (as a context manager or a decorator), checking both the converted total and the currency the rate was asked for.
2. `run_suite()` loads `PricingTests` with `unittest.TestLoader`, runs it with a `unittest.TextTestRunner` that writes to an `io.StringIO`, and returns the `unittest.TestResult`.

## How it is graded

- `run_suite()` reports at least 3 tests run, with no failures and no errors, against the real `pricing.py`.
- The suite fails against a copy where the discount starts one unit late, a copy that accepts a zero quantity, a copy whose conversion ignores the rate, and a copy that asks `fetch_rate` for the wrong currency.
- The real `fetch_rate` is never called (`rates.calls` stays empty).
- The source uses `assertRaises` and `subTest` as context managers and calls `patch`.
