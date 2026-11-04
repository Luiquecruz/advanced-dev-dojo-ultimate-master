import json

from dojo_ai import create_model

ORDERS = {
    "A-1001": {"status": "shipped", "total": 120},
    "A-1002": {"status": "delivered", "total": 45},
}

QUESTION = [{"role": "user", "content": "Where is my order A-1001?"}]


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


async def look_up_order(arguments):
    order = ORDERS.get(arguments["orderId"])
    if order is None:
        raise LookupError(f"No order with id {arguments['orderId']}")
    return {"orderId": arguments["orderId"], **order}


def support_tools():
    get_order = Spy(look_up_order)
    get_policy = Spy(lambda arguments: "Refunds are accepted within 30 days of delivery.")
    tools = [
        {
            "name": "get_order",
            "description": "Look up an order by id.",
            "parameters": {"type": "object", "properties": {"orderId": {"type": "string"}}, "required": ["orderId"]},
            "execute": get_order,
        },
        {
            "name": "get_refund_policy",
            "description": "Return the refund policy text.",
            "parameters": {"type": "object", "properties": {}},
            "execute": get_policy,
        },
    ]
    return tools, get_order, get_policy


def error_of(message):
    parsed = json.loads(message["content"])
    assert isinstance(parsed["error"], str)
    return parsed["error"]


@test("parse_tool_arguments accepts a JSON object and rejects broken JSON, lists, null and primitives without raising")
async def _():
    assert mod.parse_tool_arguments('{"orderId":"A-1001","verbose":true}') == {"ok": True, "value": {"orderId": "A-1001", "verbose": True}}
    fake_model.reply(respond.invalid_tool_arguments("get_order"))
    broken = (await create_model().generate({"messages": QUESTION}))["toolCalls"][0]["arguments"]
    for raw in [broken, "[1, 2]", "null", '"A-1001"', "42", ""]:
        parsed = mod.parse_tool_arguments(raw)
        assert parsed["ok"] is False
        assert isinstance(parsed["error"], str)
        assert len(parsed["error"]) > 0


@test("execute_tool_call runs the matching tool with the parsed arguments and answers with a tool message tied to the call id")
async def _():
    tools, get_order, get_policy = support_tools()
    order_message = await mod.execute_tool_call({"id": "call_7", "name": "get_order", "arguments": '{"orderId":"A-1001"}'}, tools)
    assert get_order.calls == [[{"orderId": "A-1001"}]]
    assert order_message["role"] == "tool"
    assert order_message["toolCallId"] == "call_7"
    assert json.loads(order_message["content"]) == {"orderId": "A-1001", "status": "shipped", "total": 120}
    policy_message = await mod.execute_tool_call({"id": "call_8", "name": "get_refund_policy", "arguments": "{}"}, tools)
    assert len(get_policy.calls) == 1
    assert policy_message == {"role": "tool", "toolCallId": "call_8", "content": "Refunds are accepted within 30 days of delivery."}


@test("execute_tool_call turns an unknown tool, broken arguments and a failing tool into model-readable error messages instead of raising")
async def _():
    tools, get_order, _ = support_tools()
    unknown = await mod.execute_tool_call({"id": "call_1", "name": "delete_everything", "arguments": "{}"}, tools)
    assert unknown["role"] == "tool"
    assert unknown["toolCallId"] == "call_1"
    assert "delete_everything" in error_of(unknown)
    assert "get_order" in error_of(unknown)
    assert "get_refund_policy" in error_of(unknown)

    broken = await mod.execute_tool_call({"id": "call_2", "name": "get_order", "arguments": '{"orderId": '}, tools)
    assert broken["toolCallId"] == "call_2"
    assert "get_order" in error_of(broken)
    assert get_order.calls == []

    failing = await mod.execute_tool_call({"id": "call_3", "name": "get_order", "arguments": '{"orderId":"Z-9"}'}, tools)
    assert failing["toolCallId"] == "call_3"
    assert "No order with id Z-9" in error_of(failing)


