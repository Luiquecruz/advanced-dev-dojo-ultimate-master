import dataclasses


def slot_names(cls):
    slots = cls.__dict__.get("__slots__", ())
    if isinstance(slots, str):
        return [slots]
    return sorted(slots)


@test("Point3D instances have no __dict__ and reject unknown attributes")
async def _():
    point = mod.Point3D(1, 2, 3)
    assert not hasattr(point, "__dict__")
    error = await capture_error(lambda: setattr(point, "w", 4))
    assert isinstance(error, AttributeError)
    flat = mod.Point3D(1, 2)
    assert flat.z == 0.0
    names = slot_names(mod.Point3D)
    assert names == ["x", "y", "z"]


# beginner mistake: the subclass declares no __slots__ of its own, so its instances get a __dict__ back
@test("the colored child stays slotted and declares only the slot it adds")
async def _():
    point = mod.ColorPoint3D(1, 2, 3, "red")
    assert point.color == "red"
    assert point.z == 3
    assert not hasattr(point, "__dict__")
    error = await capture_error(lambda: setattr(point, "label", "a"))
    assert isinstance(error, AttributeError)
    names = slot_names(mod.ColorPoint3D)
    assert names == ["color"]


@test("a subclass that declares no __slots__ gets a __dict__ back")
def _():
    class TaggedPoint(mod.Point3D):
        pass

    point = TaggedPoint(1, 2, 3)
    point.tag = "origin"
    assert hasattr(point, "__dict__")
    assert vars(point) == {"tag": "origin"}
    base = mod.Point3D(1, 2, 3)
    assert not hasattr(base, "__dict__")


@test("Pixel is a dataclass whose instances have no __dict__")
async def _():
    assert dataclasses.is_dataclass(mod.Pixel)
    pixel = mod.Pixel(3, 4)
    assert pixel.color == "black"
    assert pixel == mod.Pixel(3, 4, "black")
    assert not hasattr(pixel, "__dict__")
    error = await capture_error(lambda: setattr(pixel, "alpha", 0.5))
    assert isinstance(error, AttributeError)
