import copy
import json

CONTRIBUTOR_SYSTEM = "You contribute to a shared blackboard. Use the current values you are given and reply with the new value for your key only."


def owner_of(owners, key):
    if key in owners:
        return owners[key]
    prefixes = sorted(
        (pattern for pattern in owners if pattern.endswith("*") and key.startswith(pattern[:-1])),
        key=len,
        reverse=True,
    )
    return owners[prefixes[0]] if prefixes else None


class Blackboard:
    """Shared key-value state with an owner per key, compare-and-set versions and an append-only log."""

    def __init__(self, owners):
        self.owners = owners
        self.entries = {}
        self.history = []

    def read(self, key):
        entry = self.entries.get(key)
        return {"key": key, "value": None, "version": 0, "writer": None} if entry is None else copy.deepcopy(entry)

    def append(self, entry):
        self.history.append({"sequence": len(self.history) + 1, **copy.deepcopy(entry)})

    def write(self, agent, key, value, expected_version):
        current = self.read(key)
        base = {"agent": agent, "key": key, "value": value, "expectedVersion": expected_version}
        if owner_of(self.owners, key) != agent:
            self.append({**base, "accepted": False, "reason": "not_owner", "version": current["version"]})
            return {"ok": False, "reason": "not_owner", "currentVersion": current["version"]}
        if expected_version != current["version"]:
            self.append({**base, "accepted": False, "reason": "version_conflict", "version": current["version"]})
            return {"ok": False, "reason": "version_conflict", "currentVersion": current["version"]}
        version = current["version"] + 1
        self.entries[key] = {"key": key, "value": copy.deepcopy(value), "version": version, "writer": agent}
        self.append({**base, "accepted": True, "reason": None, "version": version})
        return {"ok": True, "version": version}

    def log(self):
        return copy.deepcopy(self.history)

    def snapshot(self):
        return {key: copy.deepcopy(entry["value"]) for key, entry in self.entries.items()}


def create_blackboard(owners):
    return Blackboard(owners)


def rebuild(log):
    state = {}
    for entry in sorted(log, key=lambda entry: entry["sequence"]):
        if entry["accepted"]:
            state[entry["key"]] = copy.deepcopy(entry["value"])
    return state


async def contribute_with_model(agent, key, task, *, board, model, read_keys, max_attempts):
    reason = "version_conflict"
    for attempt in range(1, max_attempts + 1):
        current = board.read(key)
        context = {name: board.read(name)["value"] for name in [*read_keys, key]}
        response = await model.generate({
            "messages": [
                {"role": "system", "content": CONTRIBUTOR_SYSTEM},
                {"role": "user", "content": f"{task}\n\nCurrent blackboard values:\n{json.dumps(context, indent=2)}"},
            ],
        })
        result = board.write(agent, key, response["text"], current["version"])
        if result["ok"]:
            return {"ok": True, "version": result["version"], "attempts": attempt}
        reason = result["reason"]
        if reason == "not_owner":
            return {"ok": False, "reason": reason, "attempts": attempt}
    return {"ok": False, "reason": reason, "attempts": max_attempts}
