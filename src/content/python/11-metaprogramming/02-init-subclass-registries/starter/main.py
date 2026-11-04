from typing import Any, ClassVar


class Plugin:
    """Base class whose concrete subclasses register themselves by name when they are defined."""

    registry: ClassVar[dict[str, type["Plugin"]]] = {}
    plugin_name: ClassVar[str]

    def __init_subclass__(cls, name: str | None = None, abstract: bool = False, **kwargs: Any) -> None:
        # TODO: forward the keywords Plugin does not use, so mixins later in the MRO receive theirs.
        super().__init_subclass__()
        # TODO: skip abstract plugins, default the name to the class name (never the parent's),
        # raise ValueError for a name already registered, then store the class in Plugin.registry.
        cls.plugin_name = name or cls.__name__
