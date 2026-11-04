import json
import re


# TODO: lowercase, replace every run of other characters with "_", trim underscores at both ends
def handoff_tool_name(agent_name):
    return f"transfer_to_{agent_name}"


# TODO: one tool per allowed target, with a required string "reason"
def handoff_tools(agent):
    return [{"name": handoff_tool_name(target), "description": f"Transfer to {target}."} for target in agent["handoffs"]]


# TODO: True when the last four agents alternate between two different agents (A, B, A, B)
def is_ping_pong(path):
    return False


# TODO: reject handoffs the current agent may not make, record the call and a tool result in the history, stop on ping-pong and on the handoff limit
async def run_swarm(user_message, *, model, agents, entry, max_handoffs, max_turns):
    history = [{"role": "user", "content": user_message}]
    path = [entry]
    handoffs = []
    current = entry
    turns = 0
    while turns < max_turns:
        agent = agents[current]
        response = await model.generate({
            "messages": [{"role": "system", "content": agent["instructions"]}, *history],
            "tools": handoff_tools(agent),
        })
        turns += 1
        if len(response["toolCalls"]) == 0:
            return {"status": "answered", "answer": response["text"], "agent": current, "path": path, "handoffs": handoffs, "turns": turns}
        call = response["toolCalls"][0]
        target = call["name"].replace("transfer_to_", "")
        handoffs.append({"from": current, "to": target, "reason": json.loads(call["arguments"])["reason"]})
        path.append(target)
        current = target
    return {"status": "turn_limit", "answer": None, "agent": current, "path": path, "handoffs": handoffs, "turns": turns}
