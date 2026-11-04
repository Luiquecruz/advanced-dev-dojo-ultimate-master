import ast
import math


def functions_with_class_patterns():
    tree = ast.parse(source)
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and any(isinstance(child, ast.MatchClass) for child in ast.walk(node)):
            found.add(node.name)
    return found


def two_positional(click):
    match click:
        case mod.Click(first, second):
            return (first, second)
    return None


def three_positional(click):
    match click:
        case mod.Click(first, second, third):
            return (first, second, third)
    return None


@test("area computes circles, rectangles and squares, including instances of subclasses")
def _():
    class Tile(mod.Square):
        pass

    circle = mod.area(mod.Circle(2))
    rectangle = mod.area(mod.Rectangle(2, 3))
    square = mod.area(mod.Square(3))
    tile = mod.area(Tile(4))
    assert circle == approx(math.pi * 4)
    assert rectangle == 6
    assert square == 9
    assert tile == 16


@test("area and describe raise TypeError naming the type they cannot handle")
async def _():
    class Triangle:
        base = 3
        height = 4
        side = 5

    class Swipe:
        x = 1
        y = 2

    shape_error = await capture_error(lambda: mod.area(Triangle()))
    text_error = await capture_error(lambda: mod.area("square"))
    event_error = await capture_error(lambda: mod.describe(Swipe()))
    assert isinstance(shape_error, TypeError)
    assert "Triangle" in str(shape_error)
    assert isinstance(text_error, TypeError)
    assert "str" in str(text_error)
    assert isinstance(event_error, TypeError)
    assert "Swipe" in str(event_error)


@test("Click matches x and y by position, and only those two")
async def _():
    click = mod.Click(3, 4, button="right")
    bound = two_positional(click)
    assert bound == (3, 4)
    error = await capture_error(lambda: three_positional(click))
    assert isinstance(error, TypeError)


@test("describe formats each button and key presses with their modifiers")
def _():
    left = mod.describe(mod.Click(10, 20))
    right = mod.describe(mod.Click(1, 2, button="right"))
    middle = mod.describe(mod.Click(0, 0, "middle"))
    plain_key = mod.describe(mod.KeyPress("q"))
    shortcut = mod.describe(mod.KeyPress("s", ("ctrl", "shift")))
    assert left == "click at 10,20"
    assert right == "right click at 1,2"
    assert middle == "middle click at 0,0"
    assert plain_key == "q"
    assert shortcut == "ctrl+shift+s"


@test("area and describe both dispatch with class patterns")
def _():
    dispatchers = functions_with_class_patterns()
    required = {"area", "describe"}
    missing = sorted(required - dispatchers)
    assert missing == []
