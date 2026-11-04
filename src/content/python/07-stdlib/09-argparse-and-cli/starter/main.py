import argparse
import json
import sys
from contextlib import redirect_stderr, redirect_stdout
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import TextIO

CATEGORIES = ("meals", "software", "travel")
CENT = Decimal("0.01")
MAX_AMOUNT = Decimal("10000.00")
MAX_AMOUNT_LENGTH = 12
MAX_NOTE_LENGTH = 80


def read_entries(ledger: Path) -> list[dict[str, str]]:
    """Reads the JSON Lines ledger, one entry per line."""
    with ledger.open(encoding="utf-8") as file:
        return [json.loads(line) for line in file if line.strip()]


def append_entry(ledger: Path, entry: dict[str, str]) -> None:
    with ledger.open("a", encoding="utf-8") as file:
        file.write(json.dumps(entry) + "\n")


def run_add(args: argparse.Namespace, out: TextIO, err: TextIO) -> int:
    append_entry(args.ledger, {"amount": str(args.amount), "category": args.category, "note": args.note})
    print(f"added {args.amount} {args.category}", file=out)
    return 0


def run_list(args: argparse.Namespace, out: TextIO, err: TextIO) -> int:
    if not args.ledger.exists():
        print(f"expenses: error: no ledger at {args.ledger}", file=err)
        return 1
    entries = [entry for entry in read_entries(args.ledger) if args.category in (None, entry["category"])]
    for entry in entries:
        print(f"{entry['amount']} {entry['category']} {entry['note']}".rstrip(), file=out)
    total = sum((Decimal(entry["amount"]) for entry in entries), Decimal("0.00"))
    print(f"total {total}", file=out)
    return 0


def money(text: str) -> Decimal:
    """Converts an amount argument to Decimal cents, rejecting anything a ledger must not hold."""
    # TODO: raise argparse.ArgumentTypeError for text longer than MAX_AMOUNT_LENGTH, text Decimal cannot
    # read (InvalidOperation), non-finite values, amounts outside CENT..MAX_AMOUNT and more than 2 decimal
    # places. Return the amount quantized to cents ("12.5" becomes Decimal("12.50")).
    return Decimal(text)


def note_text(text: str) -> str:
    """Accepts a short, printable note; control characters could rewrite the terminal that lists it."""
    # TODO: raise argparse.ArgumentTypeError for notes longer than MAX_NOTE_LENGTH or with control characters.
    return text


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="expenses", description="Record team expenses in a JSON Lines ledger.")
    # TODO: a required --ledger option converted to a Path, then required subcommands stored in args.command:
    # "add": a positional amount (type=money), a required --category from CATEGORIES, an optional --note
    #        (type=note_text, default "") and handler=run_add through set_defaults;
    # "list": an optional --category from CATEGORIES and handler=run_list.
    return parser


def main(argv: list[str] | None = None, out: TextIO | None = None, err: TextIO | None = None) -> int:
    # TODO: use sys.stdout and sys.stderr only when out and err are None, at call time. Parse argv
    # (argparse reads sys.argv[1:] by itself when argv is None) with argparse's help and errors sent to out
    # and err, and return the exit code argparse chose instead of letting SystemExit escape.
    args = build_parser().parse_args(argv)
    return args.handler(args, out, err)


if __name__ == "__main__":
    raise SystemExit(main())
