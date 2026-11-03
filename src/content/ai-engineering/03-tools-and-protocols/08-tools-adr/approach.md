1. Turn the briefing into one decision per system: who uses it, who owns it, whether it is a capability or an agent, and whether it has side effects.
2. Choose the mechanism by those facts: in-process function calling for single-use systems, MCP for shared ones or vendor servers, A2A for long-running work delegated to an external agent.
3. Design the catalog as model interfaces: snake_case names, descriptions that say what comes back, bounded outputs, a written error contract, and approval on every tool that changes something.
4. Do the budget arithmetic (tools × tokens per definition against the per-request limit) and let it decide between sending everything and loading on demand; keep the always-loaded set small enough to fit.
5. Derive the round limit from the latency budget instead of picking a round number.
6. Write the record from the plan, with numbers in the context, a single "We will" sentence, alternatives tied to the constraint that removed them, and honest negative consequences.
