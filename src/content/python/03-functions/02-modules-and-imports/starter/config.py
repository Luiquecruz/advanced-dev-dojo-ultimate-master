import sys

LEVEL = "info"


def set_level(value: str) -> None:
    """Rebind LEVEL on this module object, like `config.LEVEL = value` from outside."""
    setattr(sys.modules[__name__], "LEVEL", value)
