# TODO: this copies the value of config.LEVEL once, at import time. Read it through the module instead.
from config import LEVEL

RAN_AS_SCRIPT = False

# TODO: move HANDLERS and register into registry.py to break the main <-> registry cycle.
HANDLERS = []


def register(function):
    HANDLERS.append(function)
    return function


from registry import health, ping  # noqa: E402  re-exported for callers


def current_level() -> str:
    return LEVEL


def handlers() -> list[str]:
    return [function.__name__ for function in HANDLERS]


def run_as_script() -> str:
    return f"{len(handlers())} handlers at level {current_level()}"


# TODO: this block runs on every import. Guard it so it only runs when main.py is the script.
RAN_AS_SCRIPT = True
print(run_as_script())
