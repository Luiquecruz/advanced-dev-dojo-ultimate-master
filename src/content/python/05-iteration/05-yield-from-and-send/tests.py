def nest(value, depth):
    for _ in range(depth):
        value = [value]
    return value


def job():
    yield "a"
    yield "b"
    return {"processed": 2}


def silent():
    yield 1


def delegating():
    summary = yield from job()
    yield summary["processed"]
    return "done"


def failing():
    yield 1
    raise ValueError("bad row 2")


@test("flatten yields every leaf of a deep, mixed nesting in order")
def _():
    mixed = [1, (2, [3, (4,)]), range(5, 7), (number for number in [7, 8]), [[[]]], 9]
    leaves = list(mod.flatten(mixed))
    deep_leaves = list(mod.flatten([nest(7, 100), 8]))
    assert leaves == [1, 2, 3, 4, 5, 6, 7, 8, 9]
    assert deep_leaves == [7, 8]


# beginner mistake: flatten descends into every iterable, so a str recurses into its own characters forever
@test("flatten keeps strings and bytes whole at any depth")
def _():
    leaves = list(mod.flatten(["ab", [b"cd", ("ef", ["g"])], "", []]))
    assert leaves == ["ab", b"cd", "ef", "g", ""]


@test("running_average yields None when primed, then the mean of every value sent so far")
def _():
    average = mod.running_average()
    primed = next(average)
    first = average.send(10)
    second = average.send(20)
    third = average.send(0)
    other = mod.running_average()
    next(other)
    independent = other.send(4)
    fractional = other.send(5)
    assert primed is None
    assert first == 10
    assert second == 15
    assert third == 10
    assert independent == 4
    assert fractional == 4.5


@test("collect returns the yielded items and the generator's return value")
def _():
    items, result = mod.collect(job())
    plain_items, plain_result = mod.collect(silent())
    outer_items, outer_result = mod.collect(delegating())
    assert items == ["a", "b"]
    assert result == {"processed": 2}
    assert plain_items == [1]
    assert plain_result is None
    assert outer_items == ["a", "b", 2]
    assert outer_result == "done"


@test("tracked runs its cleanup exactly once, whether it is exhausted, closed early or stopped by an error")
async def _():
    exhausted_log = []
    exhausted = list(mod.tracked([1, 2], exhausted_log))
    early_log = []
    early = mod.tracked([1, 2, 3], early_log)
    head = next(early)
    before_close = list(early_log)
    early.close()
    early.close()
    failed_log = []
    error = await capture_error(lambda: list(mod.tracked(failing(), failed_log)))
    assert exhausted == [1, 2]
    assert exhausted_log == ["closed"]
    assert head == 1
    assert before_close == []
    assert early_log == ["closed"]
    assert isinstance(error, ValueError)
    assert failed_log == ["closed"]
