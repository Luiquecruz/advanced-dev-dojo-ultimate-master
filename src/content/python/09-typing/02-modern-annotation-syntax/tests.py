import ast
from collections.abc import Callable
from typing import Self, get_type_hints

LEGACY_ALIASES = {"List", "Dict", "Set", "Tuple", "Optional", "Union", "Callable"}


def legacy_uses(text):
    tree = ast.parse(text)
    module_names = {"typing"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            module_names |= {alias.asname or alias.name for alias in node.names if alias.name == "typing"}
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "typing":
            found += [alias.name for alias in node.names if alias.name in LEGACY_ALIASES]
        elif isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id in module_names:
            if node.attr in LEGACY_ALIASES:
                found.append(f"{node.value.id}.{node.attr}")
    return sorted(found)


@test("count_words and find_user annotate their containers and results as contracted")
def _():
    count_hints = get_type_hints(mod.count_words)
    find_hints = get_type_hints(mod.find_user)
    items = count_hints.get("items")
    count_return = count_hints.get("return")
    assert items == list[str]
    assert count_return == dict[str, int]
    assert find_hints == {"users": dict[int, str], "user_id": int, "return": str | None}


@test("a parameter that defaults to None includes None in its annotation")
def _():
    limit = get_type_hints(mod.count_words).get("limit")
    assert limit == int | None
    counts = mod.count_words(["a", "b", "a", "c"], limit=2)
    assert counts == {"a": 2, "b": 1}


@test("apply_all annotates its transform as a callable from int to int")
def _():
    hints = get_type_hints(mod.apply_all)
    assert hints == {"values": list[int], "transform": Callable[[int], int], "return": list[int]}
    doubled = mod.apply_all([1, 2], lambda value: value * 2)
    assert doubled == [2, 4]


@test("merge annotates each extra positional argument and the keyword-only flag")
def _():
    hints = get_type_hints(mod.merge)
    assert hints == {"base": dict[str, int], "overrides": dict[str, int], "strict": bool, "return": dict[str, int]}
    merged = mod.merge({"a": 1}, {"a": 2}, {"b": 3})
    assert merged == {"a": 2, "b": 3}


@test("Node annotates its attributes in the class body and add with Self")
def _():
    class_hints = get_type_hints(mod.Node)
    add_hints = get_type_hints(mod.Node.add)
    assert class_hints == {"name": str, "children": list[Self]}
    assert add_hints == {"child": Self, "return": Self}
    root = mod.Node("root")
    returned = root.add(mod.Node("leaf"))
    assert returned is root


@test("the module uses builtin generics and | instead of the legacy typing aliases")
def _():
    found = legacy_uses(source)
    assert found == []
