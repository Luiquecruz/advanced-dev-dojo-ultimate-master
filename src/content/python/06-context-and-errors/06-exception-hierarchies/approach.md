1. Draw the hierarchy from the table, including the built-in families, and check which `except` clauses each class must satisfy.
2. Decide where `status` lives so a subclass added next year inherits the right value without touching `exit_status`.
3. Write `exit_status` with one membership test for "is this a domain error" and one attribute lookup that follows inheritance.
4. For `parse_age`, list the inputs that must fail and the two reasons (not a whole number, out of range). Translate the built-in `ValueError` into the domain error, and keep the input out of the message.
5. For `respond`, write the three outcomes (result, domain error, bug) and make sure only the first two produce a tuple.
6. Check the result against the JS habit: would your `respond` turn a `KeyError` from a typo into a response?
