import json
import re

from dojo_ai import create_model

SECRET = "card 4111 1111 1111 1111 belongs to Ana Souza"
CONTENT_KEYS = ["gen_ai.input.messages", "gen_ai.output.messages", "gen_ai.system_instructions", "gen_ai.tool.call.arguments", "gen_ai.tool.call.result"]


class Spy:
    """Records every call and delegates to the implementation."""

    def __init__(self, implementation):
        self.implementation = implementation
        self.calls = []

    def __call__(self, *arguments):
        self.calls.append(list(arguments))
        return self.implementation(*arguments)


def clock(start=1000, step=5):
    current = start - step

    def now():
        nonlocal current
        current += step
        return current

    return now


def lookup_tool():
    return {
        "name": "get_order",
        "description": "Look up an order by id",
        "execute": Spy(lambda arguments, call_id=None: {"orderId": arguments["orderId"], "status": "shipped", "note": SECRET}),
    }


def content_keys(span):
    return [key for key in span.attributes if key in CONTENT_KEYS]


@test("create_tracer gives root spans a new trace, children their parent trace and span id, and records each span once when it ends")
def _():
    tracer = mod.create_tracer(now=clock())
    root = tracer.start_span("invoke_agent support", attributes={"gen_ai.operation.name": "invoke_agent"})
    child = tracer.start_span("chat dojo-fake-1", parent=root, kind="client")
    grandchild = tracer.start_span("execute_tool get_order", parent=child)
    other = tracer.start_span("invoke_agent billing")
    assert re.fullmatch(r"[0-9a-f]{32}", root.trace_id)
    assert re.fullmatch(r"[0-9a-f]{16}", root.span_id)
    assert root.parent_span_id is None
    assert [child.trace_id, child.parent_span_id, child.kind, child.status, child.end_ms] == [root.trace_id, root.span_id, "client", "unset", None]
    assert [grandchild.trace_id, grandchild.parent_span_id, grandchild.kind] == [root.trace_id, child.span_id, "internal"]
    assert other.trace_id != root.trace_id
    assert len({root.span_id, child.span_id, grandchild.span_id, other.span_id}) == 4
    assert tracer.spans == []
    grandchild.end("ok")
    child.end()
    root.end("error")
    root.end("ok")
    assert [span.name for span in tracer.spans] == ["execute_tool get_order", "chat dojo-fake-1", "invoke_agent support"]
    assert [root.start_ms, root.end_ms, root.status] == [1000, 1030, "error"]
    assert child.status == "unset"
    assert root.attributes["gen_ai.operation.name"] == "invoke_agent"
    fixed_ids = mod.create_tracer(new_id=lambda size: "ab" * size).start_span("x")
    assert [fixed_ids.trace_id, fixed_ids.span_id] == ["ab" * 16, "ab" * 8]


@test("traced_model records one client span per call with the GenAI semantic convention attributes and usage")
async def _():
    tracer = mod.create_tracer(now=clock())
    root = tracer.start_span("invoke_agent support")
    model = mod.traced_model(create_model("atlas-mini"), tracer, provider="atlas", parent=root)
    assert model.name == "atlas-mini"
    fake_model.reply(respond.text("Your order shipped yesterday."))
    response = await model.generate({"messages": [{"role": "user", "content": f"Where is my order? {SECRET}"}], "maxTokens": 200, "temperature": 0.2})
    assert response["text"] == "Your order shipped yesterday."
    assert len(tracer.spans) == 1
    span = tracer.spans[0]
    assert [span.name, span.kind, span.status, span.trace_id, span.parent_span_id] == ["chat atlas-mini", "client", "ok", root.trace_id, root.span_id]
    assert span.attributes == {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "atlas",
        "gen_ai.request.model": "atlas-mini",
        "gen_ai.request.max_tokens": 200,
        "gen_ai.request.temperature": 0.2,
        "gen_ai.response.id": response["id"],
        "gen_ai.response.model": "atlas-mini",
        "gen_ai.response.finish_reasons": ["stop"],
        "gen_ai.usage.input_tokens": response["usage"]["inputTokens"],
        "gen_ai.usage.output_tokens": response["usage"]["outputTokens"],
    }
    assert span.end_ms > span.start_ms


@test("traced_model marks failed calls with error.type, ends the span and raises the same error")
async def _():
    for behavior, code in [(respond.error(429), "rate_limit"), (respond.error(503), "overloaded"), (respond.context_length(), "context_length")]:
        fake_model.reset().reply(behavior)
        tracer = mod.create_tracer()
        error = await capture_error(mod.traced_model(create_model(), tracer, provider="dojo").generate({"messages": [{"role": "user", "content": "hi"}]}))
        assert error.code == code
        assert len(tracer.spans) == 1
        span = tracer.spans[0]
        assert [span.name, span.status, span.parent_span_id] == ["chat dojo-fake-1", "error", None]
        assert span.attributes["error.type"] == code
        assert "gen_ai.usage.input_tokens" not in span.attributes


