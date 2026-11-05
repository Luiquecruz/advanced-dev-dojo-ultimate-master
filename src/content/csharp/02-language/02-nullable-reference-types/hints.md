`_customers[id]` throws `KeyNotFoundException` when the key is missing. `TryGetValue` (module 00) answers "is it there?" and hands you the value in one call, so `Find` can return `null` instead.
---
Chain the null operators: `a?.B` is `null` when `a` is `null`, and `x ?? y` gives `y` when `x` is `null`. `DisplayName` is one line with `customer?.Nickname ?? customer?.Name ?? "guest"`.
---
`EmailLength` needs two `?.` steps, one for the customer and one for the email, and a final `?? 0`: `Find(id)?.Email?.Length ?? 0`. In the constructor, call `ArgumentNullException.ThrowIfNull` once per required parameter before assigning anything.
