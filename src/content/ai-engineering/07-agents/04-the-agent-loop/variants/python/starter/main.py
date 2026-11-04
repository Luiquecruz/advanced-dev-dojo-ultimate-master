import inspect
import json


def to_definition(tool):
    return {"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]}


def serialize(result):
    return result if isinstance(result, str) else json.dumps(result)


async def execute_tool_call(tools, call):
    # TODO: never raise: return an "Error: ..." result for an unknown tool, arguments that are not a JSON object, or a tool that raises
    tool = next(candidate for candidate in tools if candidate["name"] == call["name"])
    result = tool["execute"](json.loads(call["arguments"]))
    if inspect.isawaitable(result):
        result = await result
    return serialize(result)


async def run_agent(model, task, tools, max_steps, system=None):
    # TODO: loop up to max_steps: call the model, append its turn, stop on a refusal or a final answer, otherwise run every tool call and append one tool message per call
    messages = [{"role": "user", "content": task}]
    response = await model.generate({"messages": messages, "tools": [to_definition(tool) for tool in tools]})
    return {"status": "done", "answer": response["text"], "steps": 1, "messages": messages}
