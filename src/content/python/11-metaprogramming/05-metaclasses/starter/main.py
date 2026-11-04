from typing import Any


class RequiresNameMeta(type):
    """Metaclass that rejects any class whose own body does not define a non-empty string `name`."""

    def __new__(mcls, class_name: str, bases: tuple[type, ...], namespace: dict[str, Any], **kwargs: Any) -> type:
        # TODO: raise TypeError naming the class when its own namespace has no non-empty str `name`.
        # An inherited name does not count.
        return super().__new__(mcls, class_name, bases, namespace, **kwargs)


class SingletonMeta(type):
    """Metaclass whose classes build one instance each and return it on every later call."""

    def __call__(cls, *args: Any, **kwargs: Any) -> Any:
        # TODO: create the instance on the first call only (super().__call__ runs __new__ and __init__),
        # keep it per class, so a subclass gets its own, and return the same object on later calls.
        return super().__call__(*args, **kwargs)


class FinalMeta(type):
    """Metaclass whose classes cannot be subclassed."""

    # TODO: add __new__ raising TypeError, naming the final base, when any base is a FinalMeta class.
    # Call super().__new__ with every argument so FinalMeta combines with other metaclasses.
