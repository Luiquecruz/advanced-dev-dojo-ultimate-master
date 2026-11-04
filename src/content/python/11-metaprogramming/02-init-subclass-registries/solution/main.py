from typing import Any, ClassVar


class Plugin:
    """Base class whose concrete subclasses register themselves by name when they are defined."""

    registry: ClassVar[dict[str, type["Plugin"]]] = {}
    plugin_name: ClassVar[str]

    def __init_subclass__(cls, name: str | None = None, abstract: bool = False, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        if abstract:
            return
        key = name if name is not None else cls.__name__
        if key in Plugin.registry:
            raise ValueError(f"plugin name {key!r} is already used by {Plugin.registry[key].__qualname__}")
        cls.plugin_name = key
        Plugin.registry[key] = cls
