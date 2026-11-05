Every method here is one expression, so `=> expression;` is enough. "Divisible by 4" is `year % 4 == 0`: the remainder of the division is zero. For the square, call `Area(side, side)` from inside the other overload.
---
Build `IsLeapYear` from two conditions joined with `&&`: the year is divisible by 4, **and** it is either not a century year (`year % 100 != 0`) or it is divisible by 400. Put the "either ... or" part in parentheses so `||` is evaluated before `&&` combines it.
---
For `WithTax`, change the default in the parameter list itself (`decimal rate = 0.21m`) and return `Math.Round(net * (1 + rate), 2)`. Keep the parameter names `net` and `rate`: the test calls `WithTax(rate: 0.06m, net: 50m)`, which only compiles with those names.
