@test("initials joins the upper-cased first letter of each word, each followed by a dot")
def _():
    two = mod.initials("ada lovelace")
    assert two == "A.L."
    spaced = mod.initials("  grace  brewster hopper ")
    assert spaced == "G.B.H."
    blank = mod.initials("   ")
    assert blank == ""


@test("last_items returns the last n items as a new list")
def _():
    items = ["tea", "cake", "jam", "bread"]
    last_two = mod.last_items(items, 2)
    assert last_two == ["jam", "bread"]
    everything = mod.last_items(items, 10)
    assert everything == ["tea", "cake", "jam", "bread"]
    assert everything is not items
    assert items == ["tea", "cake", "jam", "bread"]


@test("last_items returns an empty list when n is 0")
def _():
    none = mod.last_items(["tea", "cake", "jam"], 0)
    assert none == []
    from_empty = mod.last_items([], 3)
    assert from_empty == []


@test("clean_words lower-cases the words, strips punctuation from their ends and drops empty ones")
def _():
    words = mod.clean_words("Hello, world! ... Hello?")
    assert words == ["hello", "world", "hello"]
    inner = mod.clean_words("Don't stop: e.g. now")
    assert inner == ["don't", "stop", "e.g", "now"]
    blank = mod.clean_words("")
    assert blank == []


# beginner mistake: calling scores.sort() inside highest, which reorders the caller's list
@test("highest returns the top scores, highest first, and leaves the caller's list in its order")
def _():
    scores = [70, 95, 88, 60]
    top = mod.highest(scores, 2)
    assert top == [95, 88]
    assert scores == [70, 95, 88, 60]
    all_of_them = mod.highest(scores, 9)
    assert all_of_them == [95, 88, 70, 60]
