ADR = {
    "id": 9,
    "title": "Type the SDK with protocols for plugins and TypedDict payloads validated at the edge",
    "status": "accepted",
    "context": (
        "acme-sdk is used by 20 internal teams and by plugin authors outside the company who cannot be made to inherit "
        "from SDK classes, while the registry must reject a plugin without name or handle when it is registered. Three "
        "services send JSON with 14, 9 and 7 payload shapes; 6 shapes are shared by two services, so the SDK defines "
        "14 + 9 + 7 - 6 = 24 payload types. Teams keep payloads as plain dicts and want checker errors on wrong keys. "
        "Service data is untrusted and is validated once at the edge. The baseline is Python 3.12 and CI checks nothing today."
    ),
    "decision": (
        "We will describe plugins with a runtime-checkable Protocol, define the 24 payload shapes once as TypedDict "
        "classes checked by one runtime validator at the edge, write generics with the PEP 695 syntax, and run pyright "
        "in strict mode on every pull request."
    ),
    "alternatives": [
        {
            "option": "Abstract base class for plugins",
            "reason": "An ABC forces outside authors to inherit or register, and several plugins already subclass their own frameworks.",
        },
        {
            "option": "Dataclasses for payloads",
            "reason": "Converting payloads into objects breaks the 20 teams that index, merge and forward them as plain dicts.",
        },
        {
            "option": "Untyped dicts everywhere",
            "reason": "Plain dict[str, Any] gives the teams no completion and no checker error on a misspelled key.",
        },
    ],
    "consequences": {
        "positive": [
            "Plugins match by shape, and register() rejects a plugin missing name or handle with isinstance.",
            "Each of the 24 payload shapes exists once, and teams get key checking without changing their dict code.",
        ],
        "negative": [
            "isinstance against the protocol only checks that members exist, so wrong handle signatures surface only in the checker.",
            "The edge validator must be kept in sync with every TypedDict feature the SDK uses.",
        ],
    },
}

PLAN = {
    "plugin_interface": "protocol",
    "runtime_checkable": True,
    "payloads": "typeddict",
    "payload_definitions": 14 + 9 + 7 - 6,
    "edge_validation": "runtime_validator",
    "generics_syntax": "pep695",
    "checker": "pyright",
    "rejected": [
        {
            "pattern": "concrete plugin base class",
            "reason": "Outside authors cannot be forced to inherit from an SDK class to write a plugin.",
        },
        {
            "pattern": "one TypedDict per service and shape",
            "reason": "Defining the 6 shared shapes twice gives 30 types that drift apart instead of 24.",
        },
        {
            "pattern": "no runtime validation",
            "reason": "TypedDict checks nothing at runtime, and the service data entering the SDK is untrusted.",
        },
    ],
}
