Start with `run_suite()`: `unittest.TestLoader().loadTestsFromTestCase(PricingTests)` builds the suite, and `unittest.TextTestRunner(stream=io.StringIO()).run(suite)` runs it and returns the `TestResult`. The first test turns green once the given test method runs.
---
Each planted bug moves a boundary. Put rows on both sides of 100 units (99, 100 and 101) in the `subTest` table, and include `0` among the invalid quantities: a test that only tries `-1` cannot tell `<= 0` from `< 0`.
---
`pricing.py` did `from rates import fetch_rate`, so the name `quote` calls is `pricing.fetch_rate`. Patch that: `with mock.patch("pricing.fetch_rate", return_value=0.5) as fetch_rate:`. Pick a rate other than 1.0 so the converted total differs from the USD total, and finish with `fetch_rate.assert_called_once_with("EUR")`.
