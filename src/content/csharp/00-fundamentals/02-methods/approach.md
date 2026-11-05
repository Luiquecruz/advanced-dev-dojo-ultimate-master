1. Press **Run** to see the starter's results, then read each method's name, parameters and return type: they tell you what goes in and what must come out.
2. `IsLeapYear`: start from the common rule, `year % 4 == 0`, and check it against 1900. That year is divisible by 4 but is not a leap year, so add the exception: the year must also be either not divisible by 100, or divisible by 400. Group that "either ... or" with parentheses and join it to the first rule with `&&`.
3. `CircleArea`: multiply `Math.PI` by the radius twice. `2 * Math.PI * radius` would be the circumference, not the area.
4. `Area(width, height)`: multiply the two sides. `Area(side)`: call the first overload with the same value twice, so the formula lives in one place.
5. `WithTax`: fix the default value of `rate` in the declaration, then return the net amount times `1 + rate`, rounded with `Math.Round(..., 2)`. Run the tests: the named-argument call must give `53.00`.
