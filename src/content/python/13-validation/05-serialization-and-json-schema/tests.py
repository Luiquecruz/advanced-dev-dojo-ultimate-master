import json
from datetime import datetime, timezone
from decimal import Decimal

from pydantic import BaseModel, ValidationError

PAYLOAD = {
    "invoiceId": "INV-7",
    "issuedAt": "2026-11-04T10:30:00Z",
    "lines": [
        {"sku": "A-1", "quantity": 2, "unitPrice": "19.90"},
        {"sku": "B-2", "quantity": 1, "unitPrice": "5.00"},
    ],
}


def error_pairs(error):
    return sorted((tuple(item["loc"]), item["type"]) for item in error.errors())


@test("camelCase payloads parse into snake_case attributes, and Python names work too")
async def _():
    invoice = mod.Invoice.model_validate(PAYLOAD)
    price_type = type(invoice.lines[0].unit_price).__name__
    issued = invoice.issued_at
    assert invoice.invoice_id == "INV-7"
    assert issued == datetime(2026, 11, 4, 10, 30, tzinfo=timezone.utc)
    assert invoice.lines[0].unit_price == Decimal("19.90")
    assert price_type == "Decimal"
    direct = mod.Invoice(invoice_id="INV-8", issued_at=issued, lines=[mod.Line(sku="C-3", quantity=3, unit_price="1.10")])
    assert direct.lines[0].quantity == 3
    error = await capture_error(lambda: mod.Line.model_validate({"sku": "D-4", "quantity": 0, "unitPrice": "-1"}))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    assert pairs == [(("quantity",), "greater_than"), (("unitPrice",), "greater_than_equal")]


@test("export returns JSON-ready data with camelCase keys, an ISO datetime and decimal strings")
def _():
    exported = mod.export(mod.Invoice.model_validate(PAYLOAD))
    text = json.dumps(exported)
    assert exported == {
        "invoiceId": "INV-7",
        "issuedAt": "2026-11-04T10:30:00Z",
        "lines": [
            {"sku": "A-1", "quantity": 2, "unitPrice": "19.90"},
            {"sku": "B-2", "quantity": 1, "unitPrice": "5.00"},
        ],
        "totalDue": "44.80",
    }
    assert len(text) > 0


@test("the computed total follows the lines and is output only")
async def _():
    invoice = mod.Invoice.model_validate(PAYLOAD)
    empty = mod.Invoice.model_validate({**PAYLOAD, "lines": []})
    exported = mod.export(invoice)
    without_total = {key: value for key, value in exported.items() if key != "totalDue"}
    round_trip = mod.Invoice.model_validate(without_total)
    assert invoice.total_due == Decimal("44.80")
    assert empty.total_due == Decimal("0")
    assert round_trip == invoice
    error = await capture_error(lambda: mod.Invoice.model_validate(exported))
    assert isinstance(error, ValidationError)
    pairs = error_pairs(error)
    assert pairs == [(("totalDue",), "extra_forbidden")]


@test("schema_properties reads the JSON Schema of any model, in validation or serialization mode")
def _():
    class Probe(BaseModel):
        zeta: int
        alpha: str

    validation = mod.schema_properties(mod.Invoice)
    serialization = mod.schema_properties(mod.Invoice, "serialization")
    line = mod.schema_properties(mod.Line)
    probe = mod.schema_properties(Probe)
    quantity = mod.Line.model_json_schema()["properties"]["quantity"]
    assert validation == ["invoiceId", "issuedAt", "lines"]
    assert serialization == ["invoiceId", "issuedAt", "lines", "totalDue"]
    assert line == ["quantity", "sku", "unitPrice"]
    assert probe == ["alpha", "zeta"]
    assert quantity.get("exclusiveMinimum") == 0
