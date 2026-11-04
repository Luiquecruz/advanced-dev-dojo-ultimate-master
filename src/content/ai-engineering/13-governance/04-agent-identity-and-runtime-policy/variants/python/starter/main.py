import hashlib
import json
from datetime import datetime, timezone

GENESIS_HASH = "0" * 64


def iso_timestamp(milliseconds):
    moment = datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def compact_json(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class PolicyDecisionPoint:
    """Decides every tool call from the agent identity, the tool spec and the purpose."""

    def __init__(self, agents, tools):
        self._agents = agents
        self._tools = tools

    def decide(self, request):
        # TODO: deny unknown or suspended agents and unknown tools; collect missing-scope, purpose-not-allowed and above-clearance; ask for external side effects and high-risk writes; allow otherwise
        agent = next((candidate for candidate in self._agents if candidate["id"] == request["agentId"]), None)
        tool = next((candidate for candidate in self._tools if candidate["name"] == request["tool"]), None)
        if agent is not None and tool is not None and tool["scope"] in agent["scopes"]:
            return {**request, "effect": "allow", "reasons": ["within-policy"]}
        return {**request, "effect": "deny", "reasons": ["missing-scope"]}

    def suspend(self, agent_id):
        # TODO: the kill switch: later decisions for the agent are denied; False for an unknown agent; never change the agents passed in
        raise NotImplementedError


def create_policy_decision_point(*, agents, tools):
    return PolicyDecisionPoint(agents, tools)


class AuditLog:
    """Append-only log whose entries are chained by SHA-256 hashes."""

    def __init__(self, now):
        self._now = now
        self._log = []

    def append(self, event):
        # TODO: previousHash from the last entry (GENESIS_HASH first) and a sha256 of compact_json([sequence, timestamp, previousHash, event]); store and return copies
        entry = {"sequence": len(self._log), "timestamp": iso_timestamp(self._now()), "event": event, "previousHash": GENESIS_HASH, "hash": GENESIS_HASH}
        self._log.append(entry)
        return entry

    def entries(self):
        # TODO: return deep copies so callers cannot change the log
        return self._log


def create_audit_log(*, now):
    return AuditLog(now)


def verify_audit_chain(entries):
    # TODO: return {"valid": False, "brokenAt": index} for the first entry whose sequence, previousHash or hash does not match
    return {"valid": True}


async def run_governed_tool_calls(response, context, policy, audit, tools):
    # TODO: decide every tool call, audit it with an argumentsHash (never raw arguments), run allowed calls only, and return one tool message per call
    raise NotImplementedError
