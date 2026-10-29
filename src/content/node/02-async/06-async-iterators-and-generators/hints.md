An async generator can `await` and `yield` in the same body. Keep a `let cursor: string | null = null`, fetch a page, yield its items, move the cursor, and repeat while the cursor is not `null`. A `do...while` loop fits because the first request always happens.
---
`yield* page.items` yields every element of the array one by one. Laziness comes for free: the generator pauses at each `yield` and only continues (and fetches the next page) when the consumer asks for more.
---
`take`: push each item from `for await (const item of source)` into an array and `break` when `result.length >= count`; return early with `[]` when `count <= 0`. `chunk`: collect into `group`, `yield group` and start a new array when it reaches `size`, then after the loop `if (group.length > 0) yield group`.
