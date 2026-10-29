The queue never needs to move items: remember the index of the front item (`head`) and advance it on each `dequeue`. `size` becomes `items.length - head`.
---
In `dequeue`, return `undefined` when `head === items.length`; otherwise read `items[head]`, clear that slot (so the job can be garbage collected) and increment `head`. Optionally compact with `items = items.slice(head); head = 0` once `head` passes half of the array.
---
`runSteps` uses an array as a stack: `push` each step after its `up` succeeds. Wrap the loop in `try/catch`; in the `catch`, `pop` steps until the stack is empty and `await step.down()` for each, then `throw error`.
---
Give each `down` its own `try/catch` inside the rollback loop and `console.error` the failure, so one broken compensation does not stop the others. Rethrow the error from the outer `catch`, not the rollback error.
