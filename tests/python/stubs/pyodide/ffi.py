"""Stand-in for `pyodide.ffi`: enough for `dojo_ai` to import under CPython (tests/python)."""


class JsException(Exception):
    pass


class JsProxy:
    pass


jsnull = None


def to_js(value, **_options):
    return value


def create_proxy(function):
    return function
