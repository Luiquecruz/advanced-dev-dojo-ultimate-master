import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Circle:
    radius: float


@dataclass(frozen=True)
class Rectangle:
    width: float
    height: float


@dataclass(frozen=True)
class Square:
    side: float


def area(shape: object) -> float:
    """Area of a Circle, Rectangle or Square."""
    match shape:
        case Circle(radius):
            return math.pi * radius**2
        case Rectangle(width, height):
            return width * height
        case Square(side):
            return side**2
        case _:
            raise TypeError(f"unsupported shape: {type(shape).__name__}")


class Click:
    """A mouse click. A plain class, so it declares its positional sub-patterns itself."""

    __match_args__ = ("x", "y")

    def __init__(self, x: int, y: int, button: str = "left") -> None:
        self.x = x
        self.y = y
        self.button = button


@dataclass(frozen=True)
class KeyPress:
    key: str
    modifiers: tuple[str, ...] = ()


def describe(event: object) -> str:
    """Human-readable text for a Click or a KeyPress."""
    match event:
        case Click(x, y, button="left"):
            return f"click at {x},{y}"
        case Click(x, y, button=button):
            return f"{button} click at {x},{y}"
        case KeyPress(key, modifiers):
            return "+".join([*modifiers, key])
        case _:
            raise TypeError(f"unsupported event: {type(event).__name__}")
