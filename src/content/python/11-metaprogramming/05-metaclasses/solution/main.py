from typing import Any


class RequiresNameMeta(type):
    """Metaclass that rejects any class whose own body does not define a non-empty string `name`."""

    def __new__(mcls, class_name: str, bases: tuple[type, ...], namespace: dict[str, Any], **kwargs: Any) -> type:
        declared = namespace.get("name")
        if not isinstance(declared, str) or not declared:
            raise TypeError(f"class {class_name} must define a non-empty string 'name' in its body")
        return super().__new__(mcls, class_name, bases, namespace, **kwargs)


class SingletonMeta(type):
    """Metaclass whose classes build one instance each and return it on every later call."""

    def __init__(cls, class_name: str, bases: tuple[type, ...], namespace: dict[str, Any], **kwargs: Any) -> None:
        super().__init__(class_name, bases, namespace, **kwargs)
        cls._instance = None

    def __call__(cls, *args: Any, **kwargs: Any) -> Any:
        if cls._instance is None:
            cls._instance = super().__call__(*args, **kwargs)
        return cls._instance


class FinalMeta(type):
    """Metaclass whose classes cannot be subclassed."""

    def __new__(mcls, class_name: str, bases: tuple[type, ...], namespace: dict[str, Any], **kwargs: Any) -> type:
        for base in bases:
            if isinstance(base, FinalMeta):
                raise TypeError(f"{base.__name__} is final: {class_name} cannot subclass it")
        return super().__new__(mcls, class_name, bases, namespace, **kwargs)
