ADR = {
    "id": 11,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: core and partner exporters, where they are published, import cost and budget, validation, trust
    "context": "",
    # TODO: one sentence starting with "We will", naming how exporters are discovered and which hook validates them
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a briefing fact
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: partner exporters live in other repositories and other distributions
    "discovery": "package_scan",
    # TODO: compare the cost of importing every plugin module with the budget left after the core
    "loading": "eager",
    # TODO: subclasses of subclasses, authors who skip the docs, and partner classes that already have a metaclass
    "registration": "metaclass",
    # TODO: CI must catch a missing attribute or a duplicate name before any export runs
    "validation_time": "first_use",
    "metaclass_needed": True,
    # TODO: concrete exporters registered when CI imports every core and partner plugin module
    "registered_classes": 0,
    # TODO: every plugin module imported at startup, times the measured import cost
    "eager_import_ms": 0,
    # TODO: the startup budget minus what the core already takes
    "plugin_budget_ms": 0,
    # TODO: one lazy dx export: the entry-point metadata scan plus the one exporter module
    "lazy_import_ms": 0,
    # TODO: loading an entry point runs code from the distribution that declared it
    "trust_policy": "any_installed",
    "allowed_distributions": 0,
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
