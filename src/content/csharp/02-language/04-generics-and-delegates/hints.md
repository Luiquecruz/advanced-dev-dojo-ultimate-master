`Find` and `Filter` are both a `foreach` over `_items`. `Filter` calls the delegate like a method, `predicate(item)`, and adds the item to a new list when it returns `true`. `Add` needs an index loop so it can overwrite `_items[index]` when the ids match.
---
In `Remove`, remember whether the stock was at or above the threshold **before** subtracting, then compare after. Raise the event with `LowStock?.Invoke(this, new LowStockEventArgs(Stock));`: the `?.` skips the call when nobody subscribed, because the event field is then `null`.
---
A lambda captures the variable, not its value, and a `for` loop has a single `i` for all iterations, so every callback reads `i` after the loop ended. Declare `var index = i;` inside the loop body and capture `index`: each iteration gets its own variable.
