# beginner mistake: writing counts[word] += 1 for a word that is not in the dict yet, which raises KeyError
@test("word_counts counts every word from its first appearance, ignoring case")
def _():
    counts = mod.word_counts("Tea tea cake TEA")
    assert counts == {"tea": 3, "cake": 1}
    single = mod.word_counts("jam")
    assert single == {"jam": 1}
    blank = mod.word_counts("   ")
    assert blank == {}


@test("top_words ranks by count from high to low, then by word, and stops at n")
def _():
    counts = {"tea": 3, "cake": 5, "jam": 3, "bread": 1}
    top = mod.top_words(counts, 3)
    assert top == [("cake", 5), ("jam", 3), ("tea", 3)]
    first = mod.top_words(counts, 1)
    assert first == [("cake", 5)]


@test("top_words leaves the counts unchanged and returns every pair when n is large")
def _():
    counts = {"b": 1, "a": 1}
    everything = mod.top_words(counts, 10)
    assert everything == [("a", 1), ("b", 1)]
    assert counts == {"b": 1, "a": 1}
    assert list(counts) == ["b", "a"]


@test("unique_tags strips and lower-cases the tags, drops blank ones and duplicates, and sorts them")
def _():
    tags = [" Python", "python ", "", "Web", "  ", "api"]
    unique = mod.unique_tags(tags)
    assert unique == ["api", "python", "web"]
    assert type(unique) is list
    assert tags == [" Python", "python ", "", "Web", "  ", "api"]


@test("invert maps each number back to its name in a new dict")
def _():
    phonebook = {"Ada": "555-0101", "Grace": "555-0102"}
    by_number = mod.invert(phonebook)
    assert by_number == {"555-0101": "Ada", "555-0102": "Grace"}
    assert phonebook == {"Ada": "555-0101", "Grace": "555-0102"}
    empty = mod.invert({})
    assert empty == {}
