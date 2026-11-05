import contextlib
import io
import shutil
from pathlib import Path, PurePosixPath


class RecordingReader(io.BytesIO):
    """A binary source that remembers the size of every read."""

    def __init__(self, data):
        super().__init__(data)
        self.sizes = []

    def read(self, size=-1):
        self.sizes.append(size)
        return super().read(size)


@contextlib.contextmanager
def scratch(name):
    """A fresh, resolved directory under /tmp, removed afterwards."""
    root = Path("/tmp") / f"dojo-pathlib-{name}"
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True)
    try:
        yield root.resolve()
    finally:
        shutil.rmtree(root, ignore_errors=True)


@test("build_path joins parts with forward slashes and restarts at an absolute part")
def _():
    key = mod.build_path("reports", "2026", "q4.csv")
    kind = type(key).__name__
    text = str(key)
    restarted = mod.build_path("reports", "/etc/passwd")
    assert kind == "PurePosixPath"
    assert text == "reports/2026/q4.csv"
    assert restarted == PurePosixPath("/etc/passwd")


@test("write_report creates the directory and round-trips cells with commas, quotes, line breaks and accents")
def _():
    rows = [["name", "note"], ["Ada, Countess of Lovelace", 'said "hi"'], ["Zoë", "line one\nline two"]]
    with scratch("report") as root:
        directory = root / "exports" / "2026"
        path = mod.write_report(directory, rows)
        expected = directory / "report.csv"
        assert path == expected
        assert "Zoë".encode("utf-8") in path.read_bytes()
        loaded = mod.read_report(path)
        assert loaded == rows


@test("copy_stream copies every byte in reads of at most chunk_size and returns the count")
async def _():
    data = bytes(range(10))
    source = RecordingReader(data)
    target = io.BytesIO()
    copied = mod.copy_stream(source, target, 4)
    oversized = [size for size in source.sizes if size is None or size < 1 or size > 4]
    assert copied == 10
    assert target.getvalue() == data
    assert oversized == []
    empty = mod.copy_stream(io.BytesIO(b""), io.BytesIO(), 4)
    assert empty == 0
    error = await capture_error(lambda: mod.copy_stream(io.BytesIO(data), io.BytesIO(), 0))
    assert isinstance(error, ValueError)


@test("safe_join returns resolved paths inside the base directory")
def _():
    with scratch("inside") as root:
        base = root / "data"
        base.mkdir()
        inside = mod.safe_join(base, "reports/q4.csv")
        normalized = mod.safe_join(base, "reports/../q4.csv")
        assert inside == base / "reports" / "q4.csv"
        assert normalized == base / "q4.csv"


@test("safe_join rejects names that escape the base directory")
def _():
    with scratch("escape") as root:
        base = root / "data"
        base.mkdir()
        (root / "data-evil").mkdir()
        (root / "outside").mkdir()
        (base / "link").symlink_to(root / "outside", target_is_directory=True)
        names = ["../x", "/etc/passwd", "a/../../x", "../data-evil/x", "link/secret.txt"]
        escaped = []
        for name in names:
            try:
                mod.safe_join(base, name)
            except ValueError:
                continue
            escaped.append(name)
        assert escaped == []
