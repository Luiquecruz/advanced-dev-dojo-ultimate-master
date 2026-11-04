import inspect
import json
import math

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
    steps = []

    def record(event):
        if event["type"] == "model":
            usage = event["response"]["usage"]
            steps.append({"type": "model", "inputTokens": usage["inputTokens"], "outputTokens": usage["outputTokens"], "costUsd": usage["cost"]})
        else:
            steps.append({"type": "tool", "name": event["call"]["name"], "arguments": parse_arguments(event["call"]["arguments"]), "ok": event["ok"]})

    run = await run_agent(model, task=task, tools=tools, max_steps=max_steps, on_event=record)
    return {"task": task, "status": run["status"], "answer": run["answer"], "steps": steps}


def measure(steps):
    metrics = {"modelCalls": 0, "toolCalls": 0, "inputTokens": 0, "outputTokens": 0, "costUsd": 0}
    for step in steps:
        if step["type"] == "model":
            metrics["modelCalls"] += 1
            metrics["inputTokens"] += step["inputTokens"]
            metrics["outputTokens"] += step["outputTokens"]
            metrics["costUsd"] += step["costUsd"]
        else:
            metrics["toolCalls"] += 1
    return metrics


def evaluate_trajectory(trajectory, spec):
    violations = []
    tool_steps = [{**step, "index": index} for index, step in enumerate(trajectory["steps"]) if step["type"] == "tool"]
    metrics = measure(trajectory["steps"])

    if spec.get("requireDone", True) and trajectory["status"] != "done":
        violations.append({"rule": "not_done", "detail": f'The run ended with status "{trajectory["status"]}" instead of "done"'})
    for tool in spec.get("requiredTools", []):
        if not any(step["name"] == tool and step["ok"] for step in tool_steps):
            violations.append({"rule": "missing_tool", "detail": f'Required tool "{tool}" was never called successfully'})
    for step in tool_steps:
        if step["name"] in spec.get("forbiddenTools", []):
            violations.append({"rule": "forbidden_tool", "detail": f'Forbidden tool "{step["name"]}" was called', "step": step["index"]})
    for before, after in spec.get("order", []):
        first_before = next((step["index"] for step in tool_steps if step["name"] == before and step["ok"]), math.inf)
        for step in tool_steps:
            if step["name"] == after and step["index"] < first_before:
                violations.append({"rule": "order", "detail": f'"{after}" was called before any successful "{before}"', "step": step["index"]})
    for forbidden in spec.get("forbiddenCalls", []):
        for step in tool_steps:
            if step["name"] == forbidden["tool"] and step["arguments"] is not None and forbidden["matches"](step["arguments"]):
                violations.append({"rule": "forbidden_call", "detail": f"{forbidden['tool']}: {forbidden['description']}", "step": step["index"]})
    if spec.get("maxModelCalls") is not None and metrics["modelCalls"] > spec["maxModelCalls"]:
        violations.append({"rule": "max_model_calls", "detail": f"{metrics['modelCalls']} model calls, limit {spec['maxModelCalls']}"})
    if spec.get("maxToolCalls") is not None and metrics["toolCalls"] > spec["maxToolCalls"]:
        violations.append({"rule": "max_tool_calls", "detail": f"{metrics['toolCalls']} tool calls, limit {spec['maxToolCalls']}"})
    if spec.get("maxCostUsd") is not None and metrics["costUsd"] > spec["maxCostUsd"]:
        violations.append({"rule": "max_cost", "detail": f"Cost ${metrics['costUsd']:.6f}, limit ${spec['maxCostUsd']}"})
    return {"pass": not violations, "violations": violations, "metrics": metrics}


def evaluate_suite(cases):
    results = []
    for suite_case in cases:
        evaluation = evaluate_trajectory(suite_case["trajectory"], suite_case["spec"])
        results.append({"id": suite_case["id"], "pass": evaluation["pass"], "violations": evaluation["violations"]})
    violations_by_rule = {}
    for result in results:
        for violation in result["violations"]:
            violations_by_rule[violation["rule"]] = violations_by_rule.get(violation["rule"], 0) + 1
    pass_rate = 0 if not results else sum(1 for result in results if result["pass"]) / len(results)
    return {"results": results, "passRate": pass_rate, "violationsByRule": violations_by_rule}
