import json

from main import Invoice, Line, export, schema_properties

body = """
{"invoiceId": "INV-7", "issuedAt": "2026-11-04T10:30:00Z",
 "lines": [{"sku": "A-1", "quantity": 2, "unitPrice": "19.90"},
           {"sku": "B-2", "quantity": 1, "unitPrice": "5.00"}]}
"""

invoice = Invoice.model_validate_json(body)
print("parsed:", invoice.invoice_id, invoice.issued_at.isoformat(), "total", invoice.total_due)
print("export:", json.dumps(export(invoice)))
print("schema (input): ", schema_properties(Invoice))
print("schema (output):", schema_properties(Invoice, "serialization"))
print("line schema:", schema_properties(Line), json.dumps(Line.model_json_schema()["properties"]["quantity"]))
