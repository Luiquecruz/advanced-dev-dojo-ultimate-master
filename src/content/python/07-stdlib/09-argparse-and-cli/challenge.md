The finance team records expenses with a small `expenses` command that appends to a JSON Lines ledger. Its first version read `sys.argv` by hand, could not be tested, rounded `12.345` silently and once printed a note that cleared an operator's terminal. Rebuild its command-line layer in `main.py` so tests drive it with plain lists. The ledger helpers (`read_entries`, `append_entry`), the subcommand handlers (`run_add`, `run_list`) and the constants are already written.

```text
expenses --ledger team.jsonl add 12.5 --category meals --note "client lunch"
expenses --ledger team.jsonl list --category travel
```

## `money(text)`

The `type=` function for amounts. Returns a `Decimal` with exactly two decimal places (`"12.5"` → `Decimal("12.50")`, `"10000"` → `Decimal("10000.00")`). Raises `argparse.ArgumentTypeError` when the text:

- is longer than `MAX_AMOUNT_LENGTH` characters (check before converting);
- is not a number `Decimal` can read (`"abc"`, `""`);
- is not finite (`"nan"`, `"Infinity"`), or lies outside `CENT`..`MAX_AMOUNT` (`"0"`, `"-3"`, `"10000.01"`);
- is not a whole number of cents (`"12.345"`): reject it, never round it.

## `note_text(text)`

The `type=` function for notes. Returns the text unchanged, shell characters included (it is data, never a command). Raises `argparse.ArgumentTypeError` when it is longer than `MAX_NOTE_LENGTH` characters or holds a control character (line breaks, tabs, `\x1b` escape sequences): `str.isprintable()` tells.

## `build_parser()`

Returns an `argparse.ArgumentParser` with `prog="expenses"` and:

- `--ledger`, required, converted to a `Path`, written before the subcommand;
- required subcommands stored in `args.command`:
  - `add`: a positional `amount` (`type=money`), a required `--category` with `choices=CATEGORIES`, and `--note` (`type=note_text`, default `""`);
  - `list`: an optional `--category` with `choices=CATEGORIES` (default `None`);
- each subcommand stores its handler with `set_defaults(handler=run_add)` or `handler=run_list`.

Options and positionals may come in any order inside a subcommand, and `--category=travel` works like `--category travel`. Unknown commands, missing arguments and bad values make `parse_args` raise `SystemExit` with code `2` after printing the usage to stderr: that is argparse's behavior, so do not change it.

## `main(argv=None, out=None, err=None)`

- `out` and `err` default to `None`, meaning the `sys.stdout` and `sys.stderr` in effect **when `main` runs**.
- Parses `argv`; only when `argv` is `None` does argparse read `sys.argv[1:]`.
- Everything argparse prints goes to the streams `main` received: `--help` to `out`, usage and errors to `err`.
- Returns the exit code instead of raising: `0` after `--help`, `2` for a usage error (nothing is written to the ledger), otherwise what the handler returns, `args.handler(args, out, err)`: `0`, or `1` when `list` finds no ledger file.
- Never calls `print` without `file=` and never calls `sys.exit`.

The last line, `raise SystemExit(main())`, is the only place where the process exits.
