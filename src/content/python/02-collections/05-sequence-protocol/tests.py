import ast


@test("a Deck has a length and supports positive and negative indexes")
def _():
    deck = mod.Deck(["a", "b", "c", "d"])
    assert len(deck) == 4
    assert deck[0] == "a"
    assert deck[-1] == "d"


# beginner mistake: forwarding a slice to the inner list and returning its result, so deck[1:3] is a plain list
@test("slicing a Deck returns a new Deck with the selected cards")
def _():
    deck = mod.Deck(["a", "b", "c", "d"])
    top = deck[1:3]
    assert isinstance(top, mod.Deck)
    assert list(top) == ["b", "c"]
    assert list(deck[::2]) == ["a", "c"]


@test("iteration, membership and reversed work through the protocol")
def _():
    deck = mod.Deck(["a", "b", "c"])
    assert list(deck) == ["a", "b", "c"]
    assert "b" in deck
    assert "z" not in deck
    assert list(reversed(deck)) == ["c", "b", "a"]


@test("out-of-range integers raise IndexError and other index types raise TypeError")
async def _():
    deck = mod.Deck(["a"])
    index_error = await capture_error(lambda: deck[5])
    type_error = await capture_error(lambda: deck["a"])
    assert isinstance(index_error, IndexError)
    assert isinstance(type_error, TypeError)


@test("the Deck owns its cards and the source does not define __iter__")
def _():
    cards = ["a", "b"]
    deck = mod.Deck(cards)
    cards.append("c")
    assert len(deck) == 2
    methods = [node.name for node in ast.walk(ast.parse(source)) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    assert "__iter__" not in methods
    assert "__iter__" not in vars(mod.Deck)
