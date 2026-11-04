import json
import math

from dojo_ai import create_model

MAX_STEPS = 8


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def bank_tools():
    lookup = Spy(lambda arguments: {"accountId": arguments["accountId"], "balance": 1200})
    transfer = Spy(lambda arguments: {"transferred": arguments["amount"], "to": arguments["to"]})
    close = Spy(lambda arguments: f"account {arguments['accountId']} closed")
    tools = [
        {"name": "lookup_account", "description": "Read an account balance", "parameters": {"type": "object"}, "execute": lookup},
        {
            "name": "transfer_money",
            "description": "Transfer money",
            "parameters": {"type": "object"},
            "execute": transfer,
            "requiresApproval": lambda arguments: arguments["amount"] > 100,
        },
        {"name": "close_account", "description": "Close an account", "parameters": {"type": "object"}, "execute": close, "requiresApproval": True},
    ]
    return tools, lookup, transfer, close


def round_trip(value):
    return json.loads(json.dumps(value))


def is_plain_json(value):
    if value is None or isinstance(value, (str, bool)):
        return True
    if isinstance(value, (int, float)):
        return math.isfinite(value)
    if isinstance(value, list):
        return all(is_plain_json(entry) for entry in value)
    if type(value) is dict:
        return all(isinstance(key, str) and is_plain_json(entry) for key, entry in value.items())
    return False


def tool_messages(messages):
    return [message for message in messages if message["role"] == "tool"]


@test("safe tools and calls below an approval threshold run without interrupting")
async def _():
    tools, lookup, transfer, _close = bank_tools()
    fake_model.reply(
        respond.tool_calls([
            {"name": "lookup_account", "arguments": {"accountId": "acc-1"}},
            {"name": "transfer_money", "arguments": {"to": "acc-2", "amount": 50}},
        ]),
        respond.text("Done: 50 transferred."),
    )
    run = await mod.start_agent(create_model(), task="Send 50 to acc-2", tools=tools, max_steps=MAX_STEPS)
    assert run["status"] == "done"
    assert run["answer"] == "Done: 50 transferred."
    assert len(lookup.calls) == 1
    assert [{"to": "acc-2", "amount": 50}] in transfer.calls
    assert run["state"]["pending"] == []


@test("a risky call interrupts before running and returns the pending call and a plain JSON state")
async def _():
    tools, _lookup, _transfer, close = bank_tools()
    fake_model.reply(respond.tool_call("close_account", {"accountId": "acc-9"}), respond.text("should not be requested yet"))
    run = await mod.start_agent(create_model(), task="Close acc-9", tools=tools, max_steps=MAX_STEPS)
    call_id = fake_model.responses[0]["toolCalls"][0]["id"]
    assert run["status"] == "interrupted"
    assert run["pending"] == [{"toolCallId": call_id, "name": "close_account", "arguments": {"accountId": "acc-9"}}]
    assert run["state"]["pending"] == run["pending"]
    assert close.calls == []
    assert len(fake_model.requests) == 1
    assert is_plain_json(run["state"])
    assert round_trip(run["state"]) == run["state"]


@test("approve after a JSON round trip runs the call once with its original arguments and continues the loop")
async def _():
    first_tools, _first_lookup, _first_transfer, first_close = bank_tools()
    fake_model.reply(respond.tool_call("close_account", {"accountId": "acc-9"}), respond.text("acc-9 is closed."))
    interrupted = await mod.start_agent(create_model(), task="Close acc-9", tools=first_tools, max_steps=MAX_STEPS)
    saved = json.dumps(interrupted["state"])
    call_id = interrupted["pending"][0]["toolCallId"]

    restarted_tools, _restarted_lookup, _restarted_transfer, restarted_close = bank_tools()
    run = await mod.resume_agent(create_model(), json.loads(saved), {call_id: {"type": "approve"}}, tools=restarted_tools, max_steps=MAX_STEPS)
    assert first_close.calls == []
    assert restarted_close.calls == [[{"accountId": "acc-9"}]]
    assert run["status"] == "done"
    assert run["answer"] == "acc-9 is closed."
    assert tool_messages(fake_model.requests[1]["messages"]) == [{"role": "tool", "toolCallId": call_id, "content": "account acc-9 closed"}]
    assert run["state"]["pending"] == []


@test("deny never runs the tool and tells the model it was denied, with the reason")
async def _():
    tools, _lookup, transfer, _close = bank_tools()
    fake_model.reply(respond.tool_call("transfer_money", {"to": "acc-666", "amount": 5000}), respond.text("The transfer was not approved."))
    interrupted = await mod.start_agent(create_model(), task="Send 5000 to acc-666", tools=tools, max_steps=MAX_STEPS)
    call_id = interrupted["pending"][0]["toolCallId"]
    decisions = {call_id: {"type": "deny", "reason": "Recipient is not on the allowlist"}}
    run = await mod.resume_agent(create_model(), round_trip(interrupted["state"]), decisions, tools=tools, max_steps=MAX_STEPS)
    assert transfer.calls == []
    result = tool_messages(fake_model.requests[1]["messages"])[0]
    assert result["toolCallId"] == call_id
    assert result["content"].startswith("Denied")
    assert "Recipient is not on the allowlist" in result["content"]
    assert run["status"] == "done"


