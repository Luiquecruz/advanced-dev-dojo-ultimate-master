import csv
from pathlib import Path, PurePosixPath
from typing import BinaryIO


def build_path(*parts: str) -> PurePosixPath:
    # TODO: return a PurePosixPath instead of a string.
    return "/".join(parts)


def write_report(directory: Path, rows: list[list[str]]) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    # TODO: write the rows with the csv module, encoding="utf-8" and newline="".
    # Joining cells with commas breaks on commas, quotes and line breaks.
    path = directory / "report.csv"
    path.write_text("\n".join(",".join(row) for row in rows))
    return path


def read_report(path: Path) -> list[list[str]]:
    # TODO: read the rows back with csv.reader.
    return [line.split(",") for line in path.read_text().splitlines()]


def copy_stream(source: BinaryIO, target: BinaryIO, chunk_size: int) -> int:
    # TODO: validate chunk_size, then copy in reads of at most chunk_size bytes until read() returns b"".
    data = source.read()
    target.write(data)
    return len(data)


def safe_join(base: Path, name: str) -> Path:
    # TODO: resolve both paths and raise ValueError unless the result stays inside base.
    return base / name
