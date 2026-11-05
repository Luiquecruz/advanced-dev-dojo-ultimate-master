from dataclasses import dataclass


class Point3D:
    """A point with a fixed set of attributes and no per-instance __dict__."""

    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float = 0.0) -> None:
        self.x = x
        self.y = y
        self.z = z

    def __repr__(self) -> str:
        return f"{type(self).__name__}({self.x!r}, {self.y!r}, {self.z!r})"


class ColorPoint3D(Point3D):
    """A slotted child: it declares only the slot it adds."""

    __slots__ = ("color",)

    def __init__(self, x: float, y: float, z: float, color: str) -> None:
        super().__init__(x, y, z)
        self.color = color


@dataclass(slots=True)
class Pixel:
    x: int
    y: int
    color: str = "black"
