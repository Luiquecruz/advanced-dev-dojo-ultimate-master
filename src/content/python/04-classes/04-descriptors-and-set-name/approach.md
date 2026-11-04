1. Separate configuration from data: the descriptor keeps its name and limits, each instance keeps its value. Decide where the value lives before writing any method.
2. Fix `Positive`: handle class access (`instance is None`) first, then read and write `instance.__dict__` under the descriptor's name.
3. Check precedence for `LazyAttribute`: with only `__get__`, an entry in the instance dict wins. Use that to cache, and confirm assignment needs no extra code.
4. Give `Field` a `__set_name__` and put the name in every error message; validate before storing so a rejected write changes nothing.
5. For `Model.fields()`, read the class namespaces from the most basic class to the most derived, keeping definition order and skipping names seen before.
6. Try two unrelated models side by side and a subclass, and check that nothing is accumulated on `Model` itself.
