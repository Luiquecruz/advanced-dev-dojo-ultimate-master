1. Spot why the naive recursive `filter` is slow: each node scans every row to find its children, so the work is `O(n²)`, and it recurses once per level.
2. Separate "create nodes" from "link nodes". After one pass, a `Map` from id to node lets you find any parent in `O(1)`, regardless of the order of the rows.
3. In the linking pass, decide the root rule once: `parentId === null` or an unknown parent both go to `roots`, so deleted parents never make replies vanish.
4. Use recursion where depth is bounded and the code reads naturally: `countReplies` sums `1 + countReplies(reply)` over the replies.
5. For `flattenThread`, replace the call stack with an array of `{ node, depth }`. Popping gives depth-first order; pushing children in reverse keeps the first reply first, which reproduces the recursive pre-order.
6. Check the deep-chain case mentally: the Map build and the explicit stack never nest calls, so a 100 000-level thread only costs heap memory.
