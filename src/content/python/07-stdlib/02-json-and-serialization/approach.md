1. List every type that crosses the boundary (`datetime`, `Decimal`, the two dataclasses) and decide its JSON form before writing code: ISO text, a decimal string, an object.
2. Write `default` as a chain of `isinstance` checks that each return a plain value, and keep the base class call as the last line so unknown types still fail loudly.
3. Encode an `Invoice` and decode the text with plain `json.loads`: the nested lines should be dicts and the amounts strings.
4. For `dumps_stable`, pass the encoder and every option that removes variation (key order, whitespace) plus the one that refuses invalid floats. Compare two dicts built in different orders.
5. For `loads_with_decimals`, ask where precision is lost: converting after `loads` is too late, so the hook has to see the number text. Try `12345678901234567.89` both ways.
6. Feed `NaN` to both functions and confirm each raises `ValueError`.
