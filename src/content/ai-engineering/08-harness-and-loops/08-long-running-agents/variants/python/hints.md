Keep paths in two helpers (`posixpath.join(directory, "tasks.json")` and `posixpath.join(directory, "progress.md")`). `initialize_project` starts with `if file_system.exists(tasks_path(directory)): return False`; that one line is what protects weeks of progress from a second run of the initializer. `next_task` is a single `next(..., None)` over a generator.
---
In `run_session`, read the tasks once at the start, take `task = next_task(tasks)` and loop `while task is not None and len(completed) < max_tasks`, picking `next_task(tasks)` again at the end of each iteration. Because a failed task stays `"pending"` until it is blocked, the same loop retries it, and `max_attempts` bounds those retries.
---
Build the user message as `f"Task {task['id']}: {task['title']}\n\nProgress so far:\n{tail}"`, where `tail` is the last 20 non-empty lines of `progress.md` read from disk right before the call (so the notes written earlier in this session are included too).
---
After each verdict, change only `"status"` and `"attempts"` of the task dict, append the progress line with `file_system.append_file`, and save with `file_system.write_file(temporary, json.dumps(tasks))` followed by `file_system.rename(temporary, tasks_path(directory))`. Do the save inside the loop, after every attempt, so a crash on the next model call loses nothing.
