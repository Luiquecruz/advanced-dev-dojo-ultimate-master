class CountingSource:
    """An iterable that records how many items have been pulled from it."""

    def __init__(self, items):
        self.items = list(items)
        self.reads = 0

    def __iter__(self):
        for item in self.items:
            self.reads += 1
            yield item


def event(status, at):
    return {"status": status, "service": "billing", "at": at}


@test("batches yields tuples of size records and a shorter last batch")
async def _():
    groups = list(mod.batches(range(7), 3))
    exact = list(mod.batches("abcd", 2))
    empty = list(mod.batches([], 3))
    error = await capture_error(lambda: list(mod.batches([1, 2], 0)))
    assert groups == [(0, 1, 2), (3, 4, 5), (6,)]
    assert exact == [("a", "b"), ("c", "d")]
    assert empty == []
    assert isinstance(error, ValueError)


@test("batches reads records only as each batch is requested, from any iterable")
def _():
    source = CountingSource(range(1, 11))
    stream = mod.batches(source, 4)
    reads_before = source.reads
    first = next(stream)
    reads_after_first = source.reads
    rest = list(stream)
    assert reads_before == 0
    assert first == (1, 2, 3, 4)
    assert reads_after_first == 4
    assert rest == [(5, 6, 7, 8), (9, 10)]


# beginner mistake: runs sorts the events by status before groupby (or counts them in a dict), which merges runs that are apart
@test("runs counts consecutive statuses and starts a new run when a status comes back")
def _():
    statuses = ["ok", "ok", "error", "ok", "ok", "ok", "timeout", "timeout"]
    result = mod.runs(event(status, at) for at, status in enumerate(statuses))
    empty = mod.runs([])
    assert result == [("ok", 2), ("error", 1), ("ok", 3), ("timeout", 2)]
    assert empty == []


@test("running_totals returns the cumulative sum after each amount")
def _():
    totals = mod.running_totals([5, 10, -3, 0, 8])
    from_generator = mod.running_totals(amount for amount in [1.5, 2.5])
    empty = mod.running_totals([])
    assert totals == [5, 15, 12, 12, 20]
    assert from_generator == [1.5, 4.0]
    assert empty == []


@test("transitions lists each change between adjacent statuses, in order")
def _():
    changes = mod.transitions(["ok", "ok", "error", "error", "ok", "timeout"])
    steady = mod.transitions(["ok", "ok", "ok"])
    single = mod.transitions(["ok"])
    from_generator = mod.transitions(status for status in ["up", "down", "down", "up"])
    assert changes == [("ok", "error"), ("error", "ok"), ("ok", "timeout")]
    assert steady == []
    assert single == []
    assert from_generator == [("up", "down"), ("down", "up")]
