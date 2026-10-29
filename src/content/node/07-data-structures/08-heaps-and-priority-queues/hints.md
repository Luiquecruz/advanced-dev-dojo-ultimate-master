Store the heap in `this.items`. The item that comes first is always `items[0]`; for index `i`, the parent is `(i - 1) >> 1` and the children are `2 * i + 1` and `2 * i + 2`.
---
`push`: append, then loop while `index > 0`: compare the item with its parent; if `compare(item, parent) >= 0` stop, otherwise swap them and continue from the parent index.
---
`pop`: return `undefined` when empty. Save `items[0]`, remove the last item with `items.pop()`, and if anything is left put that last item at index 0 and sift it down: pick whichever of the node and its (up to two) children comes first; if it is the node, stop, otherwise swap and continue from that child.
---
`takeDue` is `while (queue.size > 0 && queue.peek()!.runAt <= now) due.push(queue.pop()!)`. `topK` uses a min-heap by score (`(a, b) => score(a) - score(b)`): push each item and pop whenever `size > k`, then pop everything (lowest first) and reverse.
