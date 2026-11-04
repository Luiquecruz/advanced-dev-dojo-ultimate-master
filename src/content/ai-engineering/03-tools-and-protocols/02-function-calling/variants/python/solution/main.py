import inspect
import json


class ToolLoopLimitError(Exception):
    """Raised when the model still requests tools after the last allowed round."""

    def __init__(self, rounds):
        super().__init__(f"The model still requested tools after {rounds} rounds")
        self.rounds = rounds


def parse_tool_arguments(raw):
    try:
        value = json.loads(raw)
    except ValueError:
        return {"ok": False, "error": "Arguments are not valid JSON"}
    if not isinstance(value, dict):
        return {"ok": False, "error": "Arguments must be a JSON object"}
    return {"ok": True, "value": value}


def tool_message(call, content):
    return {"role": "tool", "toolCallId": call["id"], "content": content}


def error_message(call, error):
    return tool_message(call, json.dumps({"error": error}))


async def execute_tool_call(call, tools):
    tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
    if tool is None:
        available = ", ".join(candidate["name"] for candidate in tools)
        return error_message(call, f'Unknown tool "{call["name"]}". Available tools: {available}.')
    parsed = parse_tool_arguments(call["arguments"])
    if not parsed["ok"]:
        return error_message(call, f'Invalid arguments for "{call["name"]}": {parsed["error"]}. Call it again with a JSON object.')
    try:
        result = tool["execute"](parsed["value"])
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return error_message(call, f'"{call["name"]}" failed: {error}')
    return tool_message(call, result if isinstance(result, str) else json.dumps(result))


def definition_of(tool):
    return {"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]}


async def run_with_tools(model, messages, tools, max_rounds=5):
    transcript = list(messages)
    definitions = [definition_of(tool) for tool in tools]
    for round_number in range(1, max_rounds + 1):
        response = await model.generate({"messages": list(transcript), "tools": definitions})
        if not response["toolCalls"]:
            transcript.append({"role": "assistant", "content": response["text"]})
            return {"text": response["text"], "messages": transcript, "rounds": round_number}
        if round_number == max_rounds:
            raise ToolLoopLimitError(round_number)
        transcript.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        for call in response["toolCalls"]:
            transcript.append(await execute_tool_call(call, tools))
    raise ToolLoopLimitError(max_rounds)
