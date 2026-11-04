from collections.abc import Mapping
from typing import Any


class Proxy:
    """Forwards the attributes it does not own to a target and logs every forwarded access."""

    def __init__(self, target: object) -> None:
        object.__setattr__(self, "_target", target)
        object.__setattr__(self, "log", [])

    def __getattr__(self, name: str) -> Any:
        target = object.__getattribute__(self, "_target")
        value = getattr(target, name)
        self.log.append(("get", name))
        return value

    def __setattr__(self, name: str, value: Any) -> None:
        setattr(self._target, name, value)
        self.log.append(("set", name))

    def __dir__(self) -> list[str]:
        return sorted(set(super().__dir__()) | set(dir(self._target)))


class Frozen:
    """Base class whose instances reject new attributes and deletions once frozen."""

    _frozen = False

    def freeze(self) -> None:
        object.__setattr__(self, "_frozen", True)

    def __setattr__(self, name: str, value: Any) -> None:
        exists = name in vars(self) or hasattr(type(self), name)
        if self._frozen and not exists:
            raise AttributeError(f"{type(self).__name__} is frozen: cannot add attribute {name!r}")
        super().__setattr__(name, value)

    def __delattr__(self, name: str) -> None:
        if self._frozen:
            raise AttributeError(f"{type(self).__name__} is frozen: cannot delete attribute {name!r}")
        super().__delattr__(name)


class Defaults:
    """Answers missing attributes from a mapping of defaults; real attributes always win."""

    def __init__(self, defaults: Mapping[str, Any], **values: Any) -> None:
        self._defaults = dict(defaults)
        for name, value in values.items():
            setattr(self, name, value)

    def __getattr__(self, name: str) -> Any:
        defaults = vars(self).get("_defaults", {})
        try:
            return defaults[name]
        except KeyError:
            raise AttributeError(f"{type(self).__name__} has no attribute {name!r}") from None
