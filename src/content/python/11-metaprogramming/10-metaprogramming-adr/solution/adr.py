ADR = {
    "id": 11,
    "title": "Discover exporters through entry points and validate them with __init_subclass__",
    "status": "accepted",
    "context": (
        "dx has 66 Exporter subclasses in 48 core modules, 6 of them abstract bases, plus 18 exporters in 12 modules "
        "published by 5 partner teams from their own repositories; some partner classes inherit from pydantic.BaseModel "
        "and are subclassed again by engineers who rarely read our docs. Importing a plugin module costs 4 ms, so "
        "importing all 60 takes 240 ms against the 55 ms left of the 150 ms startup budget after the 95 ms core. "
        "Missing attributes and duplicate names must fail at class creation, and only the core and partner "
        "distributions may provide exporters."
    ),
    "decision": (
        "We will discover exporters through entry points in the dx.exporters group, accepted only from an allow-list "
        "of 6 distributions, load lazily the one exporter a command needs, and validate and register every concrete "
        "subclass in Exporter.__init_subclass__, with abstract bases opting out through a class keyword."
    ),
    "alternatives": [
        {
            "option": "Scan and import every module of the core package at startup",
            "reason": "It cannot see the 12 partner modules, and importing 60 modules costs 240 ms against a 55 ms budget.",
        },
        {
            "option": "A RegistryMeta metaclass on Exporter",
            "reason": "Partner exporters that inherit from pydantic.BaseModel would fail with a metaclass conflict.",
        },
        {
            "option": "A @register class decorator",
            "reason": "Internal variants whose authors forget the decorator would be neither validated nor registered.",
        },
    ],
    "consequences": {
        "positive": [
            "dx export imports one plugin module, about 16 ms of plugin startup inside the 55 ms budget.",
            "CI that imports every plugin module fails on a missing attribute or a duplicate name before any export.",
        ],
        "negative": [
            "Partner exporters must be packaged and installed to be found; a module on sys.path alone is invisible.",
            "The allow-list of distributions has to be updated by the platform team whenever a partner team joins.",
        ],
    },
}

PLAN = {
    "discovery": "entry_points",
    "loading": "lazy",
    "registration": "init_subclass",
    "validation_time": "class_creation",
    "metaclass_needed": False,
    "registered_classes": 66 - 6 + 18,
    "eager_import_ms": (48 + 12) * 4,
    "plugin_budget_ms": 150 - 95,
    "lazy_import_ms": 12 + 1 * 4,
    "trust_policy": "allow_list",
    "allowed_distributions": 1 + 5,
    "rejected": [
        {
            "pattern": "importing every plugin at startup to fill the registry",
            "reason": "240 ms of imports overruns the 55 ms left after the core, on every command.",
        },
        {
            "pattern": "loading every installed entry point in the group",
            "reason": "Any installed distribution could then run code inside dx by declaring an exporter.",
        },
        {
            "pattern": "validating exporter attributes on first use",
            "reason": "A broken partner exporter would only fail in production, on the first export that needs it.",
        },
    ],
}
