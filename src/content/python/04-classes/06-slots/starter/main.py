from dataclasses import dataclass


class Point3D:
    """A point with a fixed set of attributes and no per-instance __dict__."""

    # TODO: declare __slots__ for x, y and z. Keep the default for z in __init__, not as a class attribute.

    def __init__(self, x: float, y: float, z: float = 0.0) -> None:
        self.x = x
        self.y = y
        self.z = z

    def __repr__(self) -> str:
        return f"{type(self).__name__}({self.x!r}, {self.y!r}, {self.z!r})"


class ColorPoint3D(Point3D):
    """A slotted child: it declares only the slot it adds."""

    # TODO: without its own __slots__ this child gets a __dict__ back. Declare only the new slot.

    def __init__(self, x: float, y: float, z: float, color: str) -> None:
        super().__init__(x, y, z)
        self.color = color


# TODO: make Pixel a slotted dataclass.
@dataclass
class Pixel:
    x: int
    y: int
    color: str = "black"
