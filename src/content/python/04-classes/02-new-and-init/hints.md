`__init__` cannot return a different object. The only hook that decides which object a call produces is `__new__(cls, code)`. Look the normalized code up in a dict stored on the class.
---
Python calls `__init__` again on the object `__new__` returned when it is an instance of the class. Set `code`, `rates` and `init_calls = 0` once, in `__new__`, when you create the instance, and let `__init__` only add one to `init_calls`.
---
For `Percent`, convert and check inside `__new__`: strip a trailing `%` from strings with `removesuffix("%")`, call `float(...)`, raise `ValueError` outside 0–100, and finish with `return super().__new__(cls, number)`.
