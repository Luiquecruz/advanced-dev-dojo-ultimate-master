@test("the cell id floors latitude and longitude divided by the cell size, also for negative coordinates")
def _():
    index = mod.GridIndex(cell_size_degrees=0.5)
    positive = index.cell_of(10.2, 20.7)
    near_origin = index.cell_of(0.1, 0.1)
    just_below_origin = index.cell_of(-0.1, -0.1)
    mixed = index.cell_of(-10.6, 30.25)
    assert positive == "20:41"
    assert near_origin == "0:0"
    assert just_below_origin == "-1:-1"
    assert mixed == "-22:60"


@test("nearby reads the cell alone for 0 rings and the 3 x 3 block for 1 ring, sorted")
def _():
    index = mod.GridIndex(cell_size_degrees=1)
    index.upsert("center", 10.5, 20.5)
    index.upsert("north", 11.5, 20.5)
    index.upsert("diagonal", 9.5, 19.5)
    index.upsert("far", 12.5, 20.5)
    index.upsert("also-center", 10.9, 20.1)
    cell_alone = index.nearby(10.5, 20.5, rings=0)
    one_ring = index.nearby(10.5, 20.5, rings=1)
    two_rings = index.nearby(10.5, 20.5, rings=2)
    assert cell_alone == ["also-center", "center"]
    assert one_ring == ["also-center", "center", "diagonal", "north"]
    assert two_rings == ["also-center", "center", "diagonal", "far", "north"]


# beginner mistake: adding a driver to the new cell without removing them from the old one
@test("a driver who moves is found only in the new cell and the old cell loses its supply")
def _():
    index = mod.GridIndex(cell_size_degrees=1)
    index.upsert("driver-a", 10.5, 20.5)
    index.upsert("driver-b", 10.5, 20.5)
    index.upsert("driver-a", 40.5, 50.5)
    old_cell = index.nearby(10.5, 20.5, rings=0)
    new_cell = index.nearby(40.5, 50.5, rings=0)
    old_supply = index.count_in("10:20")
    new_supply = index.count_in("40:50")
    assert old_cell == ["driver-b"]
    assert new_cell == ["driver-a"]
    assert old_supply == 1
    assert new_supply == 1
    index.upsert("driver-a", 40.6, 50.6)
    same_cell_again = index.nearby(40.5, 50.5, rings=1)
    assert same_cell_again == ["driver-a"]


@test("remove takes a driver out of the index and returns false for an unknown driver")
def _():
    index = mod.GridIndex(cell_size_degrees=1)
    index.upsert("driver-a", 10.5, 20.5)
    first = index.remove("driver-a")
    second = index.remove("driver-a")
    unknown = index.remove("ghost")
    assert first is True
    assert second is False
    assert unknown is False
    left_behind = index.nearby(10.5, 20.5, rings=1)
    supply = index.count_in("10:20")
    assert left_behind == []
    assert supply == 0
