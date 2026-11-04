1. Read the rules of `quote` in `challenge.md` and list, for each rule, the smallest input that sits exactly on its boundary: the first discounted quantity, the first invalid quantity, a currency that triggers the conversion.
2. Make `run_suite()` work first, so you can watch your suite grow from the Run demo: loader, runner writing to a `StringIO`, return the result.
3. Write the threshold table as `(quantity, expected)` rows, computing each expected value by hand from the rule, and wrap each assertion in `self.subTest(quantity=quantity)` so every row reports separately.
4. Write the invalid-input test with `with self.assertRaises(pricing.InvalidQuote) as caught:` and check a key word of `caught.exception`.
5. Decide where to patch: find the line that imports `fetch_rate` and patch the name in the module that uses it. Choose a rate that changes the total, then assert both the total and the call arguments.
6. Ask, for each planted bug the grader describes, which of your rows would turn red. If none would, add the row that would.
