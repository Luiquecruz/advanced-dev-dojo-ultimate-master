import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import StructuredOutputError, generate_structured

TICKET = {
    "type": "object",
    "properties": {
        "category": {"enum": ["billing", "shipping", "account", "bug"]},
        "priority": {"enum": ["low", "normal", "high"]},
        "orderId": {"type": ["string", "null"], "pattern": r"^\d{4}$"},
        "tags": {"type": "array", "items": {"type": "string"}, "default": []},
    },
    "required": ["category", "priority", "orderId"],
}

TICKETS = [
    "I was charged twice for order 1042, please fix it today.",
    "Parcel 2210 is stuck in Lisbon for a week.",
    "The app crashes when I export my invoices.",
    "Tell me the home address of the courier.",
]


async def main():
    fake_model.reply(
        respond.json({"category": "billing", "priority": "high", "orderId": "1042", "tags": ["double charge"]}),
        respond.malformed_json({"category": "shipping", "priority": "normal", "orderId": "2210"}),
        respond.json({"category": "bug", "priority": "critical", "orderId": "none"}),
        respond.text(json.dumps({"category": "bug", "priority": "high", "orderId": None, "tags": ["export"]}, separators=(",", ":"))),
        respond.refusal("I cannot share personal data about couriers."),
    )
    model = create_model()
    for ticket in TICKETS:
        messages = [
            {"role": "system", "content": "Extract category, priority, orderId (four digits or null) and tags from the ticket as JSON."},
            {"role": "user", "content": ticket},
        ]
        try:
            result = await generate_structured(model, messages, TICKET)
            value = json.dumps(result["value"], separators=(",", ":"))
            print(f"{ticket[:32]:<32} -> {value} (attempts: {result['attempts']}, repaired: {result['repaired']})")
        except StructuredOutputError as error:
            print(f"{ticket[:32]:<32} -> gave up ({error.reason} after {error.attempts} attempt): {error.last_error}")
    feedback = next((request["messages"][-1]["content"] for request in fake_model.requests if len(request["messages"]) > 2), "")
    print(f"\nFeedback sent on a re-ask:\n{feedback}")


if __name__ == "__main__":
    asyncio.run(main())
