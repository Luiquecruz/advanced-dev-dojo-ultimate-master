1. Annotate the labels with `Record<Status, string>` and add the missing `done` entry.
2. Initialize a complete counts record with zeros and increment per task.
3. Use `Partial<Record<Status, Task[]>>` for groups and create each array lazily.
4. Fill a `Record<string, T>` in `indexBy`, letting later items overwrite earlier ones.
