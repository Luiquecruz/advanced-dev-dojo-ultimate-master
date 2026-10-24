Type a task board with `Record`.

1. `STATUS_LABELS` must be typed `Record<Status, string>` with the labels `"To do"`, `"In progress"` and
   `"Done"`. Missing a status must be a compile error.
2. `countByStatus(tasks: readonly Task[]): Record<Status, number>` — counts tasks per status. Every status
   is present, with `0` when there are no tasks.
3. `groupByStatus(tasks: readonly Task[]): Partial<Record<Status, Task[]>>` — groups tasks by status; only
   statuses that have tasks appear as keys.
4. `indexBy<T>(items: readonly T[], getKey: (item: T) => string): Record<string, T>` — builds a dictionary;
   later items with the same key replace earlier ones.
