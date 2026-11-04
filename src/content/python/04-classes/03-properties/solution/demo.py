from main import Temperature

oven = Temperature(180)
print(f"oven: {oven.celsius:.1f} C = {oven.fahrenheit:.1f} F = {oven.kelvin:.2f} K")

oven.fahrenheit = 400
print(f"set to 400 F: {oven.celsius:.1f} C")

try:
    oven.fahrenheit = -600
except ValueError as error:
    print("rejected:", error)

try:
    oven.kelvin = 0
except AttributeError:
    print("kelvin is read-only")

del oven.celsius
print("after reset:", oven)
