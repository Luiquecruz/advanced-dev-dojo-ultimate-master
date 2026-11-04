import inspect
import json

REFUSAL_REASONS = ("refusal", "content_filter")


def parse_arguments(raw):
    try:
        value = json.loads(raw)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


async def execute_tool_call(tools, call):
    tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
    if tool is None:
        available = ", ".join(candidate["name"] for candidate in tools)
        return {"result": f'Error: unknown tool "{call["name"]}". Available tools: {available}', "ok": False}
    arguments = parse_arguments(call["arguments"])
    if arguments is None:
        return {"result": f'Error: the arguments for "{call["name"]}" are not a JSON object', "ok": False}
    try:
        result = tool["execute"](arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return {"result": f"Error: {error}", "ok": False}
    return {"result": result if isinstance(result, str) else json.dumps(result, separators=(",", ":")), "ok": True}


async def run_agent(model, *, task, tools, max_steps, on_event=None):
    """The agent loop: reports every model response and tool call to `on_event` and returns `{"status", "answer"}`."""
    messages = [{"role": "user", "content": task}]
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    for _ in range(max_steps):
        response = await model.generate({"messages": messages, "tools": definitions})
        if on_event is not None:
            on_event({"type": "model", "response": response})
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if response["finishReason"] in REFUSAL_REASONS:
            return {"status": "refused", "answer": None}
        if not response["toolCalls"]:
            return {"status": "done", "answer": response["text"]}
        for call in response["toolCalls"]:
            outcome = await execute_tool_call(tools, call)
            if on_event is not None:
                on_event({"type": "tool", "call": call, "result": outcome["result"], "ok": outcome["ok"]})
            messages.append({"role": "tool", "toolCallId": call["id"], "content": outcome["result"]})
    return {"status": "max_steps", "answer": None}


async def record_trajectory(model, *, task, tools, max_steps):
    # TODO: run the agent with an on_event callback that records one step per model response and per tool call
    run = await run_agent(model, task=task, tools=tools, max_steps=max_steps)
    return {"task": task, "status": run["status"], "answer": run["answer"], "steps": []}


def evaluate_trajectory(trajectory, spec):
    # TODO: compute the metrics and report every violation: not_done, missing_tool, forbidden_tool, order, forbidden_call and the limits
    violations = []
    if trajectory["status"] != "done":
        violations.append({"rule": "not_done", "detail": f"status {trajectory['status']}"})
    return {"pass": not violations, "violations": violations, "metrics": {"modelCalls": 0, "toolCalls": 0, "inputTokens": 0, "outputTokens": 0, "costUsd": 0}}


def evaluate_suite(cases):
    # TODO: evaluate every case, then compute the pass rate and count violations per rule
    raise NotImplementedError("evaluate_suite")
