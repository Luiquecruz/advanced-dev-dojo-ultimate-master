@test("cosine similarity measures direction only and returns 0 for a zero-length vector")
def _():
    assert mod.cosine_similarity([1, 0], [1, 0]) == approx(1, abs=1e-6)
    assert mod.cosine_similarity([1, 0], [0, 3]) == approx(0, abs=1e-6)
    assert mod.cosine_similarity([1, 2], [-2, -4]) == approx(-1, abs=1e-6)
    assert mod.cosine_similarity([1, 2], [3, 6]) == approx(1, abs=1e-6)
    assert mod.cosine_similarity([3, 4], [4, 3]) == approx(0.96, abs=1e-6)
    assert mod.cosine_similarity([0, 0], [1, 1]) == 0


# beginner mistake: ranking by a raw dot product, so a long vector outranks one in the query's exact direction
@test("exact search ranks by direction, not by vector length")
def _():
    items = [
        {"id": "long-but-off", "vector": [10, 10]},
        {"id": "short-and-exact", "vector": [1, 0]},
    ]
    ranked = mod.exact_search(items, [1, 0], k=2)
    best_for_longer_query = mod.exact_search(items, [2, 0], k=1)
    assert ranked == ["short-and-exact", "long-but-off"]
    assert best_for_longer_query == ["short-and-exact"]


@test("exact search returns the top k, breaks ties by id and returns every id when k is large")
def _():
    items = [
        {"id": "b", "vector": [1, 0]},
        {"id": "d", "vector": [-1, 0]},
        {"id": "a", "vector": [2, 0]},
        {"id": "c", "vector": [0, 1]},
    ]
    top_two = mod.exact_search(items, [1, 0], k=2)
    everything = mod.exact_search(items, [1, 0], k=10)
    assert top_two == ["a", "b"]
    assert everything == ["a", "b", "c", "d"]


@test("the IVF index stores each vector in the list of its most similar centroid, the lowest index on a tie")
def _():
    index = mod.IvfIndex([[1, 0], [0, 1], [-1, 0]])
    index.add("east", [5, 1])
    index.add("north", [0.2, 3])
    index.add("west", [-2, -0.5])
    index.add("north-east", [0.6, 0.8])
    index.add("also-east", [1, 0.2])
    sizes = index.list_sizes()
    assert sizes == [2, 2, 1]
    index.add("diagonal", [1, 1])
    sizes_after_tie = index.list_sizes()
    assert sizes_after_tie == [3, 2, 1]


@test("IVF search only probes the nprobe nearest lists and matches exact search when it probes them all")
def _():
    index = mod.IvfIndex([[1, 0], [0, 1]])
    index.add("x", [1, 0.1])
    index.add("y", [0.6, 0.8])
    index.add("z", [0, 1])
    one_list = index.search([0.8, 0.6], k=2, nprobe=1)
    both_lists = index.search([0.8, 0.6], k=2, nprobe=2)
    every_vector = index.search([0.8, 0.6], k=3, nprobe=2)
    assert one_list == ["x"]
    assert both_lists == ["y", "x"]
    assert every_vector == ["y", "x", "z"]
