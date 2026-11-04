`handoff_tool_name` is one `re.sub(r"[^a-z0-9]+", "_", name.lower())` followed by `.strip("_")`. `is_ping_pong` unpacks `path[-4:]` into four names (after checking the length) and checks `first == third`, `second == fourth` and `first != second`.
---
Find the target with `next((name for name in agent["handoffs"] if handoff_tool_name(name) == call["name"]), None)`. Comparing against the tool names you offered, instead of stripping the `transfer_to_` prefix, is what rejects both invented tools and real agents this agent may not reach.
---
Both a rejection and a handoff append the same pair of messages: the assistant message carrying `"toolCalls": [call]`, then `{"role": "tool", "toolCallId": call["id"], "content": ...}`. Only the content differs, and only a handoff changes `current`, `path` and `handoffs`.
---
Check the guards before mutating anything: `is_ping_pong([*path, target])` first, then `len(handoffs) >= max_handoffs`. A small nested `finish(status, answer)` function that returns `{"status": status, "answer": answer, "agent": current, "path": path, "handoffs": handoffs, "turns": turns}` keeps every exit consistent.
