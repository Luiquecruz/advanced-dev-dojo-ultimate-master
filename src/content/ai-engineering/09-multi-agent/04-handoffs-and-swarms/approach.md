1. Model a handoff as a tool the model can call, named after its target. The loop then needs no new protocol: a tool call either switches the active agent or is rejected.
2. Treat the handoff graph as a permission boundary. Match the call against the tools you offered this agent, so invented names and forbidden targets are rejected the same way.
3. Keep one shared history and swap only the system prompt and tools. Record every handoff as a tool call plus a tool result that says who transferred to whom and why, so the next agent inherits the decision trail.
4. Add the guards a manager would otherwise provide: ping-pong detection on the path, a maximum number of handoffs, and a maximum number of turns.
5. End every run with an explicit status. An application can escalate `ping_pong`, `handoff_limit` and `turn_limit` with the transcript instead of showing a half-finished answer.
