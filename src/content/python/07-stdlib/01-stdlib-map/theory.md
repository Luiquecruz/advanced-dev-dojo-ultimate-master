**Question this module answers:** which standard-library module handles each everyday task, and which defaults lose data silently?

Python ships these tools with the interpreter, so a program needs no extra package for them. Each one has a default that is convenient and a case where it quietly gives the wrong answer; every lesson of this module builds the safe version.

**Prerequisites:** modules 01 to 06, especially exceptions and `with` (module 06): most lessons open files, raise `ValueError` for bad input, or both.

## The path: task to module

| Task | Standard library | Lesson |
| --- | --- | --- |
| Find, extract or mask text with a known shape | `re` | 02 |
| Build paths, read and write files, stream bytes | `pathlib`, `io`, `tempfile` | 03 |
| Exact money and ratios | `decimal`, `fractions` | 04 |
| Instants, durations, calendar months | `datetime` | 05 |
| Exchange data with other programs | `json` | 06 |
| A closed set of named values | `enum` | 07 |
| Diagnostics for operators | `logging` | 08 |
| Command-line options and exit codes | `argparse` | 09 |
| Choose these defaults for one billing tool | an ADR | 10 |

Defaults that lose data without an error: `json` turns tuples into lists and int keys into strings, a float holds only 15 to 17 significant decimal digits, a `datetime` without `tzinfo` is naive and means nothing across machines, and `Path("/srv") / user_text` jumps to the root when the text is absolute.

## Dangerous by design

- `pickle` and `shelve` (built on pickle): loading can run code. `marshal` is not safe against malicious data either. Never load them from untrusted input; `json` is the safe default.
- `eval`/`exec` on text, and `subprocess` with `shell=True` and user input.
- `yaml.load` from the third-party PyYAML without a safe loader.
- XML parsers on attacker-controlled documents: read the XML security section of the docs first.

## argparse

The sandbox has no shell, so lesson 09 tests a CLI the way production code does: `main(argv)` receives an explicit list of arguments and returns an exit code. Declare validation in the parser: `type=int` or your own function, `choices=[...]`. On bad input `parse_args` prints usage to stderr and raises `SystemExit(2)`. That is a `BaseException`, so `except Exception` does not stop it; `exit_on_error=False` raises `argparse.ArgumentError` instead. Never accept secrets as flags (other users can see them in process lists and shell history), and when a CLI starts a program, pass `subprocess.run` a list of arguments, never a shell string built from input.

## When to choose it

Reach for the standard library first and add a package only for a gap you can name. The module ends with an ADR: the decisions practiced in each lesson (exact money type, aware UTC timestamps, JSON over pickle, a configured logger) come together for one tool, with numbers you compute.
