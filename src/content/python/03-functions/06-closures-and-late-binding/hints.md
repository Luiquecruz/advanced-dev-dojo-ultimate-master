The lambdas are not wrong; the variable they read is. All of them share the one loop variable and look it up when they are called, after the loop has ended.
---
Give each callable its own scope: a small factory `def make_greeter(name): return lambda: ...` called once per name, or a default argument `lambda value, factor=factor: ...` that is evaluated when the lambda is created.
---
For `once`, keep two variables in the outer function, `called = False` and `result = None`, and declare both `nonlocal` in the wrapper. Set `called = True` only after the call returned, so an exception leaves the wrapper ready to try again.
