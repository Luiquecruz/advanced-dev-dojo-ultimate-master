Build a swarm of peer agents that pass control with handoff tool calls, carry the conversation along, and stop on ping-pong, a handoff limit or a turn limit.

An agent is a dict `{"name": ..., "instructions": ..., "handoffs": [...]}`, where `"handoffs"` lists the names of the agents it may transfer to. `agents` maps each name to its agent. Requests, responses, messages and results are plain dicts whose keys keep the JSON names (`"toolCalls"`, `"toolCallId"`).

## 1. `handoff_tool_name(agent_name)`

Return `transfer_to_` followed by the name lowercased, with every run of characters other than `a-z` and `0-9` replaced by one `_`, and no `_` at either end: `"Tech Support"` → `"transfer_to_tech_support"`, `"Refunds (EU)"` → `"transfer_to_refunds_eu"`.

## 2. `handoff_tools(agent)`

One tool definition dict per name in `agent["handoffs"]`, in order: `"name"` from `handoff_tool_name`, a `"description"` (more than 10 characters), and `"parameters"` of type `"object"` with a string property `"reason"` listed in `"required"`.

## 3. `is_ping_pong(path)`

`True` when the last four entries of `path` alternate between two different agents (`A, B, A, B`), otherwise `False`.

## 4. `run_swarm(user_message, *, model, agents, entry, max_handoffs, max_turns)`

Keep a history that starts as `[{"role": "user", "content": user_message}]`; the current agent starts as `entry`, the path as `[entry]`.

1. While fewer than `max_turns` model calls were made, call `await model.generate(request)` with `"messages": [{"role": "system", "content": current_instructions}, *history]` and `"tools": handoff_tools(current_agent)`. Each call is one turn.
2. A reply with no tool calls (`response["toolCalls"]` is empty) is the answer: return status `"answered"` with its text.
3. Otherwise look at the first tool call. If its `"name"` is not a handoff tool of the current agent, **reject** it: append `{"role": "assistant", "content": text, "toolCalls": [call]}` and `{"role": "tool", "toolCallId": call["id"], "content": content}` where `content` names the rejected tool, and continue with the same agent.
4. For an allowed handoff to `target`:
   - if the path plus `target` is a ping-pong, return status `"ping_pong"`;
   - else if `max_handoffs` handoffs were already made, return status `"handoff_limit"`;
   - else read `"reason"` from the call `"arguments"` (a JSON string; `""` when it is not JSON or `"reason"` is not a string), append the assistant message with the call and a tool message for `call["id"]` whose content contains the previous agent, the target and the reason, record `{"from": ..., "to": ..., "reason": ...}`, add `target` to the path and make it the current agent.
5. When the turns run out, return status `"turn_limit"`.

The result is `{"status", "answer", "agent", "path", "handoffs", "turns"}`: `"answer"` is `None` unless the status is `"answered"`, and `"agent"` is the agent holding control at the end.

The tests script answers, handoffs, rejected calls and loops, and check statuses, paths, histories and tools, never the wording of model output.
