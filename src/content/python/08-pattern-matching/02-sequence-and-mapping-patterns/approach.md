1. Write down every accepted shape as data first (a three-token list starting with `"move"`, a dict with `type` and a two-item `pos`) and every rejected one. Those two lists become the cases and the tests you run by hand.
2. Make the whole argument the subject of the `match`, so each `case` describes one complete shape instead of one field.
3. For the commands, use one sequence pattern per action, with the action word as a literal and capture names for the values; convert with `int()` inside the block.
4. For the events, use mapping patterns with the `type` literal plus the keys each event needs, and nest a sequence pattern for `pos` and a mapping pattern for `size`.
5. End both statements with a wildcard case that raises `ValueError`, then try the bad inputs: an extra token, a missing token, a string, a dict, a missing key and a three-item position.
