from main import Circle, Click, KeyPress, Rectangle, Square, area, describe

for shape in [Circle(1.5), Rectangle(4, 2.5), Square(3), "hexagon"]:
    try:
        print(f"{shape!r:40} area = {area(shape):.2f}")
    except TypeError as error:
        print(f"{shape!r:40} rejected: {error}")

print("Click.__match_args__:", getattr(Click, "__match_args__", "not declared"), "| KeyPress.__match_args__:", KeyPress.__match_args__)
for event in [Click(120, 48), Click(5, 9, button="right"), KeyPress("s", ("ctrl",)), KeyPress("Escape"), 42]:
    try:
        print("event:", describe(event))
    except TypeError as error:
        print("event rejected:", error)
