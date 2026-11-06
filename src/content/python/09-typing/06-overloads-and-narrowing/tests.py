from typing import TypeIs, get_args, get_overloads, get_type_hints


class Archived:
    def __init__(self, id):
        self.id = id


@test("parse declares two overloads whose mode literal selects the return type")
def _():
    overloads = get_overloads(mod.parse)
    assert len(overloads) == 2
    returns = {}
    for signature in overloads:
        hints = get_type_hints(signature)
        modes = get_args(hints["mode"])
        returns[modes] = hints["return"]
    assert returns == {("json",): dict[str, object], ("text",): str}


@test("parse returns a dict for json and stripped text for text, and rejects anything else")
async def _():
    decoded = mod.parse('{"id": 7, "tags": ["a"]}', "json")
    cleaned = mod.parse("  hello world \n", "text")
    assert decoded == {"id": 7, "tags": ["a"]}
    assert cleaned == "hello world"
    not_object = await capture_error(lambda: mod.parse("[1, 2]", "json"))
    unknown_mode = await capture_error(lambda: mod.parse("<a/>", "xml"))
    assert isinstance(not_object, ValueError)
    assert isinstance(unknown_mode, ValueError)


# beginner mistake: checking only the items, so the string "abc" counts as a list of strings
@test("is_str_list is a TypeIs guard that accepts only lists of strings")
def _():
    guard = get_type_hints(mod.is_str_list).get("return")
    assert guard == TypeIs[list[str]]
    samples = [[], ["a", "b"], ["a", 1], ("a", "b"), "abc", None, {"a": "b"}]
    results = [mod.is_str_list(sample) for sample in samples]
    assert results == [True, True, False, False, False, False, False]


@test("describe handles every variant of Event")
def _():
    variants = get_args(mod.Event.__value__)
    assert variants == (mod.Created, mod.Renamed, mod.Deleted)
    lines = [mod.describe(mod.Created(1)), mod.describe(mod.Renamed(1, "report")), mod.describe(mod.Deleted(1))]
    assert lines == ["created 1", "renamed 1 to report", "deleted 1"]


@test("describe fails loudly for a value outside Event")
async def _():
    error = await capture_error(lambda: mod.describe(Archived(3)))
    assert isinstance(error, AssertionError)
    assert "unreachable" in str(error)
