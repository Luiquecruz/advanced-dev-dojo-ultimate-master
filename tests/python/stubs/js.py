"""Stand-in for Pyodide's `js` module, so `dojo_ai` imports under CPython (tests/python)."""


class Object:
    fromEntries = staticmethod(dict)
