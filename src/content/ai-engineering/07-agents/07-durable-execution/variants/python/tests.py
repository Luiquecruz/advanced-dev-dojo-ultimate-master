import json
import math

from dojo_ai import create_model


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


class MemoryStore:
    """A checkpoint store that keeps JSON text per run id and records a copy of every save."""

    def __init__(self):
        self.data = {}
        self.saves = []

    def latest(self, run_id):
        return json.loads(self.data[run_id]) if run_id in self.data else None

    async def load(self, run_id):
        return self.latest(run_id)

    async def save(self, checkpoint):
        self.saves.append(json.loads(json.dumps(checkpoint)))
        self.data[checkpoint["runId"]] = json.dumps(checkpoint)


class CrashingStore:
    """Delegates to another store and raises instead of saving when `should_crash(checkpoint, save_number)` is true."""

    def __init__(self, inner, should_crash):
        self.inner = inner
        self.should_crash = should_crash
        self.save_number = 0

    async def load(self, run_id):
        return await self.inner.load(run_id)

    async def save(self, checkpoint):
        self.save_number += 1
        if self.should_crash(checkpoint, self.save_number):
            raise RuntimeError("simulated crash: the process died")
        await self.inner.save(checkpoint)


def payment_tools():
    ledger = {}

    def charge_once(arguments, context):
        if context["idempotencyKey"] not in ledger:
            ledger[context["idempotencyKey"]] = arguments["amount"]
        return {"charged": arguments["amount"], "receipt": f"r-{len(ledger)}"}

    charge = Spy(charge_once)
    tools = [{"name": "charge_card", "description": "Charge the customer card", "parameters": {"type": "object"}, "execute": charge}]
    return tools, charge, ledger


def tool_count(request):
    return len([message for message in request["messages"] if message["role"] == "tool"])


def has_tool_result(checkpoint):
    return any(message["role"] == "tool" for message in checkpoint["messages"])


def script_three_charges():
    fake_model.handle(lambda request, context: respond.tool_call("charge_card", {"amount": tool_count(request) + 1}) if tool_count(request) < 3 else respond.text("Charged 1, 2 and 3."))


@test("create_checkpoint_store saves atomically under the run id, loads what it saved, returns None for an unknown run and rejects unsafe run ids")
async def _():
    documents = {}
    store = mod.create_checkpoint_store(documents)
    assert await store.load("order-42") is None
    checkpoint = {"runId": "order-42", "status": "running", "messages": [{"role": "user", "content": "Charge it"}], "steps": 0, "answer": None}
    await store.save(checkpoint)
    assert list(documents) == ["order-42"]
    assert json.loads(documents["order-42"]) == checkpoint
    assert await store.load("order-42") == checkpoint
    await store.save({**checkpoint, "steps": 3})
    loaded = await store.load("order-42")
    assert loaded["steps"] == 3
    assert list(documents) == ["order-42"]

    checkpoint["messages"].append({"role": "assistant", "content": "not saved yet"})
    unsaved = await store.load("order-42")
    assert len(unsaved["messages"]) == 1
    broken = await capture_error(store.save({**checkpoint, "steps": 4, "answer": object()}))
    assert isinstance(broken, Exception)
    still_saved = await store.load("order-42")
    assert still_saved["steps"] == 3

    unsafe = await capture_error(store.save({**checkpoint, "runId": "../../app/secrets"}))
    assert isinstance(unsafe, Exception)
    assert "../../app/secrets" not in documents


@test("checkpoints the start, every model response and every tool result, and saves the tool call before running it")
async def _():
    store = MemoryStore()
    tools, charge, _ledger = payment_tools()
    seen_before_execute = []

    def check_checkpoint(arguments, context):
        saved = store.latest("order-1")
        last_message = saved["messages"][-1]
        seen_before_execute.append(last_message["role"] == "assistant" and any(context["idempotencyKey"].endswith(call["id"]) for call in last_message["toolCalls"]))
        return {"charged": arguments["amount"]}

    charge.implementation = check_checkpoint
    fake_model.reply(respond.tool_call("charge_card", {"amount": 30}), respond.text("Charged $30."))
    result = await mod.run_durable_agent(create_model(), run_id="order-1", task="Charge $30", tools=tools, store=store, max_steps=5)
    assert result == {"status": "done", "answer": "Charged $30.", "steps": 2, "resumed": False}
    assert seen_before_execute == [True]
    assert len(store.saves) >= 4
    assert store.saves[0]["messages"] == [{"role": "user", "content": "Charge $30"}]
    latest = store.latest("order-1")
    assert latest["status"] == "done"
    assert latest["answer"] == "Charged $30."
    assert latest["steps"] == 2
    assert charge.calls[0][1] == {"idempotencyKey": f"order-1:{fake_model.responses[0]['toolCalls'][0]['id']}"}


