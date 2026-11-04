import inspect
from itertools import islice


class CountingSource:
    """An iterable that records how many items have been pulled from it."""

    def __init__(self, items):
        self.items = list(items)
        self.reads = 0

    def __iter__(self):
        for item in self.items:
            self.reads += 1
            yield item


def drain(iterable, limit=50):
    """Reads at most limit items, so a wrong infinite result fails fast instead of hanging."""
    return list(islice(iterable, limit))


@test("read_blocks groups the lines between blank lines, including a last block with no blank line after it")
def _():
    lines = ["", "host=a", "port=1", "", "", "host=b", "   ", "host=c", "port=3"]
    blocks = drain(mod.read_blocks(lines))
    only_blank = drain(mod.read_blocks(["", "  ", ""]))
    assert blocks == [["host=a", "port=1"], ["host=b"], ["host=c", "port=3"]]
    assert only_blank == []


@test("read_blocks reads its source only as far as the block it yields")
def _():
    source = CountingSource(["a1", "a2", "", "b1", "", "c1"])
    blocks = mod.read_blocks(source)
    reads_before = source.reads
    first = next(blocks)
    reads_after_first = source.reads
    assert reads_before == 0
    assert first == ["a1", "a2"]
    assert reads_after_first == 3


@test("take yields at most count items and never pulls one more from its source")
def _():
    source = CountingSource(range(1, 101))
    first_three = drain(mod.take(3, source))
    reads = source.reads
    numbers = iter(range(10))
    first_pair = drain(mod.take(2, numbers))
    second_pair = drain(mod.take(2, numbers))
    short = drain(mod.take(5, ["x", "y"]))
    untouched = CountingSource(["a", "b"])
    nothing = drain(mod.take(0, untouched))
    assert first_three == [1, 2, 3]
    assert reads == 3
    assert first_pair == [0, 1]
    assert second_pair == [2, 3]
    assert short == ["x", "y"]
    assert nothing == []
    assert untouched.reads == 0


@test("id_sequence produces prefixed ids without end, a new sequence per call")
def _():
    orders = mod.id_sequence("ord")
    first = [next(orders), next(orders), next(orders)]
    fourth = next(orders)
    invoices = mod.id_sequence("inv")
    other = next(invoices)
    thousandth = drain(mod.id_sequence("x"), 1000)[-1]
    assert first == ["ord-1", "ord-2", "ord-3"]
    assert fourth == "ord-4"
    assert other == "inv-1"
    assert thousandth == "x-1000"


@test("read_blocks, take and id_sequence return generator objects")
def _():
    results = {
        "read_blocks": mod.read_blocks([]),
        "take": mod.take(2, []),
        "id_sequence": mod.id_sequence("a"),
    }
    kinds = {name: inspect.isgenerator(value) for name, value in results.items()}
    assert kinds == {"read_blocks": True, "take": True, "id_sequence": True}
