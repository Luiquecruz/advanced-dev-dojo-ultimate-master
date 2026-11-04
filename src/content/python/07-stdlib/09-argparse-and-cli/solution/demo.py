import io
import shlex
import tempfile
from pathlib import Path

from main import main

sessions = [
    ["add", "12.5", "--category", "meals", "--note", "client lunch"],
    ["add", "--category=travel", "20"],
    ["add", "12.345", "--category", "meals"],
    ["add", "5", "--category", "meals", "--note", "lunch\x1b[2J"],
    ["refund", "5"],
    ["list"],
    ["list", "--category", "travel"],
]

with tempfile.TemporaryDirectory() as directory:
    ledger = str(Path(directory) / "team.jsonl")
    for words in sessions:
        out, err = io.StringIO(), io.StringIO()
        code = main(["--ledger", ledger, *words], out, err)
        command = shlex.join(["expenses", "--ledger", "team.jsonl", *words]).replace("\x1b", "\\x1b")
        print(f"$ {command}  ->  exit {code}")
        for line in out.getvalue().splitlines():
            print(f"    out: {line}")
        for line in err.getvalue().splitlines():
            print(f"    err: {line}")
