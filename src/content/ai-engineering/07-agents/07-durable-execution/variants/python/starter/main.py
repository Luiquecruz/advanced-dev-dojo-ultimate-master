import inspect
import json
import time


class CheckpointStore:
    """Keeps one checkpoint per run id as a JSON document in `documents`, a dict that outlives the store like a database."""

    def __init__(self, documents):
        self.documents = documents

    # TODO: reject unsafe run ids, return None for an unknown run, and store a JSON snapshot (serialize the whole checkpoint before replacing the stored one)
    async def load(self, run_id):
        return self.documents[run_id]

    async def save(self, checkpoint):
        self.documents[checkpoint["runId"]] = checkpoint


def create_checkpoint_store(documents=None):
    return CheckpointStore({} if documents is None else documents)


def idempotency_key(run_id, tool_call_id):
    # TODO: a key that is the same every time this run executes this tool call
    return f"{run_id}:{time.time_ns()}"


async def run_durable_agent(model, run_id, task, tools, store, max_steps):
    # TODO: load the checkpoint (resume) or save a new one; finish unanswered tool calls first; save after every model response and every tool result
    messages = [{"role": "user", "content": task}]
    definitions = [{"name": tool["name"], "description": tool["description"], "parameters": tool["parameters"]} for tool in tools]
    for step in range(1, max_steps + 1):
        response = await model.generate({"messages": messages, "tools": definitions})
        messages.append({"role": "assistant", "content": response["text"], "toolCalls": response["toolCalls"]})
        if not response["toolCalls"]:
            return {"status": "done", "answer": response["text"], "steps": step, "resumed": False}
        for call in response["toolCalls"]:
            tool = next((candidate for candidate in tools if candidate["name"] == call["name"]), None)
            if tool is None:
                result = f'Error: unknown tool "{call["name"]}".'
            else:
                result = tool["execute"](json.loads(call["arguments"]), {"idempotencyKey": idempotency_key(run_id, call["id"])})
                if inspect.isawaitable(result):
                    result = await result
            messages.append({"role": "tool", "toolCallId": call["id"], "content": result if isinstance(result, str) else json.dumps(result)})
    return {"status": "max_steps", "answer": None, "steps": max_steps, "resumed": False}
