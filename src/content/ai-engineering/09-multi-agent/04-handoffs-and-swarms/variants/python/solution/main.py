import json
import re


def handoff_tool_name(agent_name):
    slug = re.sub(r"[^a-z0-9]+", "_", agent_name.lower()).strip("_")
    return f"transfer_to_{slug}"


def handoff_tools(agent):
    return [
        {
            "name": handoff_tool_name(target),
            "description": f"Transfer the conversation to the {target} agent when it is better suited to continue.",
            "parameters": {
                "type": "object",
                "properties": {"reason": {"type": "string", "description": f"Why {target} should take over."}},
                "required": ["reason"],
            },
        }
        for target in agent["handoffs"]
    ]


def is_ping_pong(path):
    if len(path) < 4:
        return False
    first, second, third, fourth = path[-4:]
    return first != second and first == third and second == fourth


def reason_of(raw_arguments):
    try:
        parsed = json.loads(raw_arguments)
    except ValueError:
        return ""
    reason = parsed.get("reason") if isinstance(parsed, dict) else None
    return reason if isinstance(reason, str) else ""


async def run_swarm(user_message, *, model, agents, entry, max_handoffs, max_turns):
    history = [{"role": "user", "content": user_message}]
    path = [entry]
    handoffs = []
    current = entry
    turns = 0

    def finish(status, answer):
        return {"status": status, "answer": answer, "agent": current, "path": path, "handoffs": handoffs, "turns": turns}

    while turns < max_turns:
        agent = agents[current]
        response = await model.generate({
            "messages": [{"role": "system", "content": agent["instructions"]}, *history],
            "tools": handoff_tools(agent),
        })
        turns += 1
        if len(response["toolCalls"]) == 0:
            return finish("answered", response["text"])
        call = response["toolCalls"][0]
        target = next((name for name in agent["handoffs"] if handoff_tool_name(name) == call["name"]), None)
        if target is None:
            allowed = ", ".join(agent["handoffs"]) or "nobody"
            history.extend([
                {"role": "assistant", "content": response["text"], "toolCalls": [call]},
                {"role": "tool", "toolCallId": call["id"], "content": f'"{call["name"]}" is not an available handoff. Answer directly or transfer to: {allowed}.'},
            ])
            continue
        if is_ping_pong([*path, target]):
            return finish("ping_pong", None)
        if len(handoffs) >= max_handoffs:
            return finish("handoff_limit", None)
        reason = reason_of(call["arguments"])
        history.extend([
            {"role": "assistant", "content": response["text"], "toolCalls": [call]},
            {"role": "tool", "toolCallId": call["id"], "content": f"Transferred from {current} to {target}. Reason: {reason}"},
        ])
        handoffs.append({"from": current, "to": target, "reason": reason})
        path.append(target)
        current = target
    return finish("turn_limit", None)
