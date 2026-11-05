import datetime
import json
from decimal import Decimal

from main import Invoice, Line, dumps_stable, loads_with_decimals

issued = datetime.datetime(2026, 11, 4, 9, 30, tzinfo=datetime.timezone(datetime.timedelta(hours=-3)))
invoice = Invoice("INV-7", issued, [Line("Keyboard", Decimal("19.90")), Line("Cable", Decimal("0.10"))])
print("sent:", dumps_stable(invoice))

received = loads_with_decimals('{"amount": 12345678901234567.89, "items": 2}')
print("received:", received, "| amount + 0.01 =", received["amount"] + Decimal("0.01"))
print("plain json.loads:", json.loads('{"amount": 12345678901234567.89}'))

print("lossy round trip:", json.loads(json.dumps({1: (2, 3)})))

try:
    loads_with_decimals('{"ratio": NaN}')
except ValueError as error:
    print("rejected:", error)
