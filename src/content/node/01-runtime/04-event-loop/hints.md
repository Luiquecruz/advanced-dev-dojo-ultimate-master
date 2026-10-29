Start every snippet the same way: write down the synchronous `console.log` calls first, in source order. Nothing scheduled can run before the main script ends.
---
After the main script (and after every callback), Node empties the **nextTick** queue, then the **microtask** queue (`.then`, code after `await`, `queueMicrotask`). Only then does the loop reach the timers phase. A callback added to a queue goes to the end of that queue.
---
For `nested`: the nextTick queue drains first (`tick 1`, which queues a promise behind the two existing ones), then the whole microtask queue (`promise 1` queues a tick), and Node switches back to the nextTick queue at the end. For `ioCallback`: the callback runs in the poll phase, its tick runs right after it, then the check phase (`setImmediate`) comes before the next timers phase.
