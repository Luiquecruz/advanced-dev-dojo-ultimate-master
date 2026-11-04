1. Separate the two questions the briefing mixes: how the host **finds** plugin code (discovery) and what runs when a plugin class **is created** (registration and validation).
2. Turn the briefing into counts and costs: concrete exporters (abstract bases excluded), plugin modules, the cost of importing all of them, the budget left after the core, and the cost of one lazy command.
3. Compare the eager cost with the budget. If it does not fit, loading must be lazy, and a lazy host needs plugin names without importing plugin modules.
4. Check where the code lives: 5 partner teams publish from their own repositories, so discovery must read installed packaging metadata rather than the core repository.
5. Choose the lightest hook that validates at class creation, runs for subclasses at any depth without a manual step, and coexists with a metaclass the plugin already has. Write down why each heavier or more manual option fails a specific briefing fact.
6. Treat discovery as code execution: decide which distributions may provide exporters and count them.
7. Write the ADR: the numbers in the context, a `We will` decision naming the discovery and the hook, rejected alternatives with the fact that ruled each out, and honest negative consequences. Re-read the coherence rules against every plan value.
