Every piece of data in a program is a **value**, and every value has a **type** that decides what you can do with it. An **expression** combines values with operators and produces a new value. A **variable** is a name you give to a value with `=`:

```py
price_cents = 1250        # an int: a whole number
quantity = 3
total = price_cents * quantity
print(total)              # 3750
```

`=` means "make this name refer to this value", not "is equal to". The right side is computed first, then the name on the left is attached to the result.

## How it works

**The basic types.** Five types cover most first programs:

| Type | Example values | Used for |
| --- | --- | --- |
| `int` | `3`, `-12`, `1_000_000` | whole numbers, any size |
| `float` | `2.5`, `0.1`, `-3.0` | numbers with a fraction |
| `str` | `"mug"`, `'12'`, `""` | text, written in quotes |
| `bool` | `True`, `False` | answers to yes-or-no questions |
| `NoneType` | `None` | "no value" |

`"12"` and `12` are different values: the first is text that happens to contain digits. `type(value)` tells you which type a value has, and `isinstance(value, int)` asks whether it has a given type:

```py
type("12")              # <class 'str'>
type(12).__name__       # 'int'
isinstance(2.5, float)  # True
```

**Arithmetic.** `+ - *` work as usual. Division comes in two kinds: `/` always gives a `float`, and `//` gives the whole part (floor division). `%` gives the remainder, and `**` raises to a power:

```py
7 / 2     # 3.5
7 // 2    # 3
7 % 2     # 1
2 ** 10   # 1024
```

Multiplication and division happen before addition and subtraction; use parentheses to change the order: `(2 + 3) * 4` is `20`. Floats are stored in binary, so `0.1 + 0.2` gives `0.30000000000000004`. That is why prices in this module are kept as whole **cents** in an `int`.

**Updating a variable.** `count += 1` is short for `count = count + 1`. `-=`, `*=` and `//=` work the same way.

**Comparisons and logic.** `==` (equal), `!=`, `<`, `<=`, `>`, `>=` produce a `bool`. Comparisons can be chained: `0 <= age < 18` means `0 <= age and age < 18`. `and`, `or` and `not` combine booleans:

```py
is_adult = age >= 18
can_rent = is_adult and has_licence
```

**Conversions.** `int("42")` turns text into a number, `str(42)` turns a number into text, `float("2.5")` and `int(3.9)` (which cuts to `3`) also exist. `int("4.5")` raises a `ValueError`: the text must be a whole number.

**f-strings.** Text that starts with `f` before the quote can hold expressions in braces. A format after `:` controls how the value looks, and `!r` shows a value the way you would type it in code:

```py
cents = 1250
f"{cents / 100:.2f} EUR"   # '12.50 EUR': two decimals
f"{cents / 100} EUR"       # '12.5 EUR'
name = "mug"
f"{name!r}"                # "'mug'", with quotes
```

**Functions in the challenge.** The challenge gives you small **functions**: named pieces of code that receive values (parameters) and hand back a result with `return`. Lesson 04 explains them; for now, fill in the expression after `return`. `print_receipt` is the exception: it calls `print` twice and has no `return`, so it gives back `None`:

```py
def line_total(price_cents, quantity):
    return price_cents * quantity
```

Two results can be returned at once, separated by a comma: `return share, remainder` gives back a pair, and `share, remainder = split_evenly(1000, 3)` takes it apart again.

## Common mistakes

**Using `/` when you need a whole number.** `/` always produces a `float`, even when the division is exact, so `1000 / 3` gives `333.3333333333333` and `900 / 3` gives `300.0`, not `300`. To split an amount into whole cents, use `//` for the share and `%` for what is left over:

```py
share = total_cents / people    # wrong: 333.33..., a float
share = total_cents // people   # right: 333
remainder = total_cents % people  # 1 cent left over
```

**Adding text and a number.** `"Total: " + 12` raises `TypeError: can only concatenate str (not "int") to str`. Put the number in an f-string instead: `f"Total: {12}"`.

## When to choose it

- Keep money in **whole cents** (`int`) and convert to a decimal only when you display it.
- Use `//` and `%` together whenever something is split into whole parts: cents among people, minutes into hours.
- Use an f-string to build any text that mixes words and values; `:.2f` fixes the number of decimals.
- Use `type()` or `isinstance()` when you need to know what kind of value you were given.
