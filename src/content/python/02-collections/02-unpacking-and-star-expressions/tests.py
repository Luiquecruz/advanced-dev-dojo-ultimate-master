@test("split_ends returns the first item, a list of the middle and the last item")
def _():
    first, middle, last = mod.split_ends([1, 2, 3, 4, 5])
    assert first == 1
    assert middle == [2, 3, 4]
    assert last == 5


@test("split_ends returns a list for the middle even for tuples, and an empty list for two items")
def _():
    first, middle, last = mod.split_ends((1, 2, 3))
    assert type(middle) is list
    assert mod.split_ends("ab") == ("a", [], "b")


@test("split_ends works for generators and rejects fewer than two items")
async def _():
    first, middle, last = mod.split_ends(item * 2 for item in range(4))
    assert (first, middle, last) == (0, [2, 4], 6)
    error = await capture_error(lambda: mod.split_ends([1]))
    assert isinstance(error, ValueError)


@test("merge_layers lets later layers and overrides win")
def _():
    merged = mod.merge_layers({"a": 1, "b": 1}, {"b": 2, "c": 2}, c=3)
    assert merged == {"a": 1, "b": 2, "c": 3}


@test("merge_layers leaves the input layers untouched and returns a new dict")
def _():
    first = {"a": 1}
    second = {"b": 2}
    merged = mod.merge_layers(first, second, c=3)
    assert first == {"a": 1}
    assert second == {"b": 2}
    assert merged is not first
    assert mod.merge_layers() == {}


@test("swap_pairs reverses every pair and rejects items that are not pairs")
async def _():
    swapped = mod.swap_pairs([(1, "a"), (2, "b")])
    assert swapped == [("a", 1), ("b", 2)]
    from_lists = mod.swap_pairs(iter([[3, "c"]]))
    assert from_lists == [("c", 3)]
    error = await capture_error(lambda: mod.swap_pairs([(1, 2, 3)]))
    assert isinstance(error, ValueError)
