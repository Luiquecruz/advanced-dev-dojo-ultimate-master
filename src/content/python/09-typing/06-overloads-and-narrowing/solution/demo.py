from typing import get_overloads, get_type_hints

from main import Created, Deleted, Renamed, describe, is_str_list, parse

for signature in get_overloads(parse):
    hints = get_type_hints(signature)
    print("overload:", hints["mode"], "->", hints["return"])

print(parse('{"id": 7}', "json"), "|", repr(parse("  spaced out  ", "text")))
for bad in (("[1, 2]", "json"), ("<a/>", "xml")):
    try:
        parse(*bad)
    except ValueError as error:
        print("rejected:", error)

for sample in (["a", "b"], "abc", ("a",), []):
    print(f"is_str_list({sample!r}) = {is_str_list(sample)}")

for event in (Created(1), Renamed(1, "report"), Deleted(1)):
    print(describe(event))


class Archived:
    pass


try:
    describe(Archived())
except AssertionError as error:
    print("assert_never:", type(error).__name__)
