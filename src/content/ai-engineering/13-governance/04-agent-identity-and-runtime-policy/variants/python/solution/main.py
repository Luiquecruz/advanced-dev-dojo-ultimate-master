import copy
import hashlib
import inspect
import json
from datetime import datetime, timezone

GENESIS_HASH = "0" * 64

CLASSIFICATION_RANK = ["public", "internal", "confidential", "restricted"]


def iso_timestamp(milliseconds):
    moment = datetime.fromtimestamp(milliseconds / 1000, tz=timezone.utc)
    return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def compact_json(value):
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def hash_entry(sequence, timestamp, previous_hash, event):
    return sha256(compact_json([sequence, timestamp, previous_hash, event]))


class PolicyDecisionPoint:
    """Decides every tool call from the agent identity, the tool spec and the purpose."""

    def __init__(self, agents, tools):
        self._agents = {agent["id"]: dict(agent) for agent in agents}
        self._tools = {tool["name"]: tool for tool in tools}

    def decide(self, request):
        agent = self._agents.get(request["agentId"])
        if agent is None:
            return {**request, "effect": "deny", "reasons": ["unknown-agent"]}
        if agent["status"] != "active":
            return {**request, "effect": "deny", "reasons": ["agent-suspended"]}
        tool = self._tools.get(request["tool"])
        if tool is None:
            return {**request, "effect": "deny", "reasons": ["unknown-tool"]}
        deny_reasons = []
        if tool["scope"] not in agent["scopes"]:
            deny_reasons.append("missing-scope")
        if request["purpose"] not in agent["purposes"]:
            deny_reasons.append("purpose-not-allowed")
        if CLASSIFICATION_RANK.index(tool["classification"]) > CLASSIFICATION_RANK.index(agent["clearance"]):
            deny_reasons.append("above-clearance")
        if deny_reasons:
            return {**request, "effect": "deny", "reasons": deny_reasons}
        ask_reasons = []
        if tool["sideEffect"] == "external":
            ask_reasons.append("external-side-effect")
        if tool["sideEffect"] == "write" and agent["riskTier"] == "high":
            ask_reasons.append("high-risk-write")
        if ask_reasons:
            return {**request, "effect": "ask", "reasons": ask_reasons}
        return {**request, "effect": "allow", "reasons": ["within-policy"]}

    def suspend(self, agent_id):
        agent = self._agents.get(agent_id)
        if agent is None:
            return False
        agent["status"] = "suspended"
        return True


def create_policy_decision_point(*, agents, tools):
    return PolicyDecisionPoint(agents, tools)


class AuditLog:
    """Append-only log whose entries are chained by SHA-256 hashes."""

    def __init__(self, now):
        self._now = now
        self._log = []

    def append(self, event):
        sequence = len(self._log)
        timestamp = iso_timestamp(self._now())
        previous_hash = GENESIS_HASH if sequence == 0 else self._log[-1]["hash"]
        stored_event = copy.deepcopy(event)
        entry = {
            "sequence": sequence,
            "timestamp": timestamp,
            "event": stored_event,
            "previousHash": previous_hash,
            "hash": hash_entry(sequence, timestamp, previous_hash, stored_event),
        }
        self._log.append(entry)
        return copy.deepcopy(entry)

    def entries(self):
        return copy.deepcopy(self._log)


def create_audit_log(*, now):
    return AuditLog(now)


def verify_audit_chain(entries):
    for index, entry in enumerate(entries):
        expected_previous = GENESIS_HASH if index == 0 else entries[index - 1]["hash"]
        intact = (
            entry["sequence"] == index
            and entry["previousHash"] == expected_previous
            and entry["hash"] == hash_entry(entry["sequence"], entry["timestamp"], entry["previousHash"], entry["event"])
        )
        if not intact:
            return {"valid": False, "brokenAt": index}
    return {"valid": True}


def parse_arguments(text):
    try:
        parsed = json.loads(text)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


async def run_tool(tool_call, tools):
    arguments = parse_arguments(tool_call["arguments"])
    implementation = tools.get(tool_call["name"])
    if arguments is None:
        return "Error: arguments are not a JSON object"
    if implementation is None:
        return f"Error: no implementation for {tool_call['name']}"
    try:
        result = implementation(arguments)
        return await result if inspect.isawaitable(result) else result
    except Exception as error:
        return f"Error: {error}"


async def run_governed_tool_calls(response, context, policy, audit, tools):
    messages = []
    for tool_call in response["toolCalls"]:
        decision = policy.decide({**context, "tool": tool_call["name"]})
        audit.append(
            {
                "type": "tool-decision",
                **context,
                "tool": tool_call["name"],
                "effect": decision["effect"],
                "reasons": decision["reasons"],
                "argumentsHash": sha256(tool_call["arguments"]),
            }
        )
        if decision["effect"] == "deny":
            content = f"Denied: {', '.join(decision['reasons'])}"
        elif decision["effect"] == "ask":
            content = f"Approval required: {', '.join(decision['reasons'])}"
        else:
            content = await run_tool(tool_call, tools)
        messages.append({"role": "tool", "toolCallId": tool_call["id"], "content": content})
    return messages
