"""Grades one lesson project with the real harness (src/engines/python/runtime/dojo_harness.py) under CPython.

Reads `{"files": {...}, "entry": "main.py", "tests": "<tests.py source>", "names": [...]}` on stdin and writes the
harness result as JSON to the file named by the first argument (stdout belongs to the learner code). Run by tests/python/test_lessons.py in a child process with DOJO_APP_DIRECTORY and
DOJO_SCRATCH_DIRECTORIES pointing at a temporary directory, never directly.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNTIME = HERE.parents[1] / "src" / "engines" / "python" / "runtime"


def main():
    if "DOJO_APP_DIRECTORY" not in os.environ or "DOJO_SCRATCH_DIRECTORIES" not in os.environ:
        sys.exit("run_lesson.py needs DOJO_APP_DIRECTORY and DOJO_SCRATCH_DIRECTORIES: the harness deletes new files in its scratch directories.")
    request = json.load(sys.stdin)
    sys.path[:0] = [str(HERE / "stubs"), str(RUNTIME)]
    import dojo_harness

    result = asyncio.run(dojo_harness.run_tests(request["files"], request["entry"], request["tests"], request["names"]))
    Path(sys.argv[1]).write_text(json.dumps(result))


if __name__ == "__main__":
    main()
