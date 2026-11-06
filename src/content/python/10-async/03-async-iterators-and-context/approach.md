1. Trace the starter's `paginate` with a consumer that records each item: every fetch happens before the first item, because the starter collects every page into a list first.
2. Move the `yield` so the generator hands over each item as soon as its page arrives, and check where execution resumes when the consumer asks for the next item.
3. Decide what ends the stream: the first `None`, and no request after it.
4. For `collect`, separate stopping (`break`) from closing (`aclose`). Explain why the generator's `finally` has not run after a plain `break`, then add the context manager that closes it.
5. Count how many items `collect` pulls for a limit of 3, and make it exactly three.
6. For the connection, list what must happen on the way out in both cases, success and error, and what `__aexit__` must return so the error keeps propagating.
