A program becomes useful when it can **decide** what to do and **repeat** work. Python uses `if` for decisions and `for` or `while` for repetition. The lines that belong to an `if` or a loop are **indented** by four spaces; the indentation is how Python knows where the block ends:

```py
total_cents = 4500
if total_cents >= 5000:
    print("free gift")
else:
    print("no gift yet")     # this line runs
print("done")                # not indented: runs either way
```

## How it works

**`if`, `elif` and `else`.** Python checks the conditions from top to bottom and runs the block of the **first** one that is true, then skips the rest. `elif` ("else if") adds another condition, and `else` catches everything left:

```py
if age < 13:
    ticket = "child"
elif age < 65:
    ticket = "adult"     # only reached when age >= 13
else:
    ticket = "senior"
```

For a choice between two values, a **conditional expression** fits on one line: `label = "even" if n % 2 == 0 else "odd"`.

**Lists, briefly.** A list holds several values in order: `prices = [250, 1000, 75]`. `len(prices)` is `3`, `prices[0]` is the first item, `[]` is an empty list and `prices.append(40)` adds an item at the end. Lesson 06 covers lists fully.

**`for` loops.** `for` takes each item of a sequence in turn: the items of a list, the characters of a string, or the numbers of a `range`:

```py
for price in [250, 1000, 75]:
    print(price)

for letter in "mug":
    print(letter)          # m, u, g

for number in range(1, 4):
    print(number)          # 1, 2, 3: the end is not included
```

`range(5)` gives `0, 1, 2, 3, 4`; `range(1, 6)` gives `1` to `5`.

**Accumulating.** Many loops build a result step by step. Start with an empty value before the loop and update it inside:

```py
total = 0
for price in prices:
    total += price

big = []
for price in prices:
    if price > 100:
        big.append(price)
```

**`enumerate` and `zip`.** `enumerate(items)` gives each item together with its position, counting from 0. `zip(a, b)` walks two lists side by side and stops at the end of the shorter one:

```py
for index, name in enumerate(["ana", "bo"]):
    print(index, name)       # 0 ana, then 1 bo

for name, score in zip(["ana", "bo"], [7, 9]):
    print(name, score)       # ana 7, then bo 9
```

**`while` loops** repeat as long as a condition stays true, so something inside must change it, or the loop never ends:

```py
stock = 3
while stock > 0:
    stock -= 1
```

**`break` and `continue`.** `break` leaves the loop at once; `continue` skips to the next item. `return` inside a loop leaves the whole function, which is a common way to stop when the answer is found.

**`in`** asks whether a value is inside a list or a string: `"u" in "mug"` and `3 in [1, 2, 3]` are both `True`.

## Common mistakes

**Putting the widest condition first.** Python stops at the first true condition, so a broad test placed first hides every narrower one below it. Here a total of 1000 is already below 10000, and the cheapest tier is never reached:

```py
if total < 10000:      # wrong: catches 1000 too
    cost = 195
elif total < 2000:     # never reached
    cost = 595

if total < 2000:       # right: narrowest first
    cost = 595
elif total < 5000:
    cost = 395
elif total < 10000:
    cost = 195
```

**Stopping one number short.** `range(1, n)` ends at `n - 1`. To include `n`, write `range(1, n + 1)`.

## When to choose it

- Use `if`/`elif`/`else` for choices between several cases; order the conditions from the narrowest to the widest, and check the boundaries (`<` or `<=`) with a value exactly on them.
- Use `for` when you know what to walk over: a list, a string or a `range`. Add `enumerate` when you need positions and `zip` when two lists go together.
- Use `while` only when the number of steps is not known in advance, and make sure the condition can become false.
