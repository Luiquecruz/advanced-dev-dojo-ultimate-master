import io
import sys
from collections.abc import Iterator, MutableMapping
from contextlib import contextmanager
from typing import Any


@contextmanager
def temporary_env(mapping: MutableMapping[str, Any], key: str, value: Any) -> Iterator[Any]:
    # TODO: remember the previous value (the key may be absent), set the new one and yield it.
    # Restore the mapping on every way out, also when the block raises: put the old value back,
    # or remove the key if it was absent.
    mapping[key] = value
    yield value


@contextmanager
def captured_output() -> Iterator[io.StringIO]:
    # TODO: replace sys.stdout with the StringIO while the block runs, and put the original
    # sys.stdout back on every way out.
    buffer = io.StringIO()
    yield buffer


@contextmanager
def section(log: list[str], name: str) -> Iterator[None]:
    # TODO: append "exit:<name>" after the block, also when the block raises.
    log.append(f"enter:{name}")
    yield
