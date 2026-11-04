from collections.abc import Mapping, Sequence
from typing import Any


def parse_command(tokens: Sequence[str]) -> dict[str, Any]:
    """Turn a sequence of command tokens into an action dict."""
    match tokens:
        case ["move", x, y]:
            return {"action": "move", "x": int(x), "y": int(y)}
        case ["say", *words]:
            return {"action": "say", "text": " ".join(words)}
        case ["quit"]:
            return {"action": "quit"}
        case _:
            raise ValueError(f"unknown command: {tokens!r}")


def handle_event(event: Mapping[str, Any]) -> tuple[Any, ...]:
    """Decode a JSON-like event dict into a tuple."""
    match event:
        case {"type": "click", "pos": (x, y)}:
            return ("click", x, y)
        case {"type": "key", "key": key}:
            return ("key", key)
        case {"type": "resize", "size": {"width": width, "height": height}}:
            return ("resize", width, height)
        case _:
            raise ValueError(f"unknown event: {event!r}")
