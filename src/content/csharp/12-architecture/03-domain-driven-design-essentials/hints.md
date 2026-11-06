Put each check in the `init` accessor of its property, with the C# 14 `field` keyword: `init { ArgumentOutOfRangeException.ThrowIfNegative(value); field = value; }`. A `with` expression copies the record and then runs the `init` accessors of the members it sets, so the same check covers the constructor and `with`.
---
In `AddLine`, run every check before you touch `_lines` or `Total`: the status, the quantity (`ArgumentOutOfRangeException.ThrowIfNegativeOrZero`), the line count against `MaxLines`, and the currency. Compute `Total.Add(unitPrice.Times(quantity))` into a local first; `Add` throws for another currency, and then nothing has changed yet.
---
`Lines => _lines` hands out the list itself, typed as an interface; a cast gets `Add` back. Return `_lines.AsReadOnly()`. In `DequeueEvents`, copy before you clear (`IDomainEvent[] events = [.. _events];`): returning `_events` and then clearing it empties the list the caller just received.
