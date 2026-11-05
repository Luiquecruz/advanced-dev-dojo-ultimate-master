import csv
from pathlib import Path, PurePosixPath
from typing import BinaryIO


def build_path(*parts: str) -> PurePosixPath:
    return PurePosixPath(*parts)


def write_report(directory: Path, rows: list[list[str]]) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "report.csv"
    with path.open("w", encoding="utf-8", newline="") as file:
        csv.writer(file).writerows(rows)
    return path


def read_report(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8", newline="") as file:
        return list(csv.reader(file))


def copy_stream(source: BinaryIO, target: BinaryIO, chunk_size: int) -> int:
    if chunk_size < 1:
        raise ValueError(f"chunk_size must be at least 1, got {chunk_size}")
    copied = 0
    while True:
        chunk = source.read(chunk_size)
        if not chunk:
            return copied
        target.write(chunk)
        copied += len(chunk)


def safe_join(base: Path, name: str) -> Path:
    root = Path(base).resolve()
    candidate = (root / name).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError(f"{name!r} escapes {root}")
    return candidate
