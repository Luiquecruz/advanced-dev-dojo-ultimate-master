Analyze an agent configuration for the lethal trifecta, suggest which leg to remove, apply the removal, and guard a live session so the call that would complete the trifecta never runs.

A **leg** is one of `"privateData"`, `"untrustedContent"`, `"externalCommunication"` (defined as `LEGS`, in that canonical order). Profiles, sessions, configurations and reports are plain dicts whose keys keep the JSON names (`"untrustedInputs"`, `"rendersRemoteImages"`, `"sessionId"`, `"lethalSessions"`).

- A **tool profile** is `{"name", "capabilities"?}`, where `"capabilities"` lists the legs the tool provides. An empty list means the tool provides no leg. A **missing** `"capabilities"` key, or a tool name with no profile at all, means the tool is unreviewed and provides **every** leg.
- A **session** is `{"id", "tools", "untrustedInputs"?, "rendersRemoteImages"?}`: the tool names available in one context, labels of untrusted inputs that start the session (an inbound email), and whether the UI renders remote images the model writes.
- An **agent configuration** is `{"name", "tools", "sessions"}`.

## 1. `analyze_session(session, tools)`

Return `{"sessionId", "legs", "lethal"}`. `"legs"` maps each leg to its sources, in this order:

1. tool names, in the order of `session["tools"]`, without duplicates;
2. for `"untrustedContent"`, then each untrusted input as `input:<label>`;
3. for `"externalCommunication"`, then `remote-images` when `"rendersRemoteImages"` is `True`.

`"lethal"` is `True` when all three legs have at least one source.

## 2. `analyze_agent(config)`

Return `{"agent", "sessions", "lethalSessions"}`: the configuration name, the report of every session in order, and the ids of the lethal ones.

## 3. `suggest_removal(report)`

`None` for a session that is not lethal. Otherwise `{"leg", "sources"}` for the leg with the **fewest** sources (a copy of its list). On a tie, prefer `"externalCommunication"`, then `"untrustedContent"`, then `"privateData"`.

## 4. `remove_leg(config, session_id, leg)`

Return a **new** configuration (the input is never modified) where the named session no longer has that leg: drop every tool that provides it (unreviewed tools included), set `"untrustedInputs"` to `[]` when the leg is `"untrustedContent"`, and set `"rendersRemoteImages"` to `False` when it is `"externalCommunication"`. Other sessions keep their content. Raise an exception whose message contains the id when the session does not exist.

## 5. `create_trifecta_guard(tools, *, initial_legs=())`

Return a `TrifectaGuard`, a runtime guard for one session. `authorize(tool_name)` combines the legs already present with the tool's legs:

- if the combination would contain all three legs, return `{"allowed": False, "reason": "lethal_trifecta", "legs": legs}` with the legs present **before** the call, and record nothing;
- otherwise record the new legs and return `{"allowed": True, "legs": legs}`.

`legs()` returns the legs present. Both list legs in canonical order. `initial_legs` seeds the session (a session triggered by an email starts with `"untrustedContent"`).

The tests use an email assistant's tools, unlabeled plugins, untrusted triggers and many call orders.
