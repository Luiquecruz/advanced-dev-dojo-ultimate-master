import inspect
import json
import time


def system_clock():
    return time.time_ns() // 1_000_000


def parse_arguments(raw):
    try:
        parsed = json.loads(raw)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


async def execute_tool_call(tools, call):
    tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
    if tool is None:
        available = ", ".join(candidate["name"] for candidate in tools)
        return f'Error: unknown tool "{call["name"]}". Available tools: {available}.'
    arguments = parse_arguments(call["arguments"])
    if arguments is None:
        return f'Error: the arguments for "{call["name"]}" are not a valid JSON object.'
    try:
        result = tool["execute"](arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return f"Error: {error}"
    return result if isinstance(result, str) else json.dumps(result)


def call_signature(call):
    # TODO: parse the arguments and serialize them with sorted keys (at every level), so key order does not matter; fall back to the raw text when they do not parse
    return f"{call['name']}:{call['arguments']}"


async def run_budgeted_agent(model, task, tools, budget, now=system_clock, repeat_limit=3):
    # TODO: before each call check maxSteps and maxDurationMs (with the injected now); after each call add response["usage"] to the totals,
    # TODO: stop on refusal or a final answer, then on maxTokens or maxCostUsd, and stop as stuck when the same call repeats repeat_limit times in a row
    started_at = now()
    messages = [{"role": "user", "content": task}]
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    usage = {"steps": 0, "inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "costUsd": 0}
    for step in range(1, budget["maxSteps"] + 1):
        response = await model.generate({"messages": messages, "tools": definitions})
        usage["steps"] = step
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            return {"stop": {"reason": "done", "detail": "Final answer."}, "answer": response["text"], "usage": usage, "elapsedMs": now() - started_at, "messages": messages}
        for call in response["toolCalls"]:
            messages.append({"role": "tool", "toolCallId": call["id"], "content": await execute_tool_call(tools, call)})
    return {"stop": {"reason": "max_steps", "detail": "Step limit reached."}, "answer": None, "usage": usage, "elapsedMs": now() - started_at, "messages": messages}
