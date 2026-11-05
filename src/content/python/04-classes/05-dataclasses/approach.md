1. Read the required behaviors and map each one to a decorator option or a `field()` argument before touching method bodies.
2. Make the class frozen and ordered, and confirm the field order already produces the required sort.
3. Replace the `None` default for `tags` with a default factory and exclude the field from comparison; check that two products with different tags are equal and hash alike.
4. Write `__post_init__`: strip, validate, and store the normalized name in a way a frozen instance allows.
5. Implement `with_price` so the new object goes through construction again, then check that the original kept its price and that a negative price is rejected.
