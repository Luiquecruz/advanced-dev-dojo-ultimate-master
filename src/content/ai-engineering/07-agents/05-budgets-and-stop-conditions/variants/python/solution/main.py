import inspect
import json
import time

REFUSAL_REASONS = ("refusal", "content_filter")


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
    try:
        return f"{call['name']}:{json.dumps(json.loads(call['arguments']), sort_keys=True)}"
    except ValueError:
        return f"{call['name']}:{call['arguments']}"


async def run_budgeted_agent(model, task, tools, budget, now=system_clock, repeat_limit=3):
    started_at = now()
    messages = [{"role": "user", "content": task}]
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    usage = {"steps": 0, "inputTokens": 0, "outputTokens": 0, "totalTokens": 0, "costUsd": 0}
    last_signature = ""
    repeats = 0

    def finish(reason, detail, answer=None):
        return {"stop": {"reason": reason, "detail": detail}, "answer": answer, "usage": usage, "elapsedMs": now() - started_at, "messages": messages}

    while True:
        if usage["steps"] >= budget["maxSteps"]:
            return finish("max_steps", f"Reached the limit of {budget['maxSteps']} steps without a final answer.")
        max_duration_ms = budget.get("maxDurationMs")
        if max_duration_ms is not None and now() - started_at >= max_duration_ms:
            return finish("timeout", f"Ran for {now() - started_at} ms, at or above the {max_duration_ms} ms limit.")
        response = await model.generate({"messages": messages, "tools": definitions})
        usage["steps"] += 1
        usage["inputTokens"] += response["usage"]["inputTokens"]
        usage["outputTokens"] += response["usage"]["outputTokens"]
        usage["totalTokens"] += response["usage"]["totalTokens"]
        usage["costUsd"] += response["usage"]["cost"]
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})

        if response["finishReason"] in REFUSAL_REASONS:
            return finish("refused", f'The model stopped with finish reason "{response["finishReason"]}".')
        if not response["toolCalls"]:
            return finish("done", f"Final answer after {usage['steps']} steps.", response["text"])
        if budget.get("maxTokens") is not None and usage["totalTokens"] >= budget["maxTokens"]:
            return finish("max_tokens", f"Used {usage['totalTokens']} tokens of a {budget['maxTokens']}-token budget.")
        if budget.get("maxCostUsd") is not None and usage["costUsd"] >= budget["maxCostUsd"]:
            return finish("max_cost", f"Spent ${usage['costUsd']:.6f} of a ${budget['maxCostUsd']} budget.")
        for call in response["toolCalls"]:
            signature = call_signature(call)
            repeats = repeats + 1 if signature == last_signature else 1
            last_signature = signature
            if repeats >= repeat_limit:
                return finish("stuck", f"The model requested {call['name']} with the same arguments {repeats} times in a row.")
            messages.append({"role": "tool", "toolCallId": call["id"], "content": await execute_tool_call(tools, call)})
