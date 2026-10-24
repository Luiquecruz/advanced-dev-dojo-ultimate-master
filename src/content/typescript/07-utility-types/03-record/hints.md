Change the annotation to `Record<Status, string>`: the compiler then reports that `done` is missing.
---
For counts, start from `{ todo: 0, 'in-progress': 0, done: 0 }` and increment `counts[task.status]` in a loop.
---
For groups, `Partial<Record<Status, Task[]>>` lets keys be missing. `(groups[task.status] ??= []).push(task)` creates the array on first use. `indexBy` assigns `index[getKey(item)] = item`.
