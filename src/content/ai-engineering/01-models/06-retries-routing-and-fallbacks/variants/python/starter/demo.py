import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import RouterOptions, answer

CATEGORIES = ["billing", "shipping", "account", "bug"]
TICKETS = [
    "My invoice shows the wrong VAT number.",
    "The parcel tracking has not moved for a week.",
    "I cannot reset my password.",
    "The export button crashes the app.",
]


def is_known_category(text):
    try:
        return json.loads(text).get("category") in CATEGORIES
    except (ValueError, AttributeError):
        return False


async def main():
    fake_model.for_model("cheap").reply(
        respond.json({"category": "billing"}),
        respond.malformed_json({"category": "shipping"}),
        respond.error(429, retry_after_ms=120),
        respond.json({"category": "account"}),
        respond.json({"category": "crash"}),
    )
    fake_model.for_model("strong").reply(respond.json({"category": "shipping"}), respond.error(503), respond.error(503), respond.error(503))
    fake_model.for_model("backup").reply(respond.json({"category": "bug"}))

    options = RouterOptions(
        retries=2,
        base_ms=50,
        max_ms=400,
        models={"cheap": create_model("cheap"), "strong": create_model("strong"), "backup": create_model("backup")},
        validate=is_known_category,
    )
    for ticket in TICKETS:
        calls_before = len(fake_model.requests)
        routed = await answer({"messages": [{"role": "user", "content": f"Classify: {ticket}"}]}, options)
        path = " -> ".join(request["model"] for request in fake_model.requests[calls_before:])
        category = json.loads(routed["text"])["category"]
        print(f"{category:<8} by {routed['model']:<6} escalated={routed['escalated']}  calls: {path}")


if __name__ == "__main__":
    asyncio.run(main())
