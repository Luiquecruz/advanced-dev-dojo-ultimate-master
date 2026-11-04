"""Walks every JavaScript object reachable from Python (`js`, `pyodide_js`), through string and symbol keys and prototypes,
and reports host capabilities: the realm's code generators and the Node `fs` module."""

import js
import pyodide_js
from pyodide.ffi import JsProxy

UNCONVERTIBLE = {"novalue"}
CODE_GENERATORS = {f"function {name}() {{ [native code] }}" for name in ("Function", "eval", "AsyncFunction", "GeneratorFunction", "AsyncGeneratorFunction")}
NODE_FS_MEMBERS = ("readFileSync", "writeFileSync", "openSync")


def _keys(value):
    keys = []
    try:
        keys.extend((name, f".{name}") for name in js.Object.getOwnPropertyNames(value) if name not in UNCONVERTIBLE)
    except Exception:
        pass
    try:
        keys.extend((symbol, f"[{symbol.toString()}]") for symbol in js.Object.getOwnPropertySymbols(value))
    except Exception:
        pass
    return keys


def _capability(value):
    if callable(value):
        try:
            if str(js.Object.toString.call(value)) in CODE_GENERATORS:
                return "code generator"
        except Exception:
            return None
    try:
        if all(js.Object.prototype.hasOwnProperty.call(value, name) for name in NODE_FS_MEMBERS):
            return "node fs"
    except Exception:
        return None
    return None


def scan(max_nodes=80000, max_depth=8):
    """Returns `(findings, visited)`: `"<capability> at <path>"` for each host capability found, and how many objects were visited."""
    descriptor = js.Object.getOwnPropertyDescriptor
    prototype_of = js.Object.getPrototypeOf
    is_view = js.ArrayBuffer.isView
    seen = js.WeakSet.new()
    visited = 0
    findings = []
    stack = [(js, "js", 0), (pyodide_js, "pyodide_js", 0)]
    while stack and visited < max_nodes:
        value, path, depth = stack.pop()
        if not isinstance(value, JsProxy) or js.Object(value) != value or seen.has(value):
            continue
        seen.add(value)
        visited += 1
        capability = _capability(value)
        if capability:
            findings.append(f"{capability} at {path}")
        if depth >= max_depth or is_view(value) or js.Object.prototype.toString.call(value) == "[object ArrayBuffer]":
            continue
        for key, label in _keys(value):
            try:
                child = descriptor(value, key).value
            except Exception:
                continue
            stack.append((child, f"{path}{label}", depth + 1))
        try:
            stack.append((prototype_of(value), f"{path}.__proto__", depth + 1))
        except Exception:
            pass
    return findings, visited
