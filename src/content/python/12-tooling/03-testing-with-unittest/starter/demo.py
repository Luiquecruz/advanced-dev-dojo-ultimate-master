import io
import unittest
from unittest import mock

import main
import pricing

result = main.run_suite()
print(f"real pricing: {result.testsRun} tests, {len(result.failures)} failures, {len(result.errors)} errors")

report = io.StringIO()
suite = unittest.TestLoader().loadTestsFromTestCase(main.PricingTests)
unittest.TextTestRunner(stream=report, verbosity=2).run(suite)
for line in report.getvalue().splitlines():
    if line.startswith("test_"):
        print(" ", line)

with mock.patch.object(pricing, "BULK_THRESHOLD", 101):
    broken = main.run_suite()
print(f"discount moved to 101 units: {len(broken.failures)} failing test(s)")
for test, trace in broken.failures:
    print(" ", test, "->", trace.strip().splitlines()[-1])
