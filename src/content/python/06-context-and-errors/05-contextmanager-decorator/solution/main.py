import io
import sys
from collections.abc import Iterator, MutableMapping
from contextlib import contextmanager
from typing import Any

_MISSING = object()


@contextmanager
def temporary_env(mapping: MutableMapping[str, Any], key: str, value: Any) -> Iterator[Any]:
    previous = mapping.get(key, _MISSING)
    mapping[key] = value
    try:
        yield value
    finally:
        if previous is _MISSING:
            mapping.pop(key, None)
        else:
            mapping[key] = previous


@contextmanager
def captured_output() -> Iterator[io.StringIO]:
    buffer = io.StringIO()
    previous = sys.stdout
    sys.stdout = buffer
    try:
        yield buffer
    finally:
        sys.stdout = previous


@contextmanager
def section(log: list[str], name: str) -> Iterator[None]:
    log.append(f"enter:{name}")
    try:
        yield
    finally:
        log.append(f"exit:{name}")
