Finish the methods of `Calendar`, `Geometry` and `Prices` in `Program.cs`. Every method returns its result; none of them prints. The method names, parameter names and types must stay exactly as they are, because the tests call them by name, including one call with named arguments.

You only need the operators of lesson 00/01 here: each method fits in one expression, so you can use `=>` bodies or `return` inside braces, as you prefer.

## `Calendar.IsLeapYear(int year)`

Return `true` when `year` is a leap year in the Gregorian calendar. A year is a leap year when it is divisible by 4, **except** century years (divisible by 100), which are leap years only when they are also divisible by 400. So 2024 and 2000 are leap years; 2023, 1900 and 2100 are not. Write it as one `bool` expression with `%`, `==`, `!=`, `&&` and `||`.

## `Geometry.CircleArea(double radius)`

The area of a circle: π times the radius squared. Use `Math.PI`. A radius of `2` gives about `12.566`.

## `Geometry.Area(double width, double height)` and `Geometry.Area(double side)`

Two overloads: the area of a rectangle and the area of a square. `Area(3, 4)` is `12` and `Area(5)` is `25`. Make the square overload call the rectangle overload instead of repeating the formula.

## `Prices.WithTax(decimal net, decimal rate = ...)`

The net amount plus tax, rounded to 2 decimal places. `rate` is optional and its default is the standard rate of 21% (`0.21m`); the starter's default is wrong. `WithTax(100m)` is `121.00`, and `WithTax(rate: 0.06m, net: 50m)` is `53.00`.
