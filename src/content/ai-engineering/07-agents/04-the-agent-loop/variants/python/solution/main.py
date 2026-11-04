import inspect
import json

REFUSAL_REASONS = ("refusal", "content_filter")


def to_definition(tool):
    return {"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]}


def serialize(result):
    return result if isinstance(result, str) else json.dumps(result)


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
        return f'Error: the arguments for "{call["name"]}" are not a valid JSON object. Call the tool again with valid JSON.'
    try:
        result = tool["execute"](arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return f"Error: {error}"
    return serialize(result)


async def run_agent(model, task, tools, max_steps, system=None):
    messages = [] if system is None else [{"role": "system", "content": system}]
    messages.append({"role": "user", "content": task})
    definitions = [to_definition(tool) for tool in tools]
    for step in range(1, max_steps + 1):
        response = await model.generate({"messages": messages, "tools": definitions})
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if response["finishReason"] in REFUSAL_REASONS:
            return {"status": "refused", "answer": None, "steps": step, "messages": messages}
        if not response["toolCalls"]:
            return {"status": "done", "answer": response["text"], "steps": step, "messages": messages}
        for call in response["toolCalls"]:
            messages.append({"role": "tool", "toolCallId": call["id"], "content": await execute_tool_call(tools, call)})
    return {"status": "max_steps", "answer": None, "steps": max_steps, "messages": messages}
