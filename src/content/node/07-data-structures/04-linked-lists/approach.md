1. Start from `push`, which is given: it shows the pattern of linking a node and fixing `head` when the list was empty.
2. Write `unshift` as the mirror of `push`: the new node's `next` is the old head, and the old head's `prev` becomes the new node, or `tail` is set when the list was empty.
3. Write `remove` by handling each side independently: the previous side updates either `prev.next` or `head`; the next side updates either `next.prev` or `tail`. This single function covers middle, head, tail and only-node cases.
4. Clear the removed node's pointers so a stale handle cannot reach the list, and keep `size` in sync.
5. Build `shift`, `pop` and `moveToBack` on top of `remove` and an `append(node)` helper; reusing the same node object in `moveToBack` keeps handles held elsewhere valid.
6. For `expireIdle`, rely on the ordering invariant: only look at the head, shift while it is expired, stop at the first active connection. The cost is proportional to the number of expired connections, not the list length.
