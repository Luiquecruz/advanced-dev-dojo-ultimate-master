import inspect
import json


async def execute(tool, arguments):
    try:
        result = tool["execute"](arguments)
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return f"Error: {error}"
    return result if isinstance(result, str) else json.dumps(result)


async def start_agent(model, task, tools, max_steps):
    # TODO: before running a tool whose "requiresApproval" is True (or returns True for the arguments), record it as pending instead;
    # TODO: after the batch, return {"status": "interrupted", "pending": ..., "state": ...} when anything is pending
    state = {"messages": [{"role": "user", "content": task}], "steps": 0, "pending": []}
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    while state["steps"] < max_steps:
        response = await model.generate({"messages": state["messages"], "tools": definitions})
        state["steps"] += 1
        state["messages"].append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            return {"status": "done", "answer": response["text"], "state": state}
        for call in response["toolCalls"]:
            tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
            content = await execute(tool, json.loads(call["arguments"])) if tool is not None else f'Error: unknown tool "{call["name"]}"'
            state["messages"].append({"role": "tool", "toolCallId": call["id"], "content": content})
    return {"status": "max_steps", "state": state}


async def resume_agent(model, saved_state, decisions, tools, max_steps):
    # TODO: require a decision for every pending call, apply approve / deny / edit as tool results, then continue the loop from the saved state
    raise NotImplementedError("Not implemented")