@test("after a crash during a model call, resuming continues from the checkpoint without repeating the completed charge")
async def _():
    store = MemoryStore()
    tools, charge, ledger = payment_tools()
    fake_model.reply(respond.tool_call("charge_card", {"amount": 30}), respond.error(500))
    crash = await capture_error(mod.run_durable_agent(create_model(), run_id="order-2", task="Charge $30", tools=tools, store=store, max_steps=5))
    assert isinstance(crash, Exception)
    assert len(charge.calls) == 1

    fake_model.reply(respond.text("Charged $30."))
    result = await mod.run_durable_agent(create_model(), run_id="order-2", task="Charge $30", tools=tools, store=store, max_steps=5)
    assert result == {"status": "done", "answer": "Charged $30.", "steps": 2, "resumed": True}
    assert len(charge.calls) == 1
    assert list(ledger.values()) == [30]
    assert tool_count(fake_model.requests[2]) == 1


@test("a crash after the side effect but before its checkpoint re-runs the call with the same idempotency key, so the card is charged once")
async def _():
    inner = MemoryStore()
    tools, charge, ledger = payment_tools()
    crashed = False

    def crash_on_first_tool_result(checkpoint, save_number):
        nonlocal crashed
        if not crashed and has_tool_result(checkpoint):
            crashed = True
            return True
        return False

    flaky = CrashingStore(inner, crash_on_first_tool_result)
    fake_model.reply(respond.tool_call("charge_card", {"amount": 75}), respond.text("Charged $75."))
    error = await capture_error(mod.run_durable_agent(create_model(), run_id="order-3", task="Charge $75", tools=tools, store=flaky, max_steps=5))
    assert isinstance(error, Exception)
    result = await mod.run_durable_agent(create_model(), run_id="order-3", task="Charge $75", tools=tools, store=flaky, max_steps=5)
    assert result["status"] == "done"
    assert result["resumed"] is True
    assert len(charge.calls) == 2
    keys = [call[1]["idempotencyKey"] for call in charge.calls]
    assert keys[0] == keys[1]
    assert keys[0] == f"order-3:{fake_model.responses[0]['toolCalls'][0]['id']}"
    assert list(ledger.values()) == [75]
    assert len(fake_model.requests) == 2


@test("a finished run returns its stored answer without calling the model, and another run id starts fresh")
async def _():
    store = MemoryStore()
    tools, _charge, _ledger = payment_tools()
    fake_model.reply(respond.text("Nothing to charge."))
    await mod.run_durable_agent(create_model(), run_id="order-4", task="Check order 4", tools=tools, store=store, max_steps=5)
    again = await mod.run_durable_agent(create_model(), run_id="order-4", task="Check order 4", tools=tools, store=store, max_steps=5)
    assert again == {"status": "done", "answer": "Nothing to charge.", "steps": 1, "resumed": True}
    assert len(fake_model.requests) == 1

    fake_model.reply(respond.text("Order 5 needs no charge."))
    other = await mod.run_durable_agent(create_model(), run_id="order-5", task="Check order 5", tools=tools, store=store, max_steps=5)
    assert other == {"status": "done", "answer": "Order 5 needs no charge.", "steps": 1, "resumed": False}
    assert fake_model.requests[1]["messages"] == [{"role": "user", "content": "Check order 5"}]


@test("works with the checkpoint store across separate runs, as after a process restart")
async def _():
    tools, _charge, ledger = payment_tools()
    script_three_charges()
    documents = {}
    crashed = False

    def crash_at_second_step(checkpoint, save_number):
        nonlocal crashed
        if not crashed and checkpoint["steps"] == 2:
            crashed = True
            return True
        return False

    flaky = CrashingStore(mod.create_checkpoint_store(documents), crash_at_second_step)
    error = await capture_error(mod.run_durable_agent(create_model(), run_id="invoice-9", task="Charge 1, 2, 3", tools=tools, store=flaky, max_steps=10))
    assert isinstance(error, Exception)
    restarted = await mod.run_durable_agent(create_model(), run_id="invoice-9", task="Charge 1, 2, 3", tools=tools, store=mod.create_checkpoint_store(documents), max_steps=10)
    assert restarted["status"] == "done"
    assert restarted["resumed"] is True
    assert list(ledger.values()) == [1, 2, 3]
    assert json.loads(documents["invoice-9"])["status"] == "done"


@test("across seeds, crashing at any save and resuming until done charges each amount exactly once")
async def _():
    async def scenario(seed):
        inner = MemoryStore()
        tools, charge, ledger = payment_tools()
        script_three_charges()
        crashes = 0
        attempt = 0
        while True:
            attempt += 1
            crash_at = ((seed * 7 + attempt * 3) % 6) + 1 if attempt <= 3 else math.inf
            store = CrashingStore(inner, lambda checkpoint, save_number, crash_at=crash_at: save_number == crash_at)
            try:
                result = await mod.run_durable_agent(create_model(), run_id=f"run-{seed}", task="Charge 1, 2, 3", tools=tools, store=store, max_steps=10)
            except Exception as error:
                assert "simulated crash" in str(error)
                crashes += 1
            else:
                assert result["status"] == "done"
                break
            assert attempt < 10
        assert sorted(ledger.values()) == [1, 2, 3]
        assert len(charge.calls) <= 3 + crashes
        assert inner.latest(f"run-{seed}")["status"] == "done"

    await for_each_seed(16, scenario)
