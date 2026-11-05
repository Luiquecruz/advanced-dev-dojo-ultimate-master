**Question this module answers:** how do you write, run and test your first Python programs when you have never programmed before?

**Skip rule:** if you already program, open lesson 09 (Classes and Objects). If you can solve its challenge without help, start at module 01, after skimming lessons 05 to 08 for what the challenge does not test: `lambda`, recursion, comprehensions, sets and `try/else/finally`. The module is optional: skipping it still lets you reach 100% of the track.

## What a program is

A program is a list of instructions, written as text, that the computer follows from top to bottom. Python reads that text, called **source code**, and runs it one statement at a time. Files of Python source code end in `.py`.

```py
price = 4      # store the number 4 under the name price
quantity = 3
print(price * quantity)   # shows 12
```

Text after `#` is a **comment**: Python ignores it, people read it.

## The editor, Run and tests

Every practice lesson has a challenge with two files:

- `main.py` holds the functions you write. The **tests** import it and check each function. A test passes when the function gives back the right value.
- `demo.py` is a short script that uses your functions. The **Run** button executes it and shows what it prints, so you can watch your code work before you run the tests.

In the starter code, a comment inside each function says what is left to write.

## `return` versus `print`

`print(value)` shows a value on the screen and gives nothing back. `return value` ends a function and hands the value to whoever called it. Tests check returned values, so a function that prints its answer instead of returning it fails, even when the screen looks right.

## Reading an error

When something goes wrong, Python stops and prints a **traceback**. Read its **last line first**: it names the kind of error and says what happened.

```text
Traceback (most recent call last):
  File "main.py", line 2, in <module>
    total = "3" + 4
            ~~~~^~~
TypeError: can only concatenate str (not "int") to str
```

The lines above it point to the file and line number where the problem started, and the `^` marks the operation that failed.

## The path

| Lesson | You learn |
| --- | --- |
| 02 | Values, arithmetic, comparisons and formatted text |
| 03 | Decisions with `if` and repetition with loops |
| 04 | Writing functions: parameters, defaults, `return` |
| 05 | Functions as values, `lambda`, recursion and imports |
| 06 | Text and lists |
| 07 | Tuples, dicts and sets |
| 08 | Errors and exceptions |
| 09 | Classes and objects |

## When to choose it

Take this module when Python is your first programming language, or when the skip rule's challenge feels hard. It ends with lesson 09: a bank account built from classes, the base for module 01.
