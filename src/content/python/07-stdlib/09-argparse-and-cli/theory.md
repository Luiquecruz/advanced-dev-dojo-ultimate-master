# argparse and Testable Command-Line Tools

`argparse` turns a list of strings into a `Namespace`: it converts and validates each value, generates `--help`, and answers bad input with a usage message and exit code 2. Production code splits a CLI into two functions. `build_parser()` returns the parser, and `main(argv=None, out=None)` parses, does the work and **returns** an exit code. Only the last line of the file touches the process:

```py
import argparse
import sys


def build_parser():
    parser = argparse.ArgumentParser(prog="greet")
    parser.add_argument("name")
    parser.add_argument("--times", type=int, default=1)
    return parser


def main(argv=None, out=None):
    out = sys.stdout if out is None else out
    args = build_parser().parse_args(argv)        # argv=None reads sys.argv[1:]
    for _ in range(args.times):
        print(f"hello {args.name}", file=out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

main(["ada", "--times=2"])                        # a test passes a list: no shell, no process
```

## Coming from TypeScript and JavaScript

Node scripts often slice `process.argv`, split it by hand and call `process.exit` wherever a problem shows up:

```ts
const [command, amount] = process.argv.slice(2);
if (Number.isNaN(Number(amount))) {
  console.error("bad amount");
  process.exit(1);
}
```

Ported to Python, the same habit makes three mistakes:

```py
command, amount = sys.argv[1:3]        # 1. the global: a test cannot pass its own arguments
words = " ".join(sys.argv).split()     # 2. hand parsing: the note "client lunch" becomes two words
if not amount.replace(".", "").isdigit():
    sys.exit("bad amount")             # 3. raises SystemExit from a helper
```

Reading `sys.argv` means every test sees the test runner's own arguments. Parsing by hand makes option order, `--opt=value`, `--` and quoting your bugs. And `sys.exit` does not stop the process directly: it raises `SystemExit`, a **`BaseException`**, which slips past every `except Exception` and ends whatever called the helper (a worker, a web handler, a test runner). Only the entry point turns a return code into an exit.

## How it works

- `parse_args(args=None)` reads `sys.argv[1:]` only when `args` is `None`; a list is parsed as given, which is what makes `main(argv)` testable.
- `type=` is called with the raw string. A `ValueError` or `TypeError` becomes "invalid *name* value", an `argparse.ArgumentTypeError` becomes your message. Any other exception escapes as a traceback: `type=Decimal` crashes on `"abc"`, because `decimal.InvalidOperation` is an `ArithmeticError`, not a `ValueError`. Wrap such conversions in a small function.
- `choices=` restricts values, `required=True` makes an option mandatory, and `add_subparsers(dest="command", required=True)` gives each subcommand its own parser; `set_defaults(handler=run_add)` stores the function to dispatch to.
- On bad input `parser.error()` prints the usage to **stderr** and calls `sys.exit(2)`; `--help` prints to **stdout** and exits with 0. argparse looks up `sys.stdout` and `sys.stderr` when it writes, so `contextlib.redirect_stdout(out)` and `redirect_stderr(err)` route both to the streams `main` received, and `except SystemExit as stop: return stop.code` turns the exit back into a return value (`SystemExit()` carries `None`, which means 0, and `sys.exit("message")` carries a string, which means 1). The redirect replaces `sys.stdout` for the whole process, so keep it around `parse_args` only and never use it in code that runs on several threads. `exit_on_error=False` makes most errors raise `ArgumentError` instead, but subparsers do not inherit it and `--help` still exits.
- `def main(argv=None, out=sys.stdout)` evaluates `sys.stdout` once, at import time, so a later redirect or test capture is bypassed (the same trap as a mutable default). Default to `None` and resolve inside.
- Long options may be abbreviated (`--cat meals`) unless `allow_abbrev=False`, so a new option can make an old abbreviation ambiguous.

The usual exit codes: **0** success, **1** a runtime failure (missing file), **2** a usage error, which is argparse's choice.

## Security note

Arguments are untrusted input: they come from users, scripts, CI files and other programs. Validate them at the edge with `type=` and `choices=`, bound their length before converting, and reject instead of repairing (`12.345` is an error, not `12.34`). Never hand them to a shell: `subprocess.run(f"git log {ref}", shell=True)` with `ref = "main; rm -rf ~"` runs a second command. Pass a list, `subprocess.run(["git", "log", "--", ref], check=True)`, and keep `shlex.quote` as a last resort. Text echoed to a terminal can carry escape sequences (`\x1b[2J` clears the screen, others rewrite earlier lines), so reject control characters with `str.isprintable()` or print values with `!r`. Never take secrets as flags: other users see arguments in `ps` and shells keep them in history; read an environment variable, a file named by a flag, or `getpass.getpass()`.

> **Status as of November 2026:** Python 3.14 added the `color` parameter (on by default: help and usage are coloured when the terminal supports it) and `suggest_on_error` to `ArgumentParser`; Python 3.15 (October 2026) turned `suggest_on_error` on by default. `deprecated=True` for arguments and subcommands exists since 3.13. The dojo runs CPython 3.14.

## When to choose it

- **argparse** for standard-library tools, scripts shipped inside a project and anything that must run without dependencies, always as `build_parser()` plus `main(argv) -> int`.
- **Click or Typer** (third party) when a CLI grows nested command groups, prompts or shell completion; their test runners follow the same idea: pass argv, capture output, check the exit code.
- **`sys.argv`** only in a throwaway script, and even there argparse costs three lines.
- Keep the logic in importable functions: the CLI is a thin adapter that parses, validates, calls, prints and returns a code.
