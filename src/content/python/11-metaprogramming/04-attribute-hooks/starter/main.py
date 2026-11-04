from collections.abc import Mapping
from typing import Any


class Proxy:
    """Forwards the attributes it does not own to a target and logs every forwarded access."""

    def __init__(self, target: object) -> None:
        # TODO: once __setattr__ forwards writes, set these two with object.__setattr__ instead.
        self._target = target
        self.log: list[tuple[str, str]] = []

    def __getattr__(self, name: str) -> Any:
        # TODO: after reading the value from the target, record ("get", name) in self.log.
        return getattr(self._target, name)

    # TODO: add __setattr__: write the attribute on the target and record ("set", name).

    # TODO: add __dir__: the proxy's own names plus the names of the target.


class Frozen:
    """Base class whose instances reject new attributes and deletions once frozen."""

    def freeze(self) -> None:
        # TODO: mark the instance as frozen without going through the check in __setattr__.
        pass

    # TODO: add __setattr__: once frozen, raise AttributeError naming any attribute the instance
    # (or its class) does not already have. Existing attributes stay writable.

    # TODO: add __delattr__: once frozen, raise AttributeError for every deletion.


class Defaults:
    """Answers missing attributes from a mapping of defaults; real attributes always win."""

    def __init__(self, defaults: Mapping[str, Any], **values: Any) -> None:
        self._defaults = dict(defaults)
        for name, value in values.items():
            setattr(self, name, value)

    def __getattr__(self, name: str) -> Any:
        # TODO: raise AttributeError (not KeyError) for unknown names. Never read self._defaults
        # directly here: copy.copy() calls this hook on an instance whose __init__ never ran.
        return self._defaults[name]
