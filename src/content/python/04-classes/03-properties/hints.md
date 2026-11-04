Store the value in one private attribute such as `self._celsius`. Every scale is then a `@property` that reads `_celsius`, and only the Celsius setter writes it.
---
Validation must run on every write path. In `__init__`, assign the public name (`self.celsius = celsius`) so the setter runs; in the `fahrenheit` setter, convert and assign `self.celsius = ...` instead of touching `_celsius`.
---
`@celsius.setter` and `@celsius.deleter` decorate methods that are also named `celsius`. Give `kelvin` only a getter: a property without a setter raises `AttributeError` on assignment by itself.
