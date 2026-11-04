1. For each helper, write which chaining attribute an operator should find on the final exception: an explicit cause, a hidden context, or neither plus notes.
2. In `load_config`, separate the two failure modes (not JSON at all, JSON of the wrong shape) and decide which one has an original exception worth keeping.
3. Translate the decode error inside its `except` block, taking the line number from the original, and link the two explicitly.
4. Wrap `reraise_hidden` like any decorator, catch only the error it is meant to translate, and choose the `raise` form that keeps the original out of the printed traceback.
5. For `annotate`, keep the exception object and its message as they are, add the context beside them in a deterministic order, and return the object.
6. Print `traceback.format_exception(error)` for each case and read the chain the way an operator would.
