Assigning to a name inside an inner function makes it a new local variable. That is why `count += 1` raises `UnboundLocalError` until you declare `nonlocal count`.
---
For `make_history` you can keep a list in the enclosing scope and call `append` on it: mutating an object does not rebind the name, so no `nonlocal` is needed there. Trim the extra items from the front when the list grows past `limit`.
---
`reset` is a second inner function that also needs `nonlocal` for the same variable. Return both functions as a tuple.
