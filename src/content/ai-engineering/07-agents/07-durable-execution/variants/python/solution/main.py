import inspect
import json
import re

RUN_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]+")


def checked_run_id(run_id):
    if not RUN_ID_PATTERN.fullmatch(run_id):
        raise ValueError(f'Invalid run id "{run_id}": use letters, digits, "-" and "_" only')
    return run_id


class CheckpointStore:
    """Keeps one checkpoint per run id as a JSON document in `documents`, a dict that outlives the store like a database."""

    def __init__(self, documents):
        self.documents = documents

    async def load(self, run_id):
        document = self.documents.get(checked_run_id(run_id))
        return None if document is None else json.loads(document)

    async def save(self, checkpoint):
        run_id = checked_run_id(checkpoint["runId"])
        document = json.dumps(checkpoint)
        self.documents[run_id] = document


def create_checkpoint_store(documents=None):
    return CheckpointStore({} if documents is None else documents)


def idempotency_key(run_id, tool_call_id):
    return f"{run_id}:{tool_call_id}"


def parse_arguments(raw):
    try:
        parsed = json.loads(raw)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


async def execute_tool_call(tools, call, run_id):
    tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
    if tool is None:
        return f'Error: unknown tool "{call["name"]}".'
    arguments = parse_arguments(call["arguments"])
    if arguments is None:
        return f'Error: the arguments for "{call["name"]}" are not a valid JSON object.'
    try:
        result = tool["execute"](arguments, {"idempotencyKey": idempotency_key(run_id, call["id"])})
        if inspect.isawaitable(result):
            result = await result
    except Exception as error:
        return f"Error: {error}"
    return result if isinstance(result, str) else json.dumps(result)


def unanswered_calls(messages):
    assistant_indexes = [index for index, message in enumerate(messages) if message["role"] == "assistant"]
    if not assistant_indexes:
        return []
    last_assistant_index = assistant_indexes[-1]
    answered = {message.get("toolCallId") for message in messages[last_assistant_index + 1:]}
    return [call for call in messages[last_assistant_index].get("toolCalls") or [] if call["id"] not in answered]


async def run_durable_agent(model, run_id, task, tools, store, max_steps):
    saved = await store.load(run_id)
    resumed = saved is not None
    checkpoint = saved if resumed else {"runId": run_id, "status": "running", "messages": [{"role": "user", "content": task}], "steps": 0, "answer": None}
    if not resumed:
        await store.save(checkpoint)
    if checkpoint["status"] == "done":
        return {"status": "done", "answer": checkpoint["answer"], "steps": checkpoint["steps"], "resumed": resumed}
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    while True:
        for call in unanswered_calls(checkpoint["messages"]):
            checkpoint["messages"].append({"role": "tool", "toolCallId": call["id"], "content": await execute_tool_call(tools, call, run_id)})
            await store.save(checkpoint)
        if checkpoint["steps"] >= max_steps:
            return {"status": "max_steps", "answer": None, "steps": checkpoint["steps"], "resumed": resumed}
        response = await model.generate({"messages": checkpoint["messages"], "tools": definitions})
        checkpoint["steps"] += 1
        checkpoint["messages"].append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            checkpoint["status"] = "done"
            checkpoint["answer"] = response["text"]
        await store.save(checkpoint)
        if checkpoint["status"] == "done":
            return {"status": "done", "answer": checkpoint["answer"], "steps": checkpoint["steps"], "resumed": resumed}
