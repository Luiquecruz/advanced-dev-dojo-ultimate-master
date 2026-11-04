import ast
import asyncio


def make_handler(recorder, failures=None, steps=1):
    """A handler that records start/end, waits `steps` ticks, and raises failures[item] at its start when given."""
    failures = failures or {}

    async def handle(item):
        recorder.append(f"start:{item}")
        if item in failures:
            raise failures[item]
        try:
            for _ in range(steps):
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            recorder.append(f"cancelled:{item}")
            raise
        recorder.append(f"end:{item}")
        return item.upper()

    return handle


def make_slow_failure_handler(recorder):
    """'bad' fails after one tick; every other item waits until it is cancelled."""

    async def handle(item):
        try:
            await asyncio.sleep(0)
            if item == "bad":
                raise ValueError(f"invalid item {item}")
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            recorder.append(f"cancelled:{item}")
            raise

    return handle


def uses_except_star(function_name):
    tree = ast.parse(source)
    functions = [node for node in ast.walk(tree) if isinstance(node, ast.AsyncFunctionDef) and node.name == function_name]
    return any(isinstance(node, ast.TryStar) for function in functions for node in ast.walk(function))


@test("process_batch runs every handler at the same time and returns the results in item order")
async def _():
    recorder = []
    results = await mod.process_batch(["a", "b", "c"], make_handler(recorder))
    assert results == ["A", "B", "C"]
    assert recorder == ["start:a", "start:b", "start:c", "end:a", "end:b", "end:c"]


@test("a failing handler cancels the handlers still running before process_batch raises")
async def _():
    recorder = []
    error = await capture_error(lambda: mod.process_batch(["x", "bad", "y", "z"], make_slow_failure_handler(recorder)))
    cancelled = sorted(recorder)
    assert error is not None
    assert cancelled == ["cancelled:x", "cancelled:y", "cancelled:z"]


@test("process_batch raises an ExceptionGroup that holds the original exception")
async def _():
    recorder = []
    error = await capture_error(lambda: mod.process_batch(["x", "bad"], make_slow_failure_handler(recorder)))
    kind = type(error).__name__
    inner = [type(exception).__name__ for exception in getattr(error, "exceptions", [])]
    assert kind == "ExceptionGroup"
    assert inner == ["ValueError"]


@test("handle_failures returns the results and zero counts when every handler succeeds")
async def _():
    report = await mod.handle_failures(["a", "b"], make_handler([]))
    assert report == {"results": ["A", "B"], "invalid": 0, "unavailable": 0}


@test("handle_failures counts each kind of failure, including several that fail together")
async def _():
    failures = {"bad-1": ValueError("bad-1"), "down": ConnectionError("down"), "bad-2": ValueError("bad-2")}
    report = await mod.handle_failures(["ok", "bad-1", "down", "bad-2", "late"], make_handler([], failures, steps=3))
    assert report == {"results": None, "invalid": 2, "unavailable": 1}


@test("handle_failures uses except* and lets any other exception type propagate in a group")
async def _():
    failures = {"bad": ValueError("bad"), "missing": KeyError("missing")}
    error = await capture_error(lambda: mod.handle_failures(["bad", "missing", "ok"], make_handler([], failures, steps=3)))
    kind = type(error).__name__
    inner = [type(exception).__name__ for exception in getattr(error, "exceptions", [])]
    assert kind == "ExceptionGroup"
    assert inner == ["KeyError"]
    assert uses_except_star("handle_failures")
