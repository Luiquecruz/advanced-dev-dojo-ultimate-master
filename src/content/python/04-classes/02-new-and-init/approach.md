1. Write down what `Currency("EUR")` does today: a fresh object every time, `__init__` sets everything. Identify which hook must decide the object.
2. Move the decision to `__new__`: normalize the code, look it up in a class-level dict, and create and register a new instance only on a miss.
3. Trace a second call: `__new__` returns the cached object, then `__init__` runs on it. Make sure nothing in `__init__` overwrites state; the per-object setup belongs to the branch in `__new__` that creates the instance.
4. For `Percent`, notice that `float.__new__` runs before `__init__` and already fails on `"12.5%"`. Move parsing and validation into `__new__` and pass the clean number to `float.__new__`.
5. Check the edges: 0 and 100 are valid, -0.5 and 101 are not, and `Percent(5) + 1` is a plain `float`.
