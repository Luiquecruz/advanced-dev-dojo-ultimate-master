import json

from dojo_ai import create_model

EVENT = {"key": "ci-failure:build-4812", "task": "CI build 4812 failed: cart total test expects 30.00 but got 29.99. Produce a patch."}
LIMITS = {"maxFailures": 3, "budgetUsd": 1}


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


class RecordingStore:
    """The lesson's memory store, plus a copy of every saved state."""

    def __init__(self):
        self.store = mod.create_memory_store()
        self.saves = []

    async def load(self, key):
        return await self.store.load(key)

    async def save(self, key, state):
        self.saves.append({"key": key, "state": json.loads(json.dumps(state))})
        await self.store.save(key, state)


def patch_verifier(good_patch="PATCH: round half up"):
    def verify(output, event):
        if output == good_patch:
            return {"passed": True, "feedback": ""}
        return {"passed": False, "feedback": f'tests still fail for "{output}"'}

    return Spy(verify)


async def nothing(escalation):
    return None


def deps(**extra):
    return {"model": create_model(), "store": RecordingStore(), "verify": patch_verifier(), "escalate": Spy(nothing), "limits": LIMITS, **extra}


def user_contents():
    return [next(message for message in request["messages"] if message["role"] == "user")["content"] for request in fake_model.requests]


def total_cost():
    return sum(response["usage"]["cost"] for response in fake_model.responses)


@test("stop_reason applies done, stuck, failures and budget in that order")
def _():
    limits = {"maxFailures": 3, "budgetUsd": 0.5}
    assert mod.stop_reason({"passed": True, "stuck": True, "failures": 9, "spentUsd": 9}, limits) == "done"
    assert mod.stop_reason({"passed": False, "stuck": True, "failures": 9, "spentUsd": 9}, limits) == "stuck"
    assert mod.stop_reason({"passed": False, "stuck": False, "failures": 3, "spentUsd": 9}, limits) == "failures"
    assert mod.stop_reason({"passed": False, "stuck": False, "failures": 2, "spentUsd": 0.5}, limits) == "budget"
    assert mod.stop_reason({"passed": False, "stuck": False, "failures": 2, "spentUsd": 0.49}, limits) is None


@test("acts, verifies and feeds the last feedback into the next iteration until the verifier passes")
async def _():
    fake_model.reply(respond.text("PATCH: truncate"), respond.text("PATCH: use floats"), respond.text("PATCH: round half up"))
    dependencies = deps()
    state = await mod.handle_trigger(EVENT, **dependencies)
    assert state == {
        "key": EVENT["key"],
        "status": "done",
        "iterations": 3,
        "failures": 2,
        "spentUsd": state["spentUsd"],
        "lastOutput": "PATCH: round half up",
        "lastFeedback": 'tests still fail for "PATCH: use floats"',
        "escalationReason": None,
    }
    assert state["spentUsd"] == approx(total_cost(), abs=1e-12)
    assert fake_model.requests[0]["messages"] == [
        {"role": "system", "content": mod.LOOP_SYSTEM},
        {"role": "user", "content": EVENT["task"]},
    ]
    contents = user_contents()
    assert all(EVENT["task"] in content for content in contents)
    assert 'tests still fail for "PATCH: truncate"' in contents[1]
    assert 'tests still fail for "PATCH: use floats"' in contents[2]
    assert dependencies["verify"].calls == [
        ["PATCH: truncate", EVENT],
        ["PATCH: use floats", EVENT],
        ["PATCH: round half up", EVENT],
    ]
    assert [[save["state"]["iterations"], save["state"]["status"]] for save in dependencies["store"].saves] == [[1, "running"], [2, "running"], [3, "done"]]
    assert dependencies["escalate"].calls == []


@test("escalates once after maxFailures failed iterations, and earlier when the output repeats")
async def _():
    fake_model.reply(respond.text("PATCH: a"), respond.text("PATCH: b"), respond.text("PATCH: c"), respond.text("PATCH: round half up"))
    failing = deps()
    state = await mod.handle_trigger(EVENT, **failing)
    assert [state["status"], state["escalationReason"], state["iterations"], state["failures"]] == ["escalated", "failures", 3, 3]
    assert len(fake_model.requests) == 3
    assert len(failing["escalate"].calls) == 1
    escalation = failing["escalate"].calls[0][0]
    assert [escalation["key"], escalation["reason"], escalation["state"]["status"], escalation["state"]["lastOutput"]] == [EVENT["key"], "failures", "escalated", "PATCH: c"]
    assert failing["store"].saves[-1]["state"] == escalation["state"]

    fake_model.reset().reply(respond.text("PATCH: a"), respond.text("PATCH: a"), respond.text("PATCH: round half up"))
    repeating = deps(limits={"maxFailures": 5, "budgetUsd": 1})
    stuck = await mod.handle_trigger(EVENT, **repeating)
    assert [stuck["status"], stuck["escalationReason"], stuck["iterations"]] == ["escalated", "stuck", 2]
    assert repeating["escalate"].calls[0][0]["reason"] == "stuck"


