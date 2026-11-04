import json


class ToolLoopLimitError(Exception):
    """Raised when the model still requests tools after the last allowed round."""

    def __init__(self, rounds):
        super().__init__(f"The model still requested tools after {rounds} rounds")
        self.rounds = rounds


def parse_tool_arguments(raw):
    # TODO: return {"ok": False, "error": ...} for text that is not JSON or not a JSON object (lists and null included)
    return {"ok": True, "value": json.loads(raw)}


async def execute_tool_call(call, tools):
    # TODO: unknown tool, invalid arguments and a raising tool become {"role": "tool", "toolCallId": ..., "content": '{"error": "..."}'}
    tool = next(candidate for candidate in tools if candidate["name"] == call["name"])
    result = tool["execute"](json.loads(call["arguments"]))
    return {"role": "tool", "toolCallId": call["id"], "content": str(result)}


async def run_with_tools(model, messages, tools, max_rounds=5):
    # TODO: offer the tool definitions, execute every requested call, append the assistant and tool messages and loop until a text answer, at most max_rounds model calls
    response = await model.generate({"messages": messages, "tools": tools})
    return {"text": response["text"], "messages": [*messages, {"role": "assistant", "content": response["text"]}], "rounds": 1}
