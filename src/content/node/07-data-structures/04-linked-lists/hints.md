Draw the four pointers involved before writing code: `node.prev`, `node.next`, and the neighbors that point back at `node`. Every operation is a few pointer assignments plus `size++` or `size--`.
---
`remove(node)`: if the node has a `prev`, set `prev.next = node.next`, otherwise the node was the head, so `head = node.next`. Mirror it for `next` and `tail`. Then clear `node.prev`, `node.next` and decrement `size`.
---
Once `remove` works, the rest is reuse: `shift()` is `head ? remove(head) : undefined`, `pop()` the same with `tail`, and `moveToBack(node)` is `remove(node)` followed by appending the same node object at the tail (extract the append logic of `push` into a private method).
---
`expireIdle` is a `while` loop on the head: `while (list.head && now - list.head.value.lastSeen > maxIdleMs) expired.push(list.shift()!)`. Because the list is ordered by activity, the first active connection means every later one is active too.
