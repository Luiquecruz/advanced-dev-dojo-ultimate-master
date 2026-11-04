import inspect
import json


def parse_arguments(raw):
    try:
        parsed = json.loads(raw)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


async def execute(tool, arguments):
    try:
        result = tool["execute"](arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return f"Error: {error}"
    return result if isinstance(result, str) else json.dumps(result)


def needs_approval(tool, arguments):
    requires_approval = tool.get("requiresApproval")
    return requires_approval(arguments) if callable(requires_approval) else requires_approval is True


def find_tool(tools, name):
    tool = next((candidate for candidate in tools if candidate["name"] == name), None)
    if tool is None:
        raise LookupError(f'Tool "{name}" is not available to resume this run')
    return tool


async def handle_tool_call(tools, call, state):
    tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
    arguments = parse_arguments(call["arguments"])
    if tool is None:
        available = ", ".join(candidate["name"] for candidate in tools)
        state["messages"].append({"role": "tool", "toolCallId": call["id"], "content": f'Error: unknown tool "{call["name"]}". Available tools: {available}.'})
    elif arguments is None:
        state["messages"].append({"role": "tool", "toolCallId": call["id"], "content": f'Error: the arguments for "{call["name"]}" are not a valid JSON object.'})
    elif needs_approval(tool, arguments):
        state["pending"].append({"toolCallId": call["id"], "name": call["name"], "arguments": arguments})
    else:
        state["messages"].append({"role": "tool", "toolCallId": call["id"], "content": await execute(tool, arguments)})


async def continue_run(model, tools, max_steps, state):
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    while state["steps"] < max_steps:
        response = await model.generate({"messages": state["messages"], "tools": definitions})
        state["steps"] += 1
        state["messages"].append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            return {"status": "done", "answer": response["text"], "state": state}
        for call in response["toolCalls"]:
            await handle_tool_call(tools, call, state)
        if state["pending"]:
            return {"status": "interrupted", "pending": state["pending"], "state": state}
    return {"status": "max_steps", "state": state}


async def start_agent(model, task, tools, max_steps):
    return await continue_run(model, tools, max_steps, {"messages": [{"role": "user", "content": task}], "steps": 0, "pending": []})


async def apply_decision(tool, pending, decision):
    if decision["type"] == "deny":
        return f"Denied by a human reviewer: {decision.get('reason') or 'no reason given'}"
    if decision["type"] == "edit":
        return f"A human edited the arguments to {json.dumps(decision['arguments'])}. Result: {await execute(tool, decision['arguments'])}"
    return await execute(tool, pending["arguments"])


async def resume_agent(model, saved_state, decisions, tools, max_steps):
    state = json.loads(json.dumps(saved_state))
    missing = [pending["toolCallId"] for pending in state["pending"] if pending["toolCallId"] not in decisions]
    if missing:
        raise ValueError(f"Missing a decision for tool calls: {', '.join(missing)}")
    for pending in state["pending"]:
        content = await apply_decision(find_tool(tools, pending["name"]), pending, decisions[pending["toolCallId"]])
        state["messages"].append({"role": "tool", "toolCallId": pending["toolCallId"], "content": content})
    state["pending"] = []
    return await continue_run(model, tools, max_steps, state)
