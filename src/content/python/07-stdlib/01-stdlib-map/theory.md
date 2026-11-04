**Question this module answers:** which batteries replace which npm packages, and which defaults lose data silently?

Python ships the tools a JavaScript project installs. Each one has a default that is convenient and a case where it quietly gives the wrong answer; every lesson of this module builds the safe version.

## Coming from TypeScript and JavaScript

| npm habit | Standard library | Lesson |
| --- | --- | --- |
| `JSON.parse`/`stringify`, superjson | `json` | 02 |
| `RegExp` | `re` | 03 |
| `path`, `fs` | `pathlib`, `io`, `tempfile` | 04 |
| decimal.js, big.js | `decimal`, `fractions` | 05 |
| date-fns, Luxon | `datetime` | 06 |
| TS `enum`, string unions | `enum` | 07 |
| `console.log`, pino | `logging` | 08 |
| commander, yargs | `argparse` | theory only |

Defaults that lose data without an error: `json` turns tuples into lists and int keys into strings, a float holds only 15 to 17 significant decimal digits, a `datetime` without `tzinfo` is naive and means nothing across machines, and `Path("/srv") / user_text` jumps to the root when the text is absolute.

## Dangerous by design

- `pickle` and `shelve` (built on pickle): loading can run code. `marshal` is not safe against malicious data either. Never load them from untrusted input; `json` is the safe default.
- `eval`/`exec` on text, and `subprocess` with `shell=True` and user input.
- `yaml.load` from the third-party PyYAML without a safe loader.
- XML parsers on attacker-controlled documents: read the XML security section of the docs first.

## argparse, theory only

The sandbox has no command line, so this module only describes `argparse`. Declare validation in the parser: `type=int` or your own function, `choices=[...]`. On bad input `parse_args` prints usage to stderr and raises `SystemExit(2)`. That is a `BaseException`, so `except Exception` does not stop it; `exit_on_error=False` raises `argparse.ArgumentError` instead. Never accept secrets as flags (other users can see them in process lists and shell history), and when a CLI starts a program, pass `subprocess.run` a list of arguments, never a shell string built from input.

## The path

JSON encoders and decoders, regular expressions without catastrophic backtracking, paths that cannot escape a base directory, exact money, timezone-aware time, enums, and logging that redacts secrets.

## When to choose it

Reach for the standard library first and add a package only for a gap you can name. The module ends with `08-logging` and no ADR: the decisions (exact money type, aware UTC timestamps, JSON over pickle, a configured logger) are tested inside each lesson.
