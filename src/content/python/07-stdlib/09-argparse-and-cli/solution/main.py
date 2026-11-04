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
    if len(text) > MAX_AMOUNT_LENGTH:
        raise argparse.ArgumentTypeError(f"amount longer than {MAX_AMOUNT_LENGTH} characters")
    try:
        amount = Decimal(text)
    except InvalidOperation:
        raise argparse.ArgumentTypeError(f"not a decimal amount: {text!r}") from None
    if not amount.is_finite() or amount < CENT or amount > MAX_AMOUNT:
        raise argparse.ArgumentTypeError(f"amount must be between {CENT} and {MAX_AMOUNT}: {text!r}")
    cents = amount.quantize(CENT)
    if cents != amount:
        raise argparse.ArgumentTypeError(f"more than 2 decimal places: {text!r}")
    return cents


def note_text(text: str) -> str:
    """Accepts a short, printable note; control characters could rewrite the terminal that lists it."""
    if len(text) > MAX_NOTE_LENGTH:
        raise argparse.ArgumentTypeError(f"note longer than {MAX_NOTE_LENGTH} characters")
    if not text.isprintable():
        raise argparse.ArgumentTypeError("note contains control characters")
    return text


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="expenses", description="Record team expenses in a JSON Lines ledger.")
    parser.add_argument("--ledger", required=True, type=Path, help="ledger file, one JSON entry per line")
    commands = parser.add_subparsers(dest="command", required=True)

    add = commands.add_parser("add", help="record one expense")
    add.add_argument("amount", type=money, help=f"amount with at most 2 decimal places, up to {MAX_AMOUNT}")
    add.add_argument("--category", required=True, choices=CATEGORIES)
    add.add_argument("--note", type=note_text, default="", help=f"up to {MAX_NOTE_LENGTH} printable characters")
    add.set_defaults(handler=run_add)

    listing = commands.add_parser("list", help="print the entries and their total")
    listing.add_argument("--category", choices=CATEGORIES, help="only this category")
    listing.set_defaults(handler=run_list)
    return parser


def main(argv: list[str] | None = None, out: TextIO | None = None, err: TextIO | None = None) -> int:
    out = sys.stdout if out is None else out
    err = sys.stderr if err is None else err
    parser = build_parser()
    try:
        with redirect_stdout(out), redirect_stderr(err):
            args = parser.parse_args(argv)
    except SystemExit as stop:
        if stop.code is None:
            return 0
        return stop.code if isinstance(stop.code, int) else 1
    return args.handler(args, out, err)


if __name__ == "__main__":
    raise SystemExit(main())
