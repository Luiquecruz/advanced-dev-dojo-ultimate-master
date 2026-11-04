from collections.abc import Mapping, Sequence
from typing import Any


def parse_command(tokens: Sequence[str]) -> dict[str, Any]:
    """Turn a sequence of command tokens into an action dict."""
    # TODO: this switches on the first token like a JS `switch` and never checks how many tokens arrived.
    # Match the whole sequence instead: ["move", x, y], ["say", *words], ["quit"]; anything else raises ValueError.
    match tokens[0]:
        case "move":
            return {"action": "move", "x": int(tokens[1]), "y": int(tokens[2])}
        case "say":
            return {"action": "say", "text": " ".join(tokens[1:])}
        case "quit":
            return {"action": "quit"}
        case _:
            raise ValueError(f"unknown command: {tokens!r}")


def handle_event(event: Mapping[str, Any]) -> tuple[Any, ...]:
    """Decode a JSON-like event dict into a tuple."""
    # TODO: indexing by hand raises KeyError for a missing key and never checks the shape of "pos".
    # Use mapping patterns for click and key events, add the nested resize event, and raise ValueError for the rest.
    match event["type"]:
        case "click":
            x, y = event["pos"]
            return ("click", x, y)
        case "key":
            return ("key", event["key"])
        case _:
            raise ValueError(f"unknown event: {event!r}")
