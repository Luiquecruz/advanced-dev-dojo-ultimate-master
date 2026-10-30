Every metric is "pick events of one type, then reduce": earliest time, latest time, or a sum. Write two tiny helpers that return `null` for an empty list, `earliest(times)` and `latest(times)`, and reuse `timesOf`.
---
For LCP, find the first input time first (`Infinity` when there is none) and keep only candidates with `time < firstInput` before taking the latest. For TBT, filter `long-task` events with `time >= fcp && time < tti` and add `Math.max(0, task.duration - LONG_TASK_THRESHOLD)`.
---
In `compareModels`, `Object.entries(tracesByModel).map(([model, trace]) => ({ model, ...summarizeTrace(trace) }))` builds the rows. Sort with a comparator that puts `null` last: `(first === null) - (second === null) || first - second`. For `fastest`, filter out null values and `reduce`, replacing the best row only when a value is strictly lower, so the first row keeps a tie.
