This track teaches **Python as a language, not as a tool for one job**. It is written for developers who already know TypeScript or JavaScript, so every lesson names the habit that breaks when you switch and the Python mechanism behind it.

## How the track works

Every module opens with a **map** lesson (the question the module answers) followed by practice lessons. Six modules close with an **ADR checkpoint** where you record a design decision for a product briefing and compute the numbers that justify it, and the track ends with a capstone challenge. A practice lesson combines theory, a coding challenge validated by tests, progressive hints and a short quiz. The quizzes ask you to predict behavior, not to recall trivia.

```py
# challenges are plain Python files; tests check behavior
def greet(name):
    return f"hello {name}"
```

## Python is not JavaScript with indentation

Three ideas explain most of the differences you will meet:

1. **Names are labels on objects.** Assignment never copies. Module 1 builds this model first because aliasing, scope, copying and equality all follow from it.
2. **Everything is an object, and behavior lives in protocols.** `len(x)`, `for item in x`, `with x:` and `a + b` call special methods (`__len__`, `__iter__`, `__enter__`, `__add__`). Learning the protocols replaces learning dozens of keywords.
3. **Runtime and tooling are separate.** Type hints are metadata, packaging is a standard, and the interpreter ships with a large standard library, so many npm packages have a built-in counterpart.

```ts
// JavaScript: a method on the object
items.length;
```

```py
# Python: a function that calls a protocol on the object
len(items)
```

## What runs in your browser

Challenges run on **Pyodide**, CPython compiled to WebAssembly, in a Web Worker. The first Python lesson you open downloads about 12 MB; after that it is cached. The browser sandbox has no threads, no network sockets and no real virtual environments, so topics that need them (multiprocessing, `pip`, `venv`) are taught in theory and quizzes, and challenges that touch them use small simulations.

## Maturity tags and dated facts

Lessons are tagged `established`, `emerging` or `hype-watch`. Facts that change over time (versions, PEP status, new interpreter features) live in a single block that starts with **Status as of** and a month, so you know how old a claim is.

> **Status as of November 2026:** the track targets CPython 3.14, the version Pyodide ships here. Check python.org for the current release before relying on a version-specific feature.

## When to choose it

Use this track when you can already program and want the Python model rather than a beginner course. Skip ahead to a module when you know the basics, but keep the first module: it is the foundation of the rest.
