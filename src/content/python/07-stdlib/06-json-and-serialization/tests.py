import datetime
import json
from decimal import Decimal

UTC_MINUS_3 = datetime.timezone(datetime.timedelta(hours=-3))


def sample_invoice():
    return mod.Invoice(
        number="INV-7",
        issued_at=datetime.datetime(2026, 11, 4, 9, 30, tzinfo=UTC_MINUS_3),
        lines=[mod.Line("Keyboard", Decimal("19.90")), mod.Line("Cable", Decimal("0.10"))],
    )


@test("DojoEncoder writes datetimes as ISO text, Decimals as strings and dataclasses as objects")
def _():
    text = json.dumps(sample_invoice(), cls=mod.DojoEncoder)
    data = json.loads(text)
    assert data["number"] == "INV-7"
    assert data["issued_at"] == "2026-11-04T09:30:00-03:00"
    assert data["lines"] == [{"description": "Keyboard", "amount": "19.90"}, {"description": "Cable", "amount": "0.10"}]
    day = json.dumps({"due": datetime.date(2026, 12, 1)}, cls=mod.DojoEncoder)
    assert day == '{"due": "2026-12-01"}'


@test("DojoEncoder refuses values it does not know how to encode")
async def _():
    for value in (object(), {1, 2}, mod.Invoice):
        error = await capture_error(lambda: json.dumps({"value": value}, cls=mod.DojoEncoder))
        assert isinstance(error, TypeError)


@test("dumps_stable gives the same compact text whatever the key insertion order")
def _():
    first = mod.dumps_stable({"total": Decimal("20.00"), "items": ("a", "b"), "customer": {"name": "Ada", "id": 7}})
    second = mod.dumps_stable({"customer": {"id": 7, "name": "Ada"}, "items": ["a", "b"], "total": Decimal("20.00")})
    assert first == '{"customer":{"id":7,"name":"Ada"},"items":["a","b"],"total":"20.00"}'
    assert second == first


@test("NaN and Infinity are rejected when writing and when reading")
async def _():
    for number in (float("nan"), float("inf")):
        error = await capture_error(lambda: mod.dumps_stable({"ratio": number}))
        assert isinstance(error, ValueError)
    for text in ('{"ratio": NaN}', '{"ratio": Infinity}', "[-Infinity]"):
        error = await capture_error(lambda: mod.loads_with_decimals(text))
        assert isinstance(error, ValueError)


@test("loads_with_decimals keeps every digit of decimal numbers and leaves integers alone")
def _():
    data = mod.loads_with_decimals('{"amount": 12345678901234567.89, "rate": 0.1, "fee": 1e-3, "count": 3}')
    assert data["amount"] == Decimal("12345678901234567.89")
    assert data["rate"] == Decimal("0.1")
    assert data["fee"] == Decimal("0.001")
    assert type(data["amount"]) is Decimal
    assert type(data["count"]) is int
