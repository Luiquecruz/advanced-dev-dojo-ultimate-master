"""Walks every JavaScript object reachable from Python (`js`, `pyodide_js`) and reports callables that are the realm's code generators."""

import js
import pyodide_js
from pyodide.ffi import JsProxy

UNCONVERTIBLE = {"novalue"}
CODE_GENERATORS = {f"function {name}() {{ [native code] }}" for name in ("Function", "eval", "AsyncFunction", "GeneratorFunction", "AsyncGeneratorFunction")}


def scan(max_nodes=60000, max_depth=8):
    """Returns `(paths, visited)`: the property paths that lead to an original code generator, and how many objects were visited."""
    source_of = js.Object.toString.call
    own_names = js.Object.getOwnPropertyNames
    descriptor = js.Object.getOwnPropertyDescriptor
    prototype_of = js.Object.getPrototypeOf
    is_view = js.ArrayBuffer.isView
    seen = js.WeakSet.new()
    visited = 0
    found = []
    stack = [(js, "js", 0), (pyodide_js, "pyodide_js", 0)]
    while stack and visited < max_nodes:
        value, path, depth = stack.pop()
        if not isinstance(value, JsProxy) or seen.has(value):
            continue
        seen.add(value)
        visited += 1
        if callable(value):
            try:
                if str(source_of(value)) in CODE_GENERATORS:
                    found.append(path)
            except Exception:
                pass
        if depth >= max_depth or is_view(value) or js.Object.prototype.toString.call(value) == "[object ArrayBuffer]":
            continue
        try:
            names = list(own_names(value))
        except Exception:
            continue
        for name in names:
            if name in UNCONVERTIBLE:
                continue
            try:
                child = descriptor(value, name).value
            except Exception:
                continue
            stack.append((child, f"{path}.{name}", depth + 1))
        try:
            stack.append((prototype_of(value), f"{path}.__proto__", depth + 1))
        except Exception:
            pass
    return found, visited
