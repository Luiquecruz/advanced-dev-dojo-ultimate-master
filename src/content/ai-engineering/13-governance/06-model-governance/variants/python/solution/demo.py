import asyncio
from datetime import datetime, timezone

from dojo_ai.testing import fake_model, respond

from main import create_model_registry, generate_with_alias

DAY = 24 * 60 * 60 * 1000
GATE = {"minimums": {"support-golden": 0.85, "refusal-safety": 0.95}, "maxRegression": 0.02}
clock = {"time": int(datetime(2026, 10, 31, 12, tzinfo=timezone.utc).timestamp() * 1000)}


def date(days):
    moment = datetime.fromtimestamp((clock["time"] + days * DAY) / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def show(label, result):
    if result["promoted"]:
        previous = f" (previous {result['previous']})" if "previous" in result else ""
        print(f"{label}: promoted{previous}")
    else:
        print(f"{label}: blocked by {', '.join(result['reasons'])}")


def try_register(registry, version):
    try:
        registry.register(version)
    except ValueError as error:
        print(f"register refused: {error}")


async def ask(registry):
    response = await generate_with_alias(registry, "support-default", {"messages": [{"role": "user", "content": "Where is order A-1001?"}]}, lambda warning: print(f"  warning: {warning}"))
    print(f"  answered by {response['model']}: {response['text']}")


async def main():
    registry = create_model_registry(now=lambda: clock["time"], allowed_licenses=["commercial-api", "apache-2.0"])
    registry.register({"id": "acme-small-2026-05", "provider": "acme", "license": "commercial-api", "retiresAt": date(21), "replacement": "acme-small-2026-09"})
    registry.register({"id": "acme-small-2026-09", "provider": "acme", "license": "commercial-api"})
    registry.register({"id": "open-7b-2026-06", "provider": "self-hosted", "license": "apache-2.0"})
    try_register(registry, {"id": "acme-small-latest", "provider": "acme", "license": "commercial-api"})
    try_register(registry, {"id": "leaked-70b-2026-02", "provider": "unknown", "license": "research-only"})

    registry.record_eval("acme-small-2026-05", "support-golden", 0.9)
    registry.record_eval("acme-small-2026-05", "refusal-safety", 0.97)
    show("pin support-default to acme-small-2026-05", registry.promote("support-default", "acme-small-2026-05", GATE))

    fake_model.for_model("acme-small-2026-05").reply(respond.text("Order A-1001 left the warehouse this morning."))
    await ask(registry)

    registry.record_eval("open-7b-2026-06", "support-golden", 0.86)
    registry.record_eval("open-7b-2026-06", "refusal-safety", 0.96)
    show("try open-7b-2026-06", registry.promote("support-default", "open-7b-2026-06", GATE))

    registry.record_eval("acme-small-2026-09", "support-golden", 0.92)
    show("try acme-small-2026-09 before its safety eval", registry.promote("support-default", "acme-small-2026-09", GATE))
    registry.record_eval("acme-small-2026-09", "refusal-safety", 0.98)
    show("try acme-small-2026-09 with every eval", registry.promote("support-default", "acme-small-2026-09", GATE))

    fake_model.for_model("acme-small-2026-09").reply(respond.text("Order A-1001 is in transit and arrives Tuesday."))
    await ask(registry)

    print(f"incident: rollback to {registry.rollback('support-default')}")
    fake_model.for_model("acme-small-2026-05").reply(respond.text("Order A-1001 left the warehouse this morning."))
    await ask(registry)

    clock["time"] += 22 * DAY
    try:
        registry.resolve("support-default")
    except RuntimeError as error:
        print(f"22 days later: {error}")
    print(f"history: {' -> '.join(registry.history('support-default'))}")


if __name__ == "__main__":
    asyncio.run(main())
