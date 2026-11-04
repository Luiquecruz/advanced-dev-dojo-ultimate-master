1. Run the starter demo: every payload is accepted, and the error report of the one rejected payload contains the raw input. That is the behavior to remove.
2. Add the three `Field` constraints and check their error types with a deliberately bad payload; constraints come first because they are declarative and appear in the schema.
3. Write the email field validator: normalize, then decide valid or `ValueError` with a message that does not repeat the value.
4. Add the after model validator for the passwords and confirm it stays silent when a field already failed: model rules only see valid objects.
5. Add the before model validator for `e_mail`. Test it with a payload you reuse afterwards, with both keys present, and with a list: it must copy, never overwrite, and let non-dicts through.
6. Build `signup_errors` from `errors()` with the input, URL and context left out, then `json.dumps` the result and search it for the password you sent.
