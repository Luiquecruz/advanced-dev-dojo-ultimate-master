1. For every helper, list what can go wrong and decide, case by case, whether this function should handle the failure or let it travel to the caller.
2. For `parse_quantity`, let `int` do the parsing, turn its `ValueError` into one whose message carries the text, and add a separate check for negative numbers.
3. For `safe_ratio`, handle exactly one exception type, and test by hand that a text argument still raises.
4. For `read_port`, use one `except` clause for the missing key and another, with a tuple, for the values `int` cannot convert.
5. For `parse_all`, put only the call to `parse_quantity` inside `try`, record the text in `except ValueError`, and record the number in `else`.
6. For `run_with_log`, decide which line must run whatever happens, and place it in `finally`.
7. Run the tests, then the demo, and read the traceback of any test that fails from its last line up.
