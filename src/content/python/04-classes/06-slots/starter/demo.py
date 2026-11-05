from main import ColorPoint3D, Pixel, Point3D

point = Point3D(1.0, 2.0)
print("point:", point, "has __dict__:", hasattr(point, "__dict__"))

try:
    point.w = 4.0
except AttributeError as error:
    print("typo caught:", error)

colored = ColorPoint3D(0.0, 1.0, 2.0, "teal")
print("child:", colored, colored.color, "has __dict__:", hasattr(colored, "__dict__"))

pixel = Pixel(10, 20)
print("pixel:", pixel, "slots:", Pixel.__slots__)
