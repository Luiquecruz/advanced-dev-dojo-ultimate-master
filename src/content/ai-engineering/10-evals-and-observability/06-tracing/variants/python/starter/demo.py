import asyncio
import itertools
import json

from dojo_ai import ModelError, create_model
from dojo_ai.testing import fake_model, respond

from main import create_tracer, summarize_trace, traced_model, traced_tool

PRICING = {"atlas-mini": {"inputPerMillion": 0.4, "outputPerMillion": 1.6}}


def print_tree(spans, parent_span_id, depth):
    children = sorted((span for span in spans if span.parent_span_id == parent_span_id), key=lambda span: span.start_ms)
    for span in children:
        attributes = span.attributes
        usage = "" if "gen_ai.usage.input_tokens" not in attributes else f" in={attributes['gen_ai.usage.input_tokens']} out={attributes['gen_ai.usage.output_tokens']}"
        failure = f" error.type={attributes['error.type']}" if span.status == "error" else ""
        duration = (span.start_ms if span.end_ms is None else span.end_ms) - span.start_ms
        print(f"{'  ' * (depth + 1)}{span.name} [{span.kind}, {span.status}, {duration} ms]{usage}{failure}")
        print_tree(spans, span.span_id, depth + 1)


def look_up_order(arguments, call_id=None):
    return {"orderId": arguments["orderId"], "status": "shipped"}


async def main():
    ticks = itertools.count(40, 40)
    tracer = create_tracer(now=lambda: next(ticks))
    fake_model.for_model("atlas-mini").reply(
        respond.tool_call("get_order", {"orderId": "A-1"}),
        respond.error(503),
        respond.text("Your order A-1 shipped yesterday and arrives Friday."),
    )

    root = tracer.start_span("invoke_agent support", attributes={"gen_ai.operation.name": "invoke_agent", "gen_ai.agent.name": "support"})
    model = traced_model(create_model("atlas-mini"), tracer, provider="atlas", parent=root)
    get_order = traced_tool({"name": "get_order", "description": "Look up an order by id", "execute": look_up_order}, tracer, parent=root)

    messages = [{"role": "user", "content": "Where is my order A-1? My email is ana@example.com."}]
    first = await model.generate({"messages": messages})
    messages.append({"role": "assistant", "content": first["text"], "toolCalls": first["toolCalls"]})
    for call in first["toolCalls"]:
        result = await get_order["execute"](json.loads(call["arguments"]), call["id"])
        messages.append({"role": "tool", "toolCallId": call["id"], "content": json.dumps(result, separators=(",", ":"))})
    try:
        await model.generate({"messages": messages})
    except ModelError:
        print("Second model call failed with 503; the agent retried once.")
    final = await model.generate({"messages": messages})
    root.end("ok")

    print(f"Answer: {final['text']}\n\nTrace {root.trace_id}")
    print_tree(tracer.spans, None, 0)
    summary = summarize_trace(tracer.spans, root.trace_id, PRICING)
    print(
        f"\nRollup: {summary['modelCalls']} model calls, {summary['toolCalls']} tool call, {summary['errors']} error, "
        f"{summary['inputTokens']}+{summary['outputTokens']} tokens, ${summary['costUsd']:.6f}, {summary['durationMs']} ms"
    )
    captured = "ana@example.com" in repr(tracer.spans)
    print(f"Prompt content in spans: {'yes' if captured else 'no (content capture is off by default)'}")


if __name__ == "__main__":
    asyncio.run(main())
