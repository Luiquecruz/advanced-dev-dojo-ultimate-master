1. Run `0.1 + 0.2`, `round(2.675, 2)` and `Decimal(2.675)` in the editor and explain each result before writing any function.
2. For the bill, decide the unit first: integer cents. Then the problem is distributing a remainder, which `divmod` gives you; check `split_bill(5, 3)` by hand.
3. Validate at the boundary: which argument types and values are refused, and with which exception, before any arithmetic happens.
4. For `round_money`, list the inputs (`str`, `int`, `Decimal`, `float`) and the path of each; the float is refused because its digits are gone before your function runs.
5. Put the length check before parsing in both text functions, and map every parsing failure (`InvalidOperation`, `ZeroDivisionError`) to `ValueError`.
6. Compare `Fraction("0.1")` with `Fraction(0.1)` to confirm `exact_ratio` builds from the text.
