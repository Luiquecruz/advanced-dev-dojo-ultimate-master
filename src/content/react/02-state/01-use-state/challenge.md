The `Counter` below stores its value in a local variable, so the screen never changes. Rewrite it with `useState`.

1. Display the count in a `<p>` with the text `Count: N` (starting at `Count: 0`).
2. A button `+1` increments the count.
3. A button `-1` decrements it. The count can never go below `0`: **disable** the `-1` button when the count is `0`.
4. A button `Reset` sets the count back to `0`.
5. Each `<Counter />` keeps its own count: two counters on the page are independent.
