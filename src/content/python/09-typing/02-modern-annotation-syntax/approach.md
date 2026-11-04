1. Read each contract as the dict `get_type_hints` must return, key by key, including `"return"`.
2. Modernise `count_words` first: replace each legacy alias with its builtin or `|` spelling and remove the `typing` import that is no longer needed.
3. For every parameter with a default, decide whether `None` is a valid value; if it is, it belongs in the annotation.
4. For variadic parameters, annotate the type of one element, then check what `get_type_hints` reports for it.
5. Add the class body annotations to `Node` and use `Self` where the contract says "the same class as self".
6. Print `get_type_hints` for each function in the demo and compare it with the contract; then call each function to confirm the behavior did not change.
