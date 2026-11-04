import json

CONTRIBUTOR_SYSTEM = "You contribute to a shared blackboard. Use the current values you are given and reply with the new value for your key only."


# TODO: exact key first, then the longest matching "prefix*" pattern, otherwise None
def owner_of(owners, key):
    return owners.get(key)


class Blackboard:
    """Shared key-value state with an owner per key, compare-and-set versions and an append-only log."""

    def __init__(self, owners):
        self.owners = owners
        self.entries = {}
        self.history = []

    def read(self, key):
        return self.entries.get(key, {"key": key, "value": None, "version": 0, "writer": None})

    # TODO: reject non-owners and stale versions, store and return copies, log every attempt with a sequence number
    def write(self, agent, key, value, expected_version):
        version = self.read(key)["version"] + 1
        self.entries[key] = {"key": key, "value": value, "version": version, "writer": agent}
        self.history.append({"sequence": len(self.history) + 1, "agent": agent, "key": key, "value": value, "expectedVersion": expected_version, "accepted": True, "reason": None, "version": version})
        return {"ok": True, "version": version}

    def log(self):
        return self.history

    def snapshot(self):
        return {key: entry["value"] for key, entry in self.entries.items()}


def create_blackboard(owners):
    return Blackboard(owners)


# TODO: replay accepted entries in sequence order
def rebuild(log):
    return {entry["key"]: entry["value"] for entry in log}


# TODO: read the version, call the model with the current values, write with that version; retry conflicts up to max_attempts, stop at once on not_owner
async def contribute_with_model(agent, key, task, *, board, model, read_keys, max_attempts):
    response = await model.generate({
        "messages": [
            {"role": "system", "content": CONTRIBUTOR_SYSTEM},
            {"role": "user", "content": task},
        ],
    })
    result = board.write(agent, key, response["text"], board.read(key)["version"])
    if result["ok"]:
        return {"ok": True, "version": result["version"], "attempts": 1}
    return {"ok": False, "reason": result["reason"], "attempts": 1}