@test("edit runs the tool with the human arguments only, and the model sees the result")
async def _():
    tools, _lookup, transfer, _close = bank_tools()
    fake_model.reply(respond.tool_call("transfer_money", {"to": "acc-2", "amount": 5000}), respond.text("Transferred 500."))
    interrupted = await mod.start_agent(create_model(), task="Send money to acc-2", tools=tools, max_steps=MAX_STEPS)
    call_id = interrupted["pending"][0]["toolCallId"]
    decisions = {call_id: {"type": "edit", "arguments": {"to": "acc-2", "amount": 500}}}
    await mod.resume_agent(create_model(), round_trip(interrupted["state"]), decisions, tools=tools, max_steps=MAX_STEPS)
    assert transfer.calls == [[{"to": "acc-2", "amount": 500}]]
    result = tool_messages(fake_model.requests[1]["messages"])[0]
    assert result["toolCallId"] == call_id
    assert json.dumps({"transferred": 500, "to": "acc-2"}) in result["content"]


@test("in a mixed batch the safe call runs at once, the risky one waits, and after resuming every call id has exactly one result")
async def _():
    tools, lookup, _transfer, close = bank_tools()
    fake_model.reply(
        respond.tool_calls([
            {"name": "lookup_account", "arguments": {"accountId": "acc-3"}},
            {"name": "close_account", "arguments": {"accountId": "acc-3"}},
        ]),
        respond.text("Balance read and account closed."),
    )
    interrupted = await mod.start_agent(create_model(), task="Read and close acc-3", tools=tools, max_steps=MAX_STEPS)
    assert interrupted["status"] == "interrupted"
    assert len(lookup.calls) == 1
    assert close.calls == []
    assert [pending["name"] for pending in interrupted["pending"]] == ["close_account"]
    ids = [call["id"] for call in fake_model.responses[0]["toolCalls"]]
    decisions = {interrupted["pending"][0]["toolCallId"]: {"type": "approve"}}
    await mod.resume_agent(create_model(), round_trip(interrupted["state"]), decisions, tools=tools, max_steps=MAX_STEPS)
    assert len(lookup.calls) == 1
    assert len(close.calls) == 1
    assert [message["toolCallId"] for message in tool_messages(fake_model.requests[1]["messages"])] == ids


@test("resuming without a decision for every pending call raises and runs nothing")
async def _():
    tools, _lookup, transfer, close = bank_tools()
    fake_model.reply(
        respond.tool_calls([
            {"name": "close_account", "arguments": {"accountId": "acc-4"}},
            {"name": "transfer_money", "arguments": {"to": "acc-5", "amount": 900}},
        ])
    )
    interrupted = await mod.start_agent(create_model(), task="Move funds and close acc-4", tools=tools, max_steps=MAX_STEPS)
    assert len(interrupted["pending"]) == 2
    decisions = {interrupted["pending"][0]["toolCallId"]: {"type": "approve"}}
    error = await capture_error(mod.resume_agent(create_model(), round_trip(interrupted["state"]), decisions, tools=tools, max_steps=MAX_STEPS))
    assert isinstance(error, Exception)
    assert close.calls == []
    assert transfer.calls == []
    assert len(fake_model.requests) == 1


@test("across seeds, a risky tool runs only when a human approved or edited it, and every call gets exactly one result")
async def _():
    async def scenario():
        tools, _lookup, transfer, close = bank_tools()
        fake_model.handle(lambda request, context: respond.text("All done.") if len(tool_messages(request["messages"])) >= 4 else respond.one_of([
            respond.tool_call("lookup_account", {"accountId": "acc-1"}),
            respond.tool_call("transfer_money", {"to": "acc-2", "amount": 50}),
            respond.tool_call("transfer_money", {"to": "acc-2", "amount": 700}),
            respond.tool_call("close_account", {"accountId": "acc-1"}),
        ]))
        kinds = ["approve", "deny", "edit"]
        decided = 0
        allowed_risky = 0
        run = await mod.start_agent(create_model(), task="Tidy up the accounts", tools=tools, max_steps=12)
        while run["status"] == "interrupted":
            decisions = {}
            for pending in run["pending"]:
                kind = kinds[decided % len(kinds)]
                decided += 1
                decisions[pending["toolCallId"]] = {"type": "edit", "arguments": pending["arguments"]} if kind == "edit" else {"type": kind}
                if kind != "deny":
                    allowed_risky += 1
            run = await mod.resume_agent(create_model(), round_trip(run["state"]), decisions, tools=tools, max_steps=12)
        risky_runs = len(close.calls) + len([arguments for [arguments] in transfer.calls if arguments["amount"] > 100])
        assert risky_runs == allowed_risky
        call_ids = [call["id"] for message in run["state"]["messages"] for call in (message.get("toolCalls") or [])]
        result_ids = [message["toolCallId"] for message in tool_messages(run["state"]["messages"])]
        assert sorted(result_ids) == sorted(call_ids)
        assert run["status"] == "done"

    await for_each_seed(20, scenario)
