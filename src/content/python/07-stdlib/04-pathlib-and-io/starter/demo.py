import io
import shutil
from pathlib import Path

from main import build_path, copy_stream, read_report, safe_join, write_report

print("object key:", build_path("exports", "2026", "q4.csv"))

base = Path("/tmp/dojo-pathlib-demo/public")
try:
    report = write_report(base / "reports", [["customer", "note"], ["Zoë", 'paid "in full", thanks']])
    print("written:", report.relative_to(base), "| rows:", read_report(report))

    upload = io.BytesIO(b"x" * 10_000)
    stored = io.BytesIO()
    print("copied bytes:", copy_stream(upload, stored, 4096))

    for name in ("reports/report.csv", "../../etc/passwd", "/etc/passwd"):
        try:
            print("serving:", safe_join(base, name).relative_to(base.resolve()))
        except ValueError as error:
            print("refused:", error)
finally:
    shutil.rmtree(base.parent, ignore_errors=True)
