`collect()` wraps a subscription in a Promise: `new Promise((resolve, reject) => source.subscribe({ next, error, complete }))`, pushing each value into a local array.
---
Everything in `countdown()` must happen **inside** the function passed to `new Observable(...)`. That function runs on each subscribe, which is what makes it lazy.
---
Emit `start` right away with `subscriber.next(start)`, then start `setInterval`. Inside it, decrement, call `next`, and call `subscriber.complete()` when you reach `0`.
---
Finish the producer with `return () => clearInterval(id);` so `unsubscribe()` and `complete()` both stop the timer.
