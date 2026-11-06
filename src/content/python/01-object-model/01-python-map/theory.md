This track teaches **Python as a language, not as a tool for one job**: how its objects, protocols and runtime behave, which mistake each feature invites, and when to choose it.

## Where to start

Module 00, **Foundations: Python from Zero**, is for people who have never programmed. Its eight practice lessons teach values, loops, functions, text, collections, errors and classes; every later module assumes them.

The skip rule is a single test: open the challenge of module 00, lesson 09 (Classes and Objects). If you can solve it without the hints, start at module 01; skim module 00's lessons 05 to 08 for what the challenge does not test: `lambda`, recursion, comprehensions, sets and `try/else/finally`. Module 00 is optional: skipping it still lets you reach 100% of the track. Its lessons count toward your progress once you complete one of its lessons 02 to 08.

## How the track works

The track has 14 modules and 119 lessons. Every module opens with a **map** lesson (the question the module answers) followed by practice lessons. A practice lesson combines theory, a coding challenge validated by tests, progressive hints and a short quiz, and its **Common mistakes** section names the error newcomers make most often. Twelve modules close with an **ADR checkpoint**, where you record a design decision for a product briefing and compute the numbers that justify it, and module 12 ends with a capstone challenge.

## Three ideas the rest of the track builds on

1. **Names are labels on objects.** Assignment never copies. Module 01 builds this model first because aliasing, scope, copying and equality all follow from it.
2. **Everything is an object, and behavior lives in protocols.** `len(x)`, `for item in x`, `with x:` and `a + b` call special methods (`__len__`, `__iter__`, `__enter__`, `__add__`). Learning the protocols explains most of the built-in syntax.
3. **Runtime and tooling are separate.** Type hints are metadata the interpreter does not enforce, packaging is a standard of its own, and the interpreter ships with a large standard library.

```py
len(items)   # calls type(items).__len__(items)
```

## What runs in your browser

Challenges run on **Pyodide**, CPython compiled to WebAssembly, in a Web Worker. The first Python lesson you open downloads about 12 MB; after that it is cached. The browser sandbox has no threads, no network sockets and no real virtual environments, so topics that need them (multiprocessing, `pip`, `venv`) are taught in theory and quizzes.

## Maturity tags and dated facts

Lessons are tagged `established`, `emerging` or `hype-watch`. Facts that change over time (versions, PEP status) live in a block that starts with **Status as of** and a month.

> **Status as of November 2026:** the track targets CPython 3.14, the version Pyodide ships here.

## When to choose it

Start at module 01 when the skip test is easy for you, and at module 00 when Python is your first programming language. Keep module 01 either way: every later module builds on its model of names and objects.
