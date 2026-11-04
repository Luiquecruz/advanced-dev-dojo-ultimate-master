import io
import unittest
from unittest import mock

import pricing


class PricingTests(unittest.TestCase):
    def test_price_is_unit_price_times_quantity(self):
        self.assertEqual(pricing.quote(250, 4), 1000)

    # TODO: a table of quantities around the bulk threshold (one self.subTest per row), so a discount that
    # starts one unit late fails.

    # TODO: a quantity of 0 (and a negative one) raises pricing.InvalidQuote: use self.assertRaises as a
    # context manager.

    # TODO: a EUR quote with fetch_rate patched where quote looks it up (mock.patch with return_value): check the
    # converted total and that the rate was asked for "EUR" exactly once. The real fetch_rate must never run.


def run_suite() -> unittest.TestResult:
    # TODO: load PricingTests with unittest.TestLoader and run them with a TextTestRunner that writes to an
    # io.StringIO, then return the result.
    return unittest.TestResult()
