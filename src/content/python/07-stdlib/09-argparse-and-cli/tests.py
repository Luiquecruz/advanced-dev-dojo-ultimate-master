import argparse
import contextlib
import io
import re
import sys
import tempfile
from decimal import Decimal
from pathlib import Path

ANSI = re.compile(r"\x1b\[[0-9;]*m")


def plain(stream):
    """Stream text without colour codes (argparse colours help on terminals since 3.14)."""
    return ANSI.sub("", stream.getvalue())


def raised(action):
    """What `action()` raised, SystemExit included: it is a BaseException, which capture_error does not catch."""
    try:
        action()
    except BaseException as error:
        return error
    return None


def call(action):
    """The exit code `action()` returned, or a description of what escaped from it."""
    try:
        return action()
    except BaseException as error:
        return f"raised {type(error).__name__}({getattr(error, 'code', error)})"


def parse(parser, argv):
    """parse_args with stderr captured; a parse error fails the test with argparse's own message."""
    err = io.StringIO()
    try:
        with contextlib.redirect_stderr(err):
            return parser.parse_args(argv)
    except SystemExit:
        raise AssertionError(f"parse_args({argv}) exited: {plain(err).strip()}") from None


def run(argv):
    out, err = io.StringIO(), io.StringIO()
    code = call(lambda: mod.main(argv, out, err))
    return code, plain(out), plain(err)


@test("build_parser reads the ledger, the subcommand and its options in any order")
def _():
    parser = mod.build_parser()
    assert isinstance(parser, argparse.ArgumentParser)
    args = parse(parser, ["--ledger", "/tmp/team.jsonl", "add", "--category", "meals", "12.5", "--note=client lunch"])
    amount = args.amount
    assert args.command == "add"
    assert isinstance(amount, Decimal)
    assert str(amount) == "12.50"
    assert args.category == "meals"
    assert args.note == "client lunch"
    assert str(args.ledger) == "/tmp/team.jsonl"
    bare = parse(parser, ["--ledger", "/tmp/team.jsonl", "add", "20", "--category=travel"])
    assert bare.note == ""
    listing = parse(parser, ["--ledger", "/tmp/team.jsonl", "list"])
    assert listing.command == "list"
    assert listing.category is None


@test("the parser exits with code 2 and prints its usage on stderr for unknown or missing arguments")
def _():
    parser = mod.build_parser()
    cases = [
        (["--ledger", "/tmp/team.jsonl", "refund", "5"], "invalid choice"),
        (["--ledger", "/tmp/team.jsonl"], "required"),
        (["add", "5", "--category", "meals"], "required"),
        (["--ledger", "/tmp/team.jsonl", "add", "5"], "required"),
        (["--ledger", "/tmp/team.jsonl", "add", "5", "--category", "food"], "invalid choice"),
    ]
    for argv, problem in cases:
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            error = raised(lambda: parser.parse_args(argv))
        kind = type(error).__name__
        code = getattr(error, "code", None)
        assert kind == "SystemExit", argv
        assert code == 2, argv
        message = plain(err)
        assert "usage:" in message, argv
        assert problem in message, argv


@test("money and note_text return clean values and raise ArgumentTypeError for bad input")
def _():
    amount = mod.money("12.5")
    assert isinstance(amount, Decimal)
    assert str(amount) == "12.50"
    assert str(mod.money("10000")) == "10000.00"
    rejected = ["abc", "", "0", "-3", "0.001", "nan", "Infinity", "12.345", "10000.01", "12.500000000000"]
    for text in rejected:
        kind = type(raised(lambda: mod.money(text))).__name__
        assert kind == "ArgumentTypeError", text
    note = "taxi; rm -rf ~ $(whoami)"
    assert mod.note_text(note) == note
    assert mod.note_text("x" * 80) == "x" * 80
    for text in ["paid\nINFO forged line", "\x1b[2Jcleared", "tab\there", "x" * 81]:
        kind = type(raised(lambda: mod.note_text(text))).__name__
        assert kind == "ArgumentTypeError", repr(text)


@test("main records and lists entries through the streams it receives and returns 0")
def _():
    printed = capture_output()
    with tempfile.TemporaryDirectory() as directory:
        ledger = str(Path(directory) / "team.jsonl")
        first = run(["--ledger", ledger, "add", "12.5", "--category", "meals", "--note", "client lunch"])
        second = run(["--ledger", ledger, "add", "--category=travel", "20"])
        listing = run(["--ledger", ledger, "list"])
        travel = run(["--ledger", ledger, "list", "--category", "travel"])
    assert first[0] == 0
    assert "12.50" in first[1]
    assert second[0] == 0
    code, out, err = listing
    assert code == 0
    assert out.splitlines() == ["12.50 meals client lunch", "20.00 travel", "total 32.50"]
    assert err == ""
    assert travel[1].splitlines() == ["20.00 travel", "total 20.00"]
    assert printed == []


@test("main reports bad input on err with exit code 2 or 1, without raising or writing the ledger")
def _():
    with tempfile.TemporaryDirectory() as directory:
        ledger = Path(directory) / "team.jsonl"
        amount = run(["--ledger", str(ledger), "add", "12.345", "--category", "meals"])
        note = run(["--ledger", str(ledger), "add", "5", "--category", "meals", "--note", "ok\x1b[2J"])
        unknown = run(["--ledger", str(ledger), "refund", "5"])
        missing = run(["--ledger", str(ledger), "list"])
        written = ledger.exists()
    for code, out, err in (amount, note, unknown):
        assert code == 2
        assert out == ""
        assert "usage:" in err
    assert "argument amount" in amount[2]
    assert "argument --note" in note[2]
    assert written is False
    assert missing[0] == 1
    assert "no ledger" in missing[2]


@test("main falls back to sys.argv and sys.stdout only when called without them, and --help returns 0")
def _():
    saved = sys.argv
    with tempfile.TemporaryDirectory() as directory:
        ledger = str(Path(directory) / "team.jsonl")
        sys.argv = ["expenses", "--ledger", ledger, "add", "7", "--category", "software"]
        try:
            printed = capture_output()
            code = call(lambda: mod.main(err=io.StringIO()))
            explicit = run(["--ledger", ledger, "list"])
        finally:
            sys.argv = saved
    shown = " ".join(printed)
    assert code == 0
    assert "7.00" in shown
    assert explicit[1].splitlines() == ["7.00 software", "total 7.00"]
    help_code, help_out, help_err = run(["--help"])
    assert help_code == 0
    assert "--ledger" in help_out
    assert "add" in help_out
    assert "list" in help_out
    assert help_err == ""
