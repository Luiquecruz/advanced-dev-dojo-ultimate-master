"""Stand-in for the JavaScript fake model bridge. The fake model runs only in Pyodide, so lessons that use it are skipped under CPython."""


class _Unavailable:
    def __getattr__(self, name):
        return self

    def __call__(self, *args, **kwargs):
        raise RuntimeError("The fake model (dojo_ai) runs only in Pyodide.")


testing = _Unavailable()


def __getattr__(name):
    return _Unavailable()


def reset():
    pass
