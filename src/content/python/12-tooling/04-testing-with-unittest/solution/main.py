import io
import unittest
from unittest import mock

import pricing


class PricingTests(unittest.TestCase):
    def test_price_is_unit_price_times_quantity(self):
        self.assertEqual(pricing.quote(250, 4), 1000)

    def test_bulk_discount_starts_at_the_threshold(self):
        rows = [(1, 250), (99, 24_750), (100, 22_500), (101, 22_725), (250, 56_250)]
        for quantity, expected in rows:
            with self.subTest(quantity=quantity):
                self.assertEqual(pricing.quote(250, quantity), expected)

    def test_quantity_below_one_is_rejected(self):
        for quantity in (0, -3):
            with self.subTest(quantity=quantity):
                with self.assertRaises(pricing.InvalidQuote) as caught:
                    pricing.quote(250, quantity)
                self.assertIn("quantity", str(caught.exception))

    def test_foreign_currency_uses_the_rate(self):
        with mock.patch("pricing.fetch_rate", return_value=0.5) as fetch_rate:
            total = pricing.quote(250, 4, currency="EUR")
        self.assertEqual(total, 500)
        fetch_rate.assert_called_once_with("EUR")

    def test_usd_needs_no_rate(self):
        with mock.patch("pricing.fetch_rate") as fetch_rate:
            self.assertEqual(pricing.quote(250, 4), 1000)
        fetch_rate.assert_not_called()


def run_suite() -> unittest.TestResult:
    suite = unittest.TestLoader().loadTestsFromTestCase(PricingTests)
    return unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)
