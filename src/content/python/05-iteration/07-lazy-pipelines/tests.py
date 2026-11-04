import inspect
from itertools import islice

LINES = [
    "INFO service started",
    "ERROR disk full",
    "DEBUG cache warm",
    "ERROR timeout calling billing",
    "WARNING slow query",
    "ERROR disk full",
    "INFO shutting down",
    "ERROR lost connection",
]


def messages(chunk):
    return [record["message"] for record in chunk]


@test("Source hands out lines one at a time, counts reads and records close()")
def _():
    source = mod.Source(["a", "b"])
    returns_itself = iter(source) is source
    first = next(source)
    reads_after_first = source.reads
    rest = list(islice(source, 10))
    reads_at_end = source.reads
    closed_before = source.closed
    source.close()
    source.close()
    assert returns_itself is True
    assert first == "a"
    assert reads_after_first == 1
    assert rest == ["b"]
    assert reads_at_end == 2
    assert closed_before is False
    assert source.closed is True


@test("the pipeline reads nothing when built and only the lines each chunk needs")
def _():
    source = mod.Source(LINES)
    chunks = mod.pipeline(source, size=2)
    is_generator = inspect.isgenerator(chunks)
    reads_before = source.reads
    first = messages(next(chunks))
    reads_after_first = source.reads
    second = messages(next(chunks))
    reads_after_second = source.reads
    assert is_generator is True
    assert reads_before == 0
    assert first == ["disk full", "timeout calling billing"]
    assert reads_after_first == 4
    assert second == ["disk full", "lost connection"]
    assert reads_after_second == 8


@test("closing the pipeline early closes its source, and so does running it to the end")
def _():
    source = mod.Source(LINES)
    chunks = mod.pipeline(source, size=2)
    next(chunks)
    open_while_paused = source.closed
    chunks.close()
    closed_after_close = source.closed
    reads = source.reads
    full_source = mod.Source(LINES)
    sizes = [len(chunk) for chunk in mod.pipeline(full_source, size=3)]
    default_sizes = [len(chunk) for chunk in mod.pipeline(mod.Source(["ERROR disk full"] * 150))]
    assert open_while_paused is False
    assert closed_after_close is True
    assert reads == 4
    assert sizes == [3, 1]
    assert full_source.closed is True
    assert default_sizes == [100, 50]


@test("a malformed line raises ValueError naming the line, stops reading and still closes the source")
async def _():
    source = mod.Source(["ERROR disk full", "garbage-without-level", "ERROR never reached"])
    error = await capture_error(lambda: list(mod.pipeline(source, size=5)))
    assert isinstance(error, ValueError)
    assert "garbage-without-level" in str(error)
    assert source.reads == 2
    assert source.closed is True


@test("parse, only_errors and chunked work as separate lazy stages")
def _():
    records = list(mod.parse(["INFO up\n", "   ", "ERROR disk full\n"]))
    errors = list(mod.only_errors(records))
    chunks = list(mod.chunked(range(5), 2))
    late = mod.parse(["INFO fine", "FATAL unknown level"])
    first = next(late)
    stages = [mod.parse([]), mod.only_errors([]), mod.chunked([], 1)]
    kinds = [inspect.isgenerator(stage) for stage in stages]
    assert records == [{"level": "INFO", "message": "up"}, {"level": "ERROR", "message": "disk full"}]
    assert errors == [{"level": "ERROR", "message": "disk full"}]
    assert chunks == [[0, 1], [2, 3], [4]]
    assert first == {"level": "INFO", "message": "fine"}
    assert kinds == [True, True, True]
