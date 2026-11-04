import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import create_memory_store, handle_trigger

FIXES = {
    "ci-failure:build-4812": "PATCH: round half up in cartTotal",
    "ci-failure:build-4813": "PATCH: await the queue before asserting",
}


def verify(output, event):
    if output == FIXES[event["key"]]:
        return {"passed": True, "feedback": ""}
    return {"passed": False, "feedback": f'npm test still fails after "{output}"'}


def describe(state):
    outcome = f"escalated ({state['escalationReason']})" if state["status"] == "escalated" else state["status"]
    print(f"  {state['key']}: {outcome} after {state['iterations']} iteration(s), {state['failures']} failure(s), ${state['spentUsd']:.6f}")


async def main():
    store = create_memory_store()
    escalations = []
    dependencies = {"model": create_model(), "store": store, "verify": verify, "escalate": escalations.append, "limits": {"maxFailures": 3, "budgetUsd": 0.05}}

    fake_model.for_model("dojo-fake-1").reply(
        respond.text("PATCH: truncate cents"),
        respond.error(503),
        respond.text("PATCH: round half up in cartTotal"),
        respond.text("PATCH: add a retry to the test"),
        respond.text("PATCH: add a retry to the test"),
        respond.text("PATCH: skip the test"),
    )

    print("trigger: CI build 4812 failed")
    describe(await handle_trigger({"key": "ci-failure:build-4812", "task": "Build 4812: cart total expects 30.00, got 29.99."}, **dependencies))

    print("trigger: the webhook for build 4812 is delivered again")
    calls_before = len(fake_model.requests)
    describe(await handle_trigger({"key": "ci-failure:build-4812", "task": "Build 4812: cart total expects 30.00, got 29.99."}, **dependencies))
    print(f"  model calls for the duplicate: {len(fake_model.requests) - calls_before}")

    print("trigger: CI build 4813 failed")
    describe(await handle_trigger({"key": "ci-failure:build-4813", "task": "Build 4813: queue test is flaky."}, **dependencies))

    for escalation in escalations:
        print(f"escalated to the owner: {escalation['key']} ({escalation['reason']}), last feedback: {escalation['state']['lastFeedback']}")


if __name__ == "__main__":
    asyncio.run(main())
