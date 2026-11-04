import inspect
import json

from dojo_ai import ModelError

LOOP_SYSTEM = "You are a maintenance agent. Produce the complete fix for the task. When feedback from a previous attempt is given, address it."


class MemoryStore:
    """Saves loop states as JSON text, the way a database or a file would."""

    def __init__(self):
        self._states = {}

    async def load(self, key):
        saved = self._states.get(key)
        return None if saved is None else json.loads(saved)

    async def save(self, key, state):
        self._states[key] = json.dumps(state)


def create_memory_store():
    return MemoryStore()


def stop_reason(check, limits):
    # TODO: done, then stuck, then failures, then budget, otherwise None
    if check["passed"]:
        return "done"
    return "failures" if check["failures"] >= limits["maxFailures"] else None


async def handle_trigger(event, *, model, store, verify, escalate, limits):
    # TODO: load the state (return finished ones untouched), then act, verify, apply the stop rule and save after every iteration; escalate once
    state = {"key": event["key"], "status": "running", "iterations": 0, "failures": 0, "spentUsd": 0, "lastOutput": None, "lastFeedback": None, "escalationReason": None}
    while state["status"] == "running":
        response = await model.generate({"messages": [{"role": "user", "content": event["task"]}]})
        state["iterations"] += 1
        verdict = verify(response["text"], event)
        if inspect.isawaitable(verdict):
            verdict = await verdict
        if verdict["passed"]:
            state["status"] = "done"
        else:
            state["failures"] += 1
            if stop_reason({"passed": False, "stuck": False, "failures": state["failures"], "spentUsd": state["spentUsd"]}, limits) is not None:
                state["status"] = "escalated"
    return state
