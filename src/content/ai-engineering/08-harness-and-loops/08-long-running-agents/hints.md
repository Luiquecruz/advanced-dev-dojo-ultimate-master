Keep paths in two helpers (`join(directory, 'tasks.json')` and `join(directory, 'progress.md')`). `initializeProject` starts with `if (existsSync(tasksPath)) return false;`; that one line is what protects weeks of progress from a second run of the initializer. `nextTask` is a single `find`.
---
In `runSession`, read the tasks once at the start and loop with `for (let task = nextTask(tasks); task !== undefined && completed.length < maxTasks; task = nextTask(tasks))`. Because a failed task stays `pending` until it is blocked, the same loop retries it, and `maxAttempts` bounds those retries.
---
Build the user message as `` `Task ${task.id}: ${task.title}\n\nProgress so far:\n${tail}` ``, where `tail` is the last 20 non-empty lines of `progress.md` read from disk right before the call (so the notes written earlier in this session are included too).
---
After each verdict, mutate only `status` and `attempts` of the task object, append the progress line with `appendFileSync`, and save with `writeFileSync(tmp, JSON.stringify(tasks))` followed by `renameSync(tmp, tasksPath)`. Do the save inside the loop, after every attempt, so a crash on the next model call loses nothing.
