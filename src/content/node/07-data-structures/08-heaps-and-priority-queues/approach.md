1. Notice what the starter does: a full `sort` on every push and a `splice(0, 1)` on every pop. Both are `O(n)` or worse per operation, which is why 100 000 jobs take seconds.
2. Relax the requirement: you never need the whole order, only the first item. The heap rule (each parent before its children) is enough to keep the first item at index 0.
3. Push: the new item may break the rule only with its parent, so bubble it up level by level. The tree has `log n` levels.
4. Pop: removing the root leaves a hole. Fill it with the last item (cheap to remove from an array) and push it down, always swapping with the child that comes first so the rule holds for both subtrees.
5. Keep the direction in the comparator, not in the heap code: the same class becomes a min-heap by `runAt` or a max-heap by priority.
6. `takeDue` uses `peek` to decide without removing; it stops at the first job that is not due because every later job is due even later.
7. For `topK`, keep a min-heap of size `k`: its root is the weakest of the current top items, so evicting it whenever the heap overflows keeps exactly the best `k` while streaming.
