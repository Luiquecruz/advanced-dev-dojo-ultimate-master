import ast
import io


class Reader:
    """A read(size) callable over an in-memory stream that records every call."""

    def __init__(self, data):
        self.stream = io.BytesIO(data) if isinstance(data, bytes) else io.StringIO(data)
        self.calls = 0
        self.calls_after_end = 0
        self.ended = False

    def __call__(self, size):
        if self.ended:
            self.calls_after_end += 1
            if self.calls_after_end > 3:
                raise RuntimeError("read was called again and again after it returned an empty chunk")
        self.calls += 1
        chunk = self.stream.read(size)
        if not chunk:
            self.ended = True
        return chunk


def constructs_in(function_name):
    tree = ast.parse(source)
    functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef) and node.name == function_name]
    nodes = [child for function in functions for child in ast.walk(function)]
    found = set()
    if any(isinstance(node, ast.NamedExpr) for node in nodes):
        found.add(":=")
    if any(isinstance(node, ast.For) and node.orelse for node in nodes):
        found.add("for/else")
    return found


@test("read_chunks keeps every non-empty chunk and stops at the first empty read")
def _():
    uneven = Reader(b"abcdefg")
    exact = Reader(b"abcdef")
    empty = Reader(b"")
    text = Reader("hello world")
    uneven_chunks = mod.read_chunks(uneven, 3)
    exact_chunks = mod.read_chunks(exact, 3)
    empty_chunks = mod.read_chunks(empty, 4)
    text_chunks = mod.read_chunks(text, 5)
    assert uneven_chunks == [b"abc", b"def", b"g"]
    assert exact_chunks == [b"abc", b"def"]
    assert empty_chunks == []
    assert text_chunks == ["hello", " worl", "d"]
    calls = [uneven.calls, exact.calls, empty.calls, text.calls]
    after_end = [uneven.calls_after_end, exact.calls_after_end, empty.calls_after_end, text.calls_after_end]
    assert calls == [4, 3, 1, 4]
    assert after_end == [0, 0, 0, 0]


@test("find_first returns the index and item of the first match and stops calling the predicate")
def _():
    checked = []

    def is_even(number):
        checked.append(number)
        return number % 2 == 0

    first_even = mod.find_first([3, 5, 8, 10, 12], is_even)
    from_generator = mod.find_first((word for word in ["a", "bb", "ccc"]), lambda word: len(word) > 1)
    falsy_item = mod.find_first([5, 0, 3], lambda number: number == 0)
    assert first_even == (2, 8)
    assert checked == [3, 5, 8]
    assert from_generator == (1, "bb")
    assert falsy_item == (1, 0)


@test("find_first returns None when nothing matches, including for empty input")
def _():
    checked = []

    def is_even(number):
        checked.append(number)
        return number % 2 == 0

    no_match = mod.find_first([1, 3, 5], is_even)
    empty = mod.find_first([], is_even)
    assert no_match is None
    assert checked == [1, 3, 5]
    assert empty is None


@test("parse_pairs keeps each parsed pair and calls the parser once per line")
def _():
    calls = []

    def counting_parse(line):
        calls.append(line)
        return mod.parse_line(line)

    lines = ["# settings", "host = db.local", "", "port=5432", "broken line", "=no key", "host = replica"]
    settings = mod.parse_pairs(lines, counting_parse)
    from_generator = mod.parse_pairs(line for line in ["debug = true", "level=3"])
    assert settings == {"host": "replica", "port": "5432"}
    assert calls == lines
    assert from_generator == {"debug": "true", "level": "3"}


@test("read_chunks and parse_pairs use :=, and find_first uses for/else")
def _():
    required = {"read_chunks": ":=", "find_first": "for/else", "parse_pairs": ":="}
    missing = [f"{name} needs {construct}" for name, construct in required.items() if construct not in constructs_in(name)]
    assert missing == []
