`buildTree` needs two loops over the rows, not recursion: the first creates every node (`{ ...comment, replies: [] }`) and stores it in a `Map` by id; the second attaches each node to its parent.
---
In the second loop, look the parent up with `comment.parentId === null ? undefined : nodes.get(comment.parentId)`. If a parent exists, push the node into `parent.replies`; otherwise push it into `roots`. Iterating the input array keeps sibling order, and replies listed before their parent work because every node already exists.
---
`countReplies` is one line of recursion: for each reply, add `1` (the reply) plus `countReplies(reply)` (its own descendants). A leaf returns `0`.
---
`flattenThread`: start with `const stack = roots.map((node) => ({ node, depth: 0 })).reverse()`. While the stack is not empty, `pop` an item, push `{ id, depth }` to the result, then push the node's replies **from last to first** with `depth + 1`, so the first reply is popped next.
