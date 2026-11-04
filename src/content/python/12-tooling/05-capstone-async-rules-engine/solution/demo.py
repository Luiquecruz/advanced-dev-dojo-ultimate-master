import asyncio

from adr import PLAN
from main import Decision, Engine


class Velocity:
    name = "velocity"

    async def evaluate(self, event):
        await asyncio.sleep(0)
        return event["amount"] > 900


class Geo:
    name = "geo"

    async def evaluate(self, event):
        await asyncio.sleep(0)
        return event["country"] not in {"BR", "PT", "US"}


class FeatureStore:
    """Fails on every fourth event, like a flaky feature-store call."""

    name = "device-history"

    async def evaluate(self, event):
        await asyncio.sleep(0)
        if event["sequence"] % 4 == 3:
            raise ConnectionError("feature store timed out")
        return False


class SlowReport:
    """A rule that sometimes takes far longer than the deadline."""

    name = "slow-report"

    async def evaluate(self, event):
        await asyncio.sleep(1.0 if event["sequence"] == 5 else 0)
        return False


class Sanctions:
    name = "sanctions"

    def check(self, event):
        if event["country"] == "??":
            raise ValueError("unknown country code")
        return event["customer"] in {"c-402"}


async def pool(function, event):
    """Stands in for loop.run_in_executor(process_pool, function, event)."""
    await asyncio.sleep(0)
    return function(event)


def failures(decision: Decision) -> list[str]:
    found: list[str] = []
    if decision.errors is None:
        return found
    try:
        raise decision.errors
    except* ConnectionError as transient:
        found += [f"transient ({', '.join(error.__notes__)})" for error in transient.exceptions]
    except* Exception as defects:
        found += [f"defect ({', '.join(error.__notes__)})" for error in defects.exceptions]
    return found


async def main():
    concurrency = PLAN["concurrency"]
    print(
        f"plan: {PLAN['deployment']['workers']} workers x {PLAN['deployment']['events_per_worker']} events/s, "
        f"per-event limit {concurrency['per_event_limit']}, global limit {concurrency['global_limit']}, "
        f"queue {concurrency['queue_maxsize']}, deadline {PLAN['deadline']['per_event_ms']} ms"
    )
    decisions: list[Decision] = []
    engine = Engine(
        [Velocity(), Geo(), FeatureStore(), SlowReport(), Sanctions()],
        queue_maxsize=concurrency["queue_maxsize"],
        workers=4,
        per_event_limit=concurrency["per_event_limit"],
        global_limit=concurrency["global_limit"],
        deadline_s=PLAN["deadline"]["per_event_ms"] / 1000,
        offload=pool,
        on_decision=decisions.append,
    )
    await engine.start()
    countries = ["BR", "US", "KP", "PT", "??", "BR", "US", "PT"]
    for sequence, country in enumerate(countries):
        await engine.submit(
            {"id": f"evt-{sequence}", "sequence": sequence, "amount": 300 * sequence, "country": country, "customer": f"c-{400 + sequence}"}
        )
    drained = await engine.shutdown(PLAN["shutdown_deadline_s"])
    for decision in sorted(decisions, key=lambda decision: decision.event_id):
        verdict = ", ".join(decision.flags) or "clean"
        late = " [timed out]" if decision.timed_out else ""
        problems = "; ".join(failures(decision))
        print(f"{decision.event_id}: {verdict}{late}" + (f" | {problems}" if problems else ""))
    print(f"decided during the drain: {drained} of {len(decisions)}")


asyncio.run(main())