@test("run_with_tools offers the tool definitions without their code, appends the assistant tool calls and the tool results, and returns the final answer")
async def _():
    tools, get_order, _ = support_tools()
    fake_model.reply(respond.tool_call("get_order", {"orderId": "A-1001"}), respond.text(["It has shipped.", "Order A-1001 is on its way."]))
    result = await mod.run_with_tools(create_model(), messages=QUESTION, tools=tools)

    first, second = fake_model.requests
    assert first["tools"] == [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    assert first["messages"] == QUESTION
    call = fake_model.responses[0]["toolCalls"][0]
    assert second["messages"] == [
        *QUESTION,
        {"role": "assistant", "content": "", "toolCalls": [call]},
        {"role": "tool", "toolCallId": call["id"], "content": json.dumps({"orderId": "A-1001", "status": "shipped", "total": 120})},
    ]
    assert len(get_order.calls) == 1
    assert result["text"] == fake_model.responses[1]["text"]
    assert result["rounds"] == 2
    assert result["messages"] == [*second["messages"], {"role": "assistant", "content": result["text"]}]
    assert len(QUESTION) == 1


@test("run_with_tools executes parallel tool calls in order, one tool message per call id")
async def _():
    tools, get_order, get_policy = support_tools()
    fake_model.reply(
        respond.tool_calls([
            {"name": "get_order", "arguments": {"orderId": "A-1002"}},
            {"name": "get_refund_policy"},
        ]),
        respond.text("Delivered, and you can still ask for a refund."),
    )
    await mod.run_with_tools(create_model(), messages=[{"role": "user", "content": "Can I return order A-1002?"}], tools=tools)
    calls = fake_model.responses[0]["toolCalls"]
    tool_messages = [message for message in fake_model.requests[1]["messages"] if message["role"] == "tool"]
    assert [message["toolCallId"] for message in tool_messages] == [call["id"] for call in calls]
    assert get_order.calls == [[{"orderId": "A-1002"}]]
    assert len(get_policy.calls) == 1
    assert len(fake_model.requests) == 2


@test("run_with_tools recovers from every malformed call: the model sees the error and the loop continues")
async def _():
    async def scenario():
        tools, _, _ = support_tools()
        fake_model.reply(
            respond.one_of([respond.invalid_tool_arguments("get_order"), respond.unknown_tool(), respond.unknown_tool("cancel_order"), respond.tool_call("get_order", {"orderId": "Z-9"})]),
            respond.tool_call("get_order", {"orderId": "A-1001"}),
            respond.text("Your order has shipped."),
        )
        result = await mod.run_with_tools(create_model(), messages=QUESTION, tools=tools)
        assert result["text"] == "Your order has shipped."
        assert result["rounds"] == 3
        first_tool_message = next(message for message in fake_model.requests[1]["messages"] if message["role"] == "tool")
        assert first_tool_message["toolCallId"] == fake_model.responses[0]["toolCalls"][0]["id"]
        assert len(error_of(first_tool_message)) > 10

    await for_each_seed(16, scenario)


@test("run_with_tools stops a model that never stops calling tools with a ToolLoopLimitError after max_rounds model calls")
async def _():
    tools, _, get_policy = support_tools()
    fake_model.handle(lambda request, context: respond.tool_call("get_refund_policy"))
    error = await capture_error(mod.run_with_tools(create_model(), messages=QUESTION, tools=tools, max_rounds=3))
    assert isinstance(error, mod.ToolLoopLimitError)
    assert error.rounds == 3
    assert len(fake_model.requests) == 3
    assert len(get_policy.calls) == 2

    fake_model.reset().handle(lambda request, context: respond.tool_call("get_refund_policy"))
    await capture_error(mod.run_with_tools(create_model(), messages=QUESTION, tools=tools))
    assert len(fake_model.requests) == 5
