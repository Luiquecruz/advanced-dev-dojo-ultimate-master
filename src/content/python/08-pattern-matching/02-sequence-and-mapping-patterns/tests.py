import ast


def functions_with_match():
    tree = ast.parse(source)
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and any(isinstance(child, ast.Match) for child in ast.walk(node)):
            found.add(node.name)
    return found


def raised(function, value):
    try:
        function(value)
    except Exception as error:
        return type(error).__name__
    return "nothing raised"


@test("parse_command builds an action dict for move, say and quit, from lists or tuples")
def _():
    move = mod.parse_command("move 3 -4".split())
    say = mod.parse_command(["say", "hello", "there"])
    silent = mod.parse_command(["say"])
    quit_list = mod.parse_command(["quit"])
    quit_tuple = mod.parse_command(("quit",))
    move_tuple = mod.parse_command(("move", "0", "7"))
    assert move == {"action": "move", "x": 3, "y": -4}
    assert say == {"action": "say", "text": "hello there"}
    assert silent == {"action": "say", "text": ""}
    assert quit_list == {"action": "quit"}
    assert quit_tuple == {"action": "quit"}
    assert move_tuple == {"action": "move", "x": 0, "y": 7}


@test("parse_command raises ValueError for unknown words, wrong token counts and non-sequences")
def _():
    bad_inputs = [
        ["quit", "now"],
        ["move", "1"],
        ["move", "1", "2", "3"],
        ["jump", "1"],
        [],
        "quit",
        {"action": "quit"},
    ]
    outcomes = {repr(tokens): raised(mod.parse_command, tokens) for tokens in bad_inputs}
    not_value_errors = {tokens: outcome for tokens, outcome in outcomes.items() if outcome != "ValueError"}
    assert not_value_errors == {}


@test("handle_event decodes click, key and resize events and ignores extra keys")
def _():
    click = mod.handle_event({"type": "click", "pos": (10, 20)})
    click_from_json = mod.handle_event({"type": "click", "pos": [5, 6], "button": "left", "time": 1.5})
    key = mod.handle_event({"type": "key", "key": "Enter", "repeat": False})
    resize = mod.handle_event({"type": "resize", "size": {"width": 800, "height": 600, "dpr": 2}})
    assert click == ("click", 10, 20)
    assert click_from_json == ("click", 5, 6)
    assert key == ("key", "Enter")
    assert resize == ("resize", 800, 600)


@test("handle_event raises ValueError for missing keys, wrong shapes and unknown types")
def _():
    bad_events = [
        {"type": "click"},
        {"pos": (1, 2)},
        {"type": "click", "pos": (1, 2, 3)},
        {"type": "resize", "size": {"width": 800}},
        {"type": "resize", "size": (800, 600)},
        {"type": "scroll", "delta": 3},
        ["click", (1, 2)],
    ]
    outcomes = {repr(event): raised(mod.handle_event, event) for event in bad_events}
    not_value_errors = {event: outcome for event, outcome in outcomes.items() if outcome != "ValueError"}
    assert not_value_errors == {}


@test("parse_command and handle_event both decide with a match statement")
def _():
    deciders = functions_with_match()
    required = {"parse_command", "handle_event"}
    missing = sorted(required - deciders)
    assert missing == []
