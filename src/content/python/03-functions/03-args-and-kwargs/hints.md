Inside the function, `args` is a tuple and `kwargs` is a dict. Passing them as `function(args, kwargs)` hands the callee two values; you need the unpacking form at the call site.
---
`attempts` sits after `*args` in the signature, so Python never puts it into `kwargs`. Loop `range(attempts)`, `return` inside `try` on success, and remember the caught exception in a variable.
---
After the loop, `raise last_error` re-raises the remembered exception. For `compose`, start from `value` and reassign `value = function(value)` for each function; with an empty tuple the loop does nothing.
