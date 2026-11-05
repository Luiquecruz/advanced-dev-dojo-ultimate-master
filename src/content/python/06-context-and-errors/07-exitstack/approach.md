1. Write the three failure points of a multi-resource job: an opener fails halfway, the block fails, a close fails. For each, list which resources must be closed and in what order.
2. Notice that a hand-written list plus a loop answers the first two only if you also reverse it, and never answers the third. Let `ExitStack` own the list.
3. For `open_all`, decide where the `yield` goes relative to the stack's `with` block so that the caller's code runs while every resource is open.
4. For `ResourcePool`, separate the two outcomes of the constructor: failure (close what was opened, re-raise) and success (keep everything open). Find the one call that turns the first behavior into the second at the very end.
5. Make `close()` safe to call twice, and make the pool a context manager whose exit calls it.
6. Trace the failing-close case through the stack: which `__exit__` methods still run, and which error reaches the caller.
