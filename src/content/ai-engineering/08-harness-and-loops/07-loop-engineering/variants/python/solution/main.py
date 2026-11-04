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
    if check["passed"]:
        return "done"
    if check["stuck"]:
        return "stuck"
    if check["failures"] >= limits["maxFailures"]:
        return "failures"
    if check["spentUsd"] >= limits["budgetUsd"]:
        return "budget"
    return None


def new_state(key):
    return {"key": key, "status": "running", "iterations": 0, "failures": 0, "spentUsd": 0, "lastOutput": None, "lastFeedback": None, "escalationReason": None}


def user_message(event, last_feedback):
    if last_feedback is None:
        return event["task"]
    return f"{event['task']}\n\nThe previous attempt failed verification:\n{last_feedback}"


async def act(model, event, state):
    try:
        response = await model.generate({
            "messages": [
                {"role": "system", "content": LOOP_SYSTEM},
                {"role": "user", "content": user_message(event, state["lastFeedback"])},
            ],
        })
    except ModelError as error:
        return {"error": error}
    return {"text": response["text"], "cost": response["usage"]["cost"]}


async def handle_trigger(event, *, model, store, verify, escalate, limits):
    state = await store.load(event["key"]) or new_state(event["key"])
    while state["status"] == "running":
        action = await act(model, event, state)
        state["iterations"] += 1
        passed = False
        stuck = False
        if "error" in action:
            state["failures"] += 1
            state["lastFeedback"] = f"model error: {action['error'].code}"
        else:
            state["spentUsd"] += action["cost"]
            verdict = verify(action["text"], event)
            if inspect.isawaitable(verdict):
                verdict = await verdict
            passed = verdict["passed"]
            if not passed:
                state["failures"] += 1
                state["lastFeedback"] = verdict["feedback"]
                stuck = action["text"] == state["lastOutput"]
            state["lastOutput"] = action["text"]
        reason = stop_reason({"passed": passed, "stuck": stuck, "failures": state["failures"], "spentUsd": state["spentUsd"]}, limits)
        if reason == "done":
            state["status"] = "done"
        elif reason is not None:
            state["status"] = "escalated"
            state["escalationReason"] = reason
        await store.save(event["key"], {**state})
        if reason is not None and reason != "done":
            notified = escalate({"key": event["key"], "reason": reason, "state": {**state}})
            if inspect.isawaitable(notified):
                await notified
    return state
