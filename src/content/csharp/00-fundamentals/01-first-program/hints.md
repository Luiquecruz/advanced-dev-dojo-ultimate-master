Each method only needs one expression after `return`. Use the operators of the lesson: `*` for `LineTotal`, `/` and `%` for the boxes, and an interpolated string (`$"..."`) for `Describe`.
---
For `WithTax`, the total is the net amount times `1 + rate` (100 × 1.21 = 121), and `Math.Round(value, 2)` rounds it. For the boxes, `items / perBox` drops the fraction because both are `int`, which is exactly what "full boxes" means, and `items % perBox` is what is left.
---
`AverageRating` fails with `totalStars / votes` because two `int` values divide as whole numbers before the result becomes a `double`. Convert one side first: `(double)totalStars / votes`.
