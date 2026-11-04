import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import examples_verifier, run_verified, schema_verifier


class ListingSchema:
    """Validates {"title": str of at most 60 characters, "price": positive number, "tags": at least one str}."""

    def safe_parse(self, value):
        issues = []
        title = value.get("title")
        if not isinstance(title, str):
            issues.append({"path": ["title"], "message": "Invalid input: expected string"})
        elif len(title) > 60:
            issues.append({"path": ["title"], "message": "Too big: expected string to have <=60 characters"})
        price = value.get("price")
        if not isinstance(price, (int, float)) or isinstance(price, bool):
            issues.append({"path": ["price"], "message": "Invalid input: expected number"})
        elif price <= 0:
            issues.append({"path": ["price"], "message": "Too small: expected number to be >0"})
        tags = value.get("tags")
        if not isinstance(tags, list):
            issues.append({"path": ["tags"], "message": "Invalid input: expected array"})
        elif len(tags) < 1:
            issues.append({"path": ["tags"], "message": "Too small: expected array to have >=1 items"})
        return {"success": True, "data": value} if not issues else {"success": False, "issues": issues}


def report(label, result):
    print(f"{label}: {result['status']} after {result['attempts']} attempt(s)")
    for failure in result["failures"]:
        feedback = failure["feedback"].replace("\n", " | ")
        print(f"  attempt {failure['attempt']} failed {failure['verifier']}: {feedback}")
    print(f"  final output: {result['output']}")


async def main():
    model = create_model()

    fake_model.reply(respond.text(r"ORD-(\d{4}"), respond.text(r"ORD-\d+-\d+"), respond.text(r"ORD-\d{4}-\d{6}"))
    order_ids = examples_verifier(
        should_match=["ORD-2026-000123", "ORD-1999-999999"],
        should_reject=["ord-2026-000123", "ORD-2026-123", "ORD-2026-000123x"],
    )
    report("order id pattern", await run_verified(model, {"prompt": "Write a pattern for order ids such as ORD-2026-000123."}, verifiers=[order_ids], max_attempts=4))

    fake_model.reply(
        respond.malformed_json({"title": "Walnut desk lamp", "price": 39.9, "tags": ["home"]}),
        respond.json({"title": "Walnut desk lamp with a dimmable warm LED and a braided fabric cable", "price": -39.9, "tags": []}),
        respond.json({"title": "Walnut desk lamp, dimmable", "price": 39.9, "tags": ["home", "lighting"]}),
    )
    listing_task = {"system": "Answer with JSON only.", "prompt": "Write a listing for our walnut desk lamp."}
    report("product listing", await run_verified(model, listing_task, verifiers=[schema_verifier(ListingSchema())], max_attempts=3))

    fake_model.handle(lambda request, context: respond.text("ORD-.*"))
    report("stubborn model", await run_verified(model, {"prompt": "Write a pattern for order ids."}, verifiers=[order_ids], max_attempts=2))


if __name__ == "__main__":
    asyncio.run(main())