@test("traced_tool records one internal span per call with the tool attributes and the error type when it raises")
async def _():
    tracer = mod.create_tracer()
    root = tracer.start_span("invoke_agent support")
    tool = lookup_tool()
    traced = mod.traced_tool(tool, tracer, parent=root)
    assert traced["name"] == "get_order"
    result = await traced["execute"]({"orderId": "A-1"}, "call_7")
    assert [result["orderId"], result["status"]] == ["A-1", "shipped"]
    assert len(tool["execute"].calls) == 1

    def refuse(arguments, call_id=None):
        raise TypeError("amount must be a number")

    failing = mod.traced_tool({"name": "issue_refund", "description": "Refund an order", "execute": refuse}, tracer, parent=root)
    error = await capture_error(failing["execute"]({"amount": "ten"}))
    assert isinstance(error, TypeError)
    lookup, refund = tracer.spans
    assert [lookup.name, lookup.kind, lookup.status, lookup.trace_id, lookup.parent_span_id] == ["execute_tool get_order", "internal", "ok", root.trace_id, root.span_id]
    assert lookup.attributes == {
        "gen_ai.operation.name": "execute_tool",
        "gen_ai.tool.name": "get_order",
        "gen_ai.tool.description": "Look up an order by id",
        "gen_ai.tool.call.id": "call_7",
    }
    assert [refund.name, refund.status] == ["execute_tool issue_refund", "error"]
    assert refund.attributes["error.type"] == "TypeError"
    assert "gen_ai.tool.call.id" not in refund.attributes


@test("prompts, outputs, tool arguments and results stay out of the spans unless content capture is opted in")
async def _():
    async def scenario():
        fake_model.reply(respond.one_of([respond.text([f"Noted: {SECRET}", "Done."]), respond.tool_call("get_order", {"orderId": "A-1", "note": SECRET}), respond.refusal()]))
        tracer = mod.create_tracer()
        messages = [{"role": "system", "content": "You help customers."}, {"role": "user", "content": SECRET}]
        response = await mod.traced_model(create_model(), tracer, provider="dojo").generate({"messages": messages})
        await mod.traced_tool(lookup_tool(), tracer)["execute"]({"orderId": "A-1", "note": SECRET})
        recorded = repr(tracer.spans)
        assert "Ana Souza" not in recorded
        assert "You help customers" not in recorded
        for span in tracer.spans:
            assert content_keys(span) == []
        assert tracer.spans[0].attributes["gen_ai.response.finish_reasons"] == [response["finishReason"]]

    await for_each_seed(8, scenario)

    fake_model.reset().reply(respond.text("Your order shipped."))
    tracer = mod.create_tracer(capture_content=True)
    await mod.traced_model(create_model(), tracer, provider="dojo").generate({"messages": [{"role": "user", "content": SECRET}]})
    await mod.traced_tool(lookup_tool(), tracer)["execute"]({"orderId": "A-1"})
    chat, tool = tracer.spans
    assert json.loads(chat.attributes["gen_ai.input.messages"]) == [{"role": "user", "content": SECRET}]
    output_message = json.loads(chat.attributes["gen_ai.output.messages"])[0]
    assert [output_message["role"], output_message["content"]] == ["assistant", "Your order shipped."]
    assert json.loads(tool.attributes["gen_ai.tool.call.arguments"]) == {"orderId": "A-1"}
    tool_result = json.loads(tool.attributes["gen_ai.tool.call.result"])
    assert [tool_result["orderId"], tool_result["note"]] == ["A-1", SECRET]


@test("summarize_trace rolls up one trace: calls, errors, tokens, cost from the price table, duration and unpriced models")
async def _():
    fake_model.configure(pricing={"inputPerMillion": 3, "outputPerMillion": 15})
    fake_model.for_model("atlas-mini").reply(respond.tool_call("get_order", {"orderId": "A-1"}), respond.error(503), respond.text("Your order shipped yesterday."))
    fake_model.for_model("nimbus-mid").reply(respond.text("Summary: order A-1 shipped."))
    tracer = mod.create_tracer(now=clock(5000, 10))
    root = tracer.start_span("invoke_agent support")
    mini = mod.traced_model(create_model("atlas-mini"), tracer, provider="atlas", parent=root)
    mid = mod.traced_model(create_model("nimbus-mid"), tracer, provider="nimbus", parent=root)
    lookup = mod.traced_tool(lookup_tool(), tracer, parent=root)
    messages = [{"role": "user", "content": "Where is order A-1?"}]
    await mini.generate({"messages": messages})
    await lookup["execute"]({"orderId": "A-1"}, "call_1")
    await capture_error(mini.generate({"messages": messages}))
    await mini.generate({"messages": messages})
    await mid.generate({"messages": messages})
    root.end("ok")

    other_root = tracer.start_span("invoke_agent other")
    fake_model.for_model("atlas-mini").reply(respond.text("unrelated"))
    await mod.traced_model(create_model("atlas-mini"), tracer, provider="atlas", parent=other_root).generate({"messages": messages})
    other_root.end()

    pricing = {"atlas-mini": {"inputPerMillion": 3, "outputPerMillion": 15}}
    summary = mod.summarize_trace(tracer.spans, root.trace_id, pricing)
    responses = fake_model.responses[:3]
    assert [summary["traceId"], summary["spans"], summary["modelCalls"], summary["toolCalls"], summary["errors"], summary["unpricedModels"]] == [root.trace_id, 6, 4, 1, 1, ["nimbus-mid"]]
    assert summary["inputTokens"] == sum(response["usage"]["inputTokens"] for response in responses)
    assert summary["outputTokens"] == sum(response["usage"]["outputTokens"] for response in responses)
    priced_cost = sum(response["usage"]["cost"] for response in responses if response["model"] == "atlas-mini")
    assert summary["costUsd"] == approx(priced_cost, abs=1e-9)
    assert summary["durationMs"] == root.end_ms - root.start_ms

    fully_priced = mod.summarize_trace(tracer.spans, root.trace_id, {**pricing, "nimbus-mid": {"inputPerMillion": 3, "outputPerMillion": 15}})
    assert fully_priced["unpricedModels"] == []
    assert fully_priced["costUsd"] == approx(sum(response["usage"]["cost"] for response in responses), abs=1e-9)
    other = mod.summarize_trace(tracer.spans, other_root.trace_id, pricing)
    assert [other["spans"], other["modelCalls"], other["toolCalls"], other["errors"]] == [2, 1, 0, 0]
