Build the harness of a long-running agent whose sessions share no memory: a task list and a progress file persisted in the file system, sessions that resume where the last one stopped, verify each task before marking it done, block tasks that keep failing, and never redo completed work.

The project lives in a `directory` of the in-memory file system with two files:

- `tasks.json`: an array of tasks `{ id, title, status, attempts }`, where `status` is `'pending'`, `'done'` or `'blocked'`;
- `progress.md`: an append-only log, one line per event.

The starter exports `SESSION_SYSTEM`, the system prompt of every session.

## 1. `initializeProject(directory, tasks)`

`tasks` is a list of `{ id, title }`. When `directory/tasks.json` already exists, change nothing and return `false`. Otherwise create the directory if needed, write `tasks.json` with every task `pending` and `attempts: 0` (same order, same ids and titles), write `progress.md` starting with the line `# Progress`, and return `true`.

## 2. `readTasks(directory)` and `nextTask(tasks)`

`readTasks` returns the parsed `tasks.json`. `nextTask` returns the first task whose status is `'pending'`, or `undefined`.

## 3. `runSession(directory, options)`

`options` is `{ model, verify, sessionId, maxTasks, maxAttempts }`. `verify(task, output)` returns (or resolves to) `{ passed, feedback }`. A session keeps nothing in memory from earlier sessions: it reads everything from the files.

Repeat until `maxTasks` tasks were completed in this session or no task is pending:

1. Pick `nextTask` from the tasks read from disk.
2. Call `model.generate` once with `{ role: 'system', content: SESSION_SYSTEM }` and a `user` message that **starts with** `Task <id>: <title>` and also contains the last 20 lines of `progress.md`.
3. Call `verify(task, text)`.
   - Passed: set the task's status to `'done'` and append `- [done] <id> (session <sessionId>)`.
   - Failed: add one to `attempts` and append `- [retry] <id>: <feedback>`. When `attempts` reaches `maxAttempts`, set the status to `'blocked'` and also append `- [blocked] <id>`.
4. Save `tasks.json` after every attempt, **atomically**: write the whole list to `tasks.json.tmp`, then rename it to `tasks.json`. Change only `status` and `attempts`; never add, remove, reorder or rename tasks.

Return `{ completed, blocked, remaining }`: the ids completed and blocked in this session, in order, and the number of tasks still `pending`. A model error ends the session with that error; everything saved before it stays saved, so the next session resumes at the same task.

The tests run several sessions over the same directory, script crashes and failing verifications, and check the files and the requests the model received, never the wording of model output.
