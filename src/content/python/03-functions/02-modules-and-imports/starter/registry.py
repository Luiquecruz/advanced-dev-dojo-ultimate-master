# TODO: this module imports `main` to get the decorator, and `main` imports this module back.
# Own the shared pieces here (HANDLERS and register) so registry.py never imports main.
from main import register


@register
def ping() -> str:
    return "pong"


@register
def health() -> str:
    return "ok"