@test("stops on budget using the cost the provider reported")
async def _():
    fake_model.configure(pricing={"inputPerMillion": 20000, "outputPerMillion": 20000})
    attempts = []

    def next_patch(request, context):
        attempts.append(request)
        return respond.text(f"PATCH: attempt {len(attempts)}")

    fake_model.handle(next_patch)
    costly = deps(verify=Spy(lambda output, event: {"passed": False, "feedback": f"failed after {len(fake_model.requests)} calls"}), limits={"maxFailures": 50, "budgetUsd": 4})
    state = await mod.handle_trigger(EVENT, **costly)
    costs = [response["usage"]["cost"] for response in fake_model.responses]
    total = sum(costs)
    assert [state["status"], state["escalationReason"]] == ["escalated", "budget"]
    assert state["spentUsd"] == approx(total, abs=1e-9)
    assert total >= 4
    assert total - costs[-1] < 4
    assert state["iterations"] == len(costs)


@test("a model outage counts as a failed iteration without spending or changing the last output")
async def _():
    fake_model.reply(respond.text("PATCH: truncate"), respond.error(503), respond.error(429, retry_after_ms=5), respond.text("PATCH: round half up"))
    dependencies = deps(limits={"maxFailures": 4, "budgetUsd": 1})
    state = await mod.handle_trigger(EVENT, **dependencies)
    assert [state["status"], state["iterations"], state["failures"]] == ["done", 4, 3]
    assert len(dependencies["verify"].calls) == 2
    second = dependencies["store"].saves[1]["state"]
    assert [second["lastOutput"], second["iterations"], second["failures"]] == ["PATCH: truncate", 2, 2]
    assert "overloaded" in second["lastFeedback"]
    assert second["spentUsd"] == approx(fake_model.responses[0]["usage"]["cost"], abs=1e-12)
    assert "rate_limit" in user_contents()[3]


@test("resumes a crashed run from the saved state and never re-runs a finished key")
async def _():
    store = RecordingStore()
    fake_model.reply(respond.text("PATCH: truncate"), respond.text("PATCH: use floats"))
    verify_calls = []

    def crashing_verify(output, event):
        verify_calls.append(output)
        if len(verify_calls) == 2:
            raise RuntimeError("worker killed")
        return {"passed": False, "feedback": f'tests still fail for "{output}"'}

    crash = await capture_error(mod.handle_trigger(EVENT, **deps(store=store, verify=crashing_verify)))
    assert str(crash) == "worker killed"
    saved = await store.load(EVENT["key"])
    assert [saved["status"], saved["iterations"], saved["failures"], saved["lastOutput"]] == ["running", 1, 1, "PATCH: truncate"]

    fake_model.reply(respond.text("PATCH: round half up"))
    resumed = await mod.handle_trigger(EVENT, **deps(store=store))
    assert [resumed["status"], resumed["iterations"], resumed["failures"]] == ["done", 2, 1]
    assert resumed["spentUsd"] == approx(saved["spentUsd"] + fake_model.responses[2]["usage"]["cost"], abs=1e-12)
    assert 'tests still fail for "PATCH: truncate"' in user_contents()[2]

    requests_before = len(fake_model.requests)
    saves_before = len(store.saves)
    duplicate = deps(store=store)
    assert await mod.handle_trigger(EVENT, **duplicate) == resumed
    assert len(fake_model.requests) == requests_before
    assert len(store.saves) == saves_before
    assert duplicate["escalate"].calls == []

    fake_model.reply(respond.text("PATCH: a"))
    escalated_store = RecordingStore()
    await escalated_store.save("nightly:flaky-tests", {"key": "nightly:flaky-tests", "status": "escalated", "iterations": 3, "failures": 3, "spentUsd": 0.2, "lastOutput": "x", "lastFeedback": "y", "escalationReason": "failures"})
    again = deps(store=escalated_store)
    finished = await mod.handle_trigger({"key": "nightly:flaky-tests", "task": "Fix flaky tests"}, **again)
    assert finished["status"] == "escalated"
    assert again["escalate"].calls == []
    assert fake_model.pending == 1


@test("keeps its invariants across every mix of answers and outages")
async def _():
    async def scenario():
        fake_model.handle(
            lambda request, context: respond.one_of([
                respond.text("PATCH: round half up"),
                respond.text("PATCH: truncate"),
                respond.text(["PATCH: use floats", "PATCH: use cents"]),
                respond.error(500),
            ])
        )
        dependencies = deps()
        state = await mod.handle_trigger(EVENT, **dependencies)
        assert state["status"] in ["done", "escalated"]
        assert state["iterations"] == len(fake_model.requests)
        assert state["failures"] <= LIMITS["maxFailures"]
        assert state["spentUsd"] == approx(total_cost(), abs=1e-12)
        assert len(dependencies["store"].saves) == state["iterations"]
        assert len(dependencies["escalate"].calls) == (1 if state["status"] == "escalated" else 0)
        if state["status"] == "done":
            assert state["lastOutput"] == "PATCH: round half up"
        else:
            assert state["escalationReason"] in ["failures", "stuck"]

    await for_each_seed(20, scenario)
